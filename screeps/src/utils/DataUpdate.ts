import { storePos, restorePos } from "utils/posHelpers";
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";
import { CONSTRUCTIONSTORAGE } from "../Types/Constants";
import { HARVESTER, TRANSPORTER, STARTER } from "Types/CreepType";
import * as C from "Types/Constants"; 
import { Starter } from "../Drones/starter";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

export function DataUpdate(): void {
    profiler.registerFN(filterCreeps)();
    try {
        levelTimings();//only needed for benchmarking
    }
    catch (e) {
        console.log("Failed levelTimings update with: ", e);
    }
    try {
        profiler.registerFN(initNewRooms)();
    }
    catch (e) {
        console.log("Failed initNewRooms update with: ", e);
    }
    try {
        profiler.registerFN(expand)();
    }
    catch (e) {
        console.log("Failed expand update with: ", e);
    }
    try {
        //if (Game.time % 3 == 0) {//by having a better tracking of resources we only need to update rarly for thing we didnt foorsee
            //profiler.registerFN(updateEnergyDemand)();
            profiler.registerFN(updateSources)();
            profiler.registerFN(updateContainerID)();
        //}
    }
    catch (e) {
        console.log("Failed updateEnergyDemandAndNrCreeps update with: ", e);
    }
}

function filterCreeps() {
    let creepsGrouped = _.groupBy(Game.creeps, (c: Creep) => c.creationRoom);
    for (let roomID in creepsGrouped) {
        Game.rooms[roomID].creepsAll = creepsGrouped[roomID];
    }
}



function updateSources() {
    try {
        for (let [ID, sMem] of Object.entries(Memory.Resources)) {
            const pos = restorePos(sMem.workPos);
            if (Game.rooms[pos.roomName]) {
                let room = Game.rooms[pos.roomName];
                sMem.AvailResource = 0;
                const energys = pos.lookFor(LOOK_RESOURCES);
                for (let energy of energys) {
                    sMem.AvailResource += energy.amount;
                }
                const structs = pos.lookFor(LOOK_STRUCTURES);
                for (let struct of structs) {
                    if (struct.structureType == STRUCTURE_CONTAINER) {
                        let cont = struct as StructureContainer;
                        sMem.AvailResource += _.sum(cont.store);
                    }
                }
                let transporters = room.getCreeps(TRANSPORTER).concat(room.getCreeps(STARTER));
                const transportersTmp = _.filter(transporters, function (creep) {
                    return creep.currentTarget && creep.currentTarget.ID == ID;
                })
                for (const transp of transportersTmp) {
                    sMem.AvailResource -= Number(transp.carryCapacity);
                }
            }
        }
    }
    catch (e) {
        console.log("Failed to update sources ", e);
    }
}

function updateContainerID() {
    try {
        for (let roomName in Game.rooms) {
            //********all rooms*************//////
            let room = Game.rooms[roomName];
            if (room.my && room.controller && room.memory.controllerStoreID == null) {
                let con = room.controller.pos.findInRange(FIND_STRUCTURES, 2, { filter: { structureType: STRUCTURE_CONTAINER } });
                if (con.length > 0 && con[0].isActive()) {
                    room.memory.controllerStoreID = con[0].id;
                }
            }
        }
    }
    catch (e) {
        console.log("Failed to update controller store ", e);
    }
}

////updates energy demand and also the nr of creeps
//function updateEnergyDemand() : void {

//    for (let roomName in Game.rooms) {
//        //********all rooms*************//////
//        let room = Game.rooms[roomName];
//        if (room.my) {//no point going trhour rooms that cant create stuff

//            room.memory.EnergyNeed = room.energyCapacityAvailable - room.energyAvailable;
//            let del = _.filter(room.getCreeps(TRANSPORTER).concat(room.getCreeps(STARTER)), function (obj) {
//                if (obj.currentTarget) {
//                    return obj.currentTarget.type == targetT.POWERUSER && obj.carry[RESOURCE_ENERGY];
//                }
//                return false;

//            });
//            for (let creepName in del) {
//                room.memory.EnergyNeed -= del[creepName].carry[RESOURCE_ENERGY];
//            }

//            let structList: Structure[] = _.filter(room.myStructures, function (str: AnyOwnedStructure) {
//                    return (str.structureType == STRUCTURE_EXTENSION || str.structureType == STRUCTURE_SPAWN) &&
//                        str.energy < str.energyCapacity
//                });
//            let structList2: StructureTower[] = _.filter(room.myStructures, function (str: AnyOwnedStructure) {
//                    return str.structureType == STRUCTURE_TOWER && str.energy < str.energyCapacity * 0.7
//                }) as StructureTower[];
//            for (let tower of structList2) {
//                room.memory.EnergyNeed += tower.energyCapacity - tower.energy;
//            }

//            structList = structList.concat(structList2);
//            let finalStruct: targetData[] = [];
//            //console.log("test of struct ", del.length);
//            for (let struct of structList) {
//                let transportersTmp = _.filter(del, function (creep) {
//                    return creep.currentTarget &&creep.currentTarget.ID == struct.id;
//                })
//                //console.log("test of transportersTmp ", transportersTmp.length);
//                if (transportersTmp.length == 0)
//                    finalStruct.push({ ID: struct.id, type: targetT.POWERUSER,pos: struct.pos, range: 1});
//            }
//            room.memory.EnergyNeedStruct = finalStruct;
//        }
//    }
//}



function addSources(room: Room, homeRoomPos: RoomPosition, findType: FIND_MINERALS | FIND_SOURCES) {
    const sources = room.find(findType);
    if (sources.length == 0)
        return;
    if (findType == FIND_MINERALS) {
        console.log("addSource 1", sources.length);
    }
    for (const source of sources) {
        let pos = source.pos;
        let nrNeig = 0;
        let res = room.lookForAtArea(LOOK_TERRAIN, pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
        for (let [ind, spot] of Object.entries(res)) {
            nrNeig += Number(spot.terrain != "wall");
        }
        let goal = { pos: pos, range: 1 };
        let pathObj = PathFinder.search(homeRoomPos, goal);//ignore object need something better later. cant use for desirialize
        let newWorkPos = _.last(pathObj.path);
        let mem: SourceMemory ={
            pos: storePos(source.pos),
            usedByRoom: homeRoomPos.roomName,
            maxUser: nrNeig,
            workPos: newWorkPos,
            container: null,
            linkID: null,
            AvailResource: 0,
            nrUsers: 0,
            resourceType: RESOURCE_ENERGY,
        };

        if (findType == FIND_SOURCES) {
            Memory.Resources[source.id] = mem;
            room.memory.sourcesUsed.push(source.id);
        }
        else if (findType == FIND_MINERALS) {
            let min = source as Mineral;
            mem.resourceType = min.mineralType;
            Memory.Resources[source.id] = mem;
            room.memory.mineralsUsed.push(source.id);
        }
    }
}

function expandRoom(homeRoom: Room, centrePos: RoomPosition) {
    if (homeRoom.memory.sourcesUsed.length == 0) {
        addSources(homeRoom, centrePos, FIND_SOURCES);
    }
    if (homeRoom.memory.mineralsUsed.length == 0) {
        addSources(homeRoom, centrePos, FIND_MINERALS);
    }
}

function expand() {
    for (let spawn in Game.spawns) {//always have same room sources
        let room = Game.spawns[spawn].room;
        if (room.memory.startSpawnPos)
            expandRoom(room, restorePos(room.memory.startSpawnPos));
        else
            room.memory.startSpawnPos = Game.spawns[spawn].pos;
    }
    for (let [id, flag] of Object.entries(Game.flags)) {
        if (flag.color == COLOR_WHITE && flag.room) {
            expandRoom(flag.room, flag.pos);
        }
    }
}

function initNewRooms() {
    for (let roomID in Game.rooms) {
        let room = Game.rooms[roomID];
        if (room.memory.sourcesUsed == null) {
            room.memory.sourcesUsed = [];
        }
        if (room.memory.ExpandedLevel == null)
            room.memory.ExpandedLevel = 0;
        if (room.memory.mineralsUsed == null)
            room.memory.mineralsUsed = [];
    }
}

function levelTimings() {    
    let highest = _.max(Game.rooms, function (room: Room) { if (room.controller) return room.controller.level; else return 0; });
    if (highest.controller && Memory.LevelTick.length <= highest.controller.level)
        Memory.LevelTick.push(Game.time - Memory.LevelTick[0]);

}
