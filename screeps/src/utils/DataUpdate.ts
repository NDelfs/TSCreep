import { storePos, restorePos } from "utils/posHelpers";
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";
import { Transporter } from "../Drones/Transporter";
import { CONSTRUCTIONSTORAGE } from "../Types/Constants";

export function DataUpdate(): void {
    try {
        levelTimings();//only needed for benchmarking
    }
    catch (e) {
        console.log("Failed levelTimings update with: ", e);
    }
    try {
        initNewRooms();
    }
    catch (e) {
        console.log("Failed initNewRooms update with: ", e);
    }
    try {
        expand();
    }
    catch (e) {
        console.log("Failed expand update with: ", e);
    }
    try {
        updateEnergyDemandAndNrCreeps();
    }
    catch (e) {
        console.log("Failed updateEnergyDemandAndNrCreeps update with: ", e);
    }
}


//updates energy demand and also the nr of creeps
function updateEnergyDemandAndNrCreeps() : void {

    let transporters = _.filter(Game.creeps, function (creep) { return creep.memory.type == creepT.TRANSPORTER });
    let builders = _.filter(Game.creeps, function (creep) { return creep.memory.type == creepT.BUILDER });
    if (transporters.length == 0)
        transporters = transporters.concat(_.filter(Game.creeps, function (creep) { return creep.memory.type == creepT.STARTER }));

    for (let roomName in Game.rooms) {
        //********all rooms*************//////
        let room = Game.rooms[roomName];
        if (room.controller && room.controller.level > 0) {//no point going trhour rooms that cant create stuff
            let locTransporters = _.filter(transporters, function (creep) {
                return creep.memory.creationRoom == roomName;
            });
            let locBuilder = _.filter(builders, function (creep) {
                return creep.memory.creationRoom == roomName;
            });

            //console.log(transporters.length);
            //room.memory.nrTransporters = locTransporters.length;          
            //room.memory.nrBuilder = locBuilder.length;


            //****Energy demand
            //let tmpTowers: StructureTower[] = room.find(FIND_MY_STRUCTURES, { filter: {structureType: STRUCTURE_TOWER } }) as StructureTower[];
            //let towers = _.filter(tmpTowers, function (tower: StructureTower) { return tower.energyCapacity - tower.energy < tower.energyCapacity * 0.8; });
            //if (towers.length > 0)
            //console.log("found towers ", towers.length);

            room.memory.EnergyNeed = room.energyCapacityAvailable - room.energyAvailable;
            let del = _.filter(locTransporters, function (obj) {
                if (obj.memory.currentTarget) {
                    return obj.memory.currentTarget.type == targetT.POWERUSER && obj.carry[RESOURCE_ENERGY];
                }
                return false;

            });
            for (let creepName in del) {
                room.memory.EnergyNeed -= del[creepName].carry[RESOURCE_ENERGY];
            }

            let structList: Structure[] = room.find(FIND_MY_STRUCTURES, {
                filter: function (str) {
                    return (str.structureType == STRUCTURE_EXTENSION ||
                        str.structureType == STRUCTURE_SPAWN) &&
                        str.energy < str.energyCapacity

                }
            });
            let structList2: StructureTower[] = room.find(FIND_MY_STRUCTURES, {
                filter: function (str) {
                    return (str.structureType == STRUCTURE_TOWER) &&
                        str.energy < str.energyCapacity * 0.7

                }
            }) as StructureTower[];
            for (let tower of structList2) {
                room.memory.EnergyNeed += tower.energyCapacity - tower.energy;
            }

            structList = structList.concat(structList2);
            let finalStruct: targetData[] = [];
            //console.log("test of struct ", del.length);
            for (let struct of structList) {
               

                let transportersTmp = _.filter(del, function (creep) {
                    return creep.memory.currentTarget &&creep.memory.currentTarget.ID == struct.id;
                })
                //console.log("test of transportersTmp ", transportersTmp.length);
                if (transportersTmp.length == 0)
                    finalStruct.push({ ID: struct.id, type: targetT.POWERUSER, pos: struct.pos, range:1 });
            }
            room.memory.EnergyNeedStruct = finalStruct;
        }
    }

    //////update sources//////
    //_.forEach(Memory.Sources, function (sMem, index, arr) {
    try {
        for (let [ID, sMem] of Object.entries(Memory.Sources)) {
            const pos = restorePos(sMem.workPos);
            if (Game.rooms[pos.roomName]) {
                sMem.AvailEnergy = 0;  
                const energys = pos.lookFor(LOOK_RESOURCES);                        
                for (let energy of energys) {
                    sMem.AvailEnergy += energy.amount;
                }
                const structs = pos.lookFor(LOOK_STRUCTURES);  
                for (let struct of structs) {
                    if (struct.structureType == STRUCTURE_CONTAINER) {
                        let cont = struct as StructureContainer;
                        sMem.AvailEnergy += cont.store.energy;
                    }
                }

                const transportersTmp = _.filter(transporters, function (creep) {
                    return creep.memory.currentTarget && creep.memory.currentTarget.ID == ID;
                })
                for (const transp of transportersTmp) {
                    sMem.AvailEnergy -= Number(transp.carryCapacity);
                }
            }
        }
    }
    catch (e) {
        console.log("Failed to update sources ", e);
    }
    try {
        for (let roomName in Game.rooms) {
            //********all rooms*************//////
            let room = Game.rooms[roomName];
            if (room.memory.controllerStoreID) {
                let store: StructureContainer|null = Game.getObjectById(room.memory.controllerStoreID);
                if (store) {
                    let ID = store.id;
                    room.memory.controllerStoreDef = store.storeCapacity - store.store.energy;
                    let transportersTmp = _.filter(transporters, function (creep) {
                        return creep.memory.currentTarget && creep.memory.currentTarget.ID == ID;
                    })
                    for (let creep of transportersTmp) {
                        room.memory.controllerStoreDef -= creep.carry.energy;
                    }
                }
            }
            else if (room.memory.controllerStoreDef == CONSTRUCTIONSTORAGE && room.controller) {
                let con = room.controller.pos.findInRange(FIND_STRUCTURES, 2, { filter: { structureType: STRUCTURE_CONTAINER } });
                if (con.length > 0 && con[0].isActive()) {
                    room.memory.controllerStoreID = con[0].id;
                    room.memory.controllerStoreDef = 0;
                }
            }
        }
    }
    catch (e) {
        console.log("Failed to update controller store ", e);
    }
}




function addSources(room: Room, homeRoomPos: RoomPosition) {
    const sources = room.find(FIND_SOURCES);
    for (const source in sources) {
        let pos = sources[source].pos;
        let nrNeig = 0;
        let res = room.lookForAtArea(LOOK_TERRAIN, pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
        for (let [ind, spot] of Object.entries(res)) {
            nrNeig += Number(spot.terrain != "wall");
        }
        let goal = { pos: pos, range: 1 };
        let pathObj = PathFinder.search(homeRoomPos, goal);//ignore object need something better later. cant use for desirialize
        let newWorkPos = _.last(pathObj.path);
             
        Memory.Sources[sources[source].id] = {
            pos: storePos(sources[source].pos),
            usedByRoom: homeRoomPos.roomName,
            maxUser: nrNeig,
            workPos: newWorkPos,
            container: null,
            AvailEnergy: 0,
            nrUsers: 0,
        };
        room.memory.sourcesUsed.push(sources[source].id);
    }
}

function expandRoom(homeRoom: Room, centrePos: RoomPosition) {
    if (homeRoom.memory.sourcesUsed.length == 0) {
        addSources(homeRoom, centrePos);
    }
}

function expand() {
    for (let spawn in Game.spawns) {//always have same room sources
        let room = Game.spawns[spawn].room;
        if (room.memory.startSpawnPos)
          expandRoom(room, restorePos(room.memory.startSpawnPos));
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
        if (room.memory.controllerStoreDef == null)
            room.memory.controllerStoreDef = 0;
    }
}

function levelTimings() {    
    let highest = _.max(Game.rooms, function (room: Room) { if (room.controller) return room.controller.level; else return 0; });
    if (highest.controller && Memory.LevelTick.length <= highest.controller.level)
        Memory.LevelTick.push(Game.time - Memory.LevelTick[0]);

}
