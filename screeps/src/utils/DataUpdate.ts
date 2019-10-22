import { storePos, restorePos } from "utils/posHelpers";
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";

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
                    return obj.memory.currentTarget.type == targetT.STRUCTURE && obj.carry[RESOURCE_ENERGY];
                }
                return false;

            });
            for (let creepName in del) {
                room.memory.EnergyNeed -= del[creepName].carry[RESOURCE_ENERGY];
            }

            let structList = room.find(FIND_MY_STRUCTURES, {
                filter: function (str) {
                    return (str.structureType == STRUCTURE_EXTENSION ||
                        str.structureType == STRUCTURE_SPAWN || str.structureType == STRUCTURE_TOWER) &&
                        str.energy < str.energyCapacity

                }
            });

            let finalStruct: targetData[] = [];
            //console.log("test of struct ", del.length);
            for (let struct of structList) {
               

                let transportersTmp = _.filter(del, function (creep) {
                    return creep.memory.currentTarget &&creep.memory.currentTarget.ID == struct.id;
                })
                //console.log("test of transportersTmp ", transportersTmp.length);
                if (transportersTmp.length == 0)
                    finalStruct.push({ ID: struct.id, type: targetT.STRUCTURE, pos: struct.pos, range:1 });
            }
            room.memory.EnergyNeedStruct = finalStruct;
        }
    }

    //////update sources//////
    //_.forEach(Memory.Sources, function (sMem, index, arr) {
    try {
        for (let [ID, sMem] of Object.entries(Memory.Sources)) {
            const pos = restorePos(sMem.workPos);
            const energys = pos.lookFor(LOOK_RESOURCES);
            sMem.AvailEnergy = 0;
            for (let [inx, energy] of Object.entries(energys)) {
                sMem.AvailEnergy+= energy.amount;
                const transportersTmp = _.filter(transporters, function (creep) {
                    return creep.memory.currentTarget&& creep.memory.currentTarget.ID == energy.id;
                })
                for (const [index, transp] of Object.entries(transportersTmp)) {
                    sMem.AvailEnergy -= Number(transp.carryCapacity);
                }
            }     
        }
    }
    catch (e) {
        console.log("Failed to update sources ", e);
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
        };
        room.memory.sourcesUsed.push(sources[source].id);
    }
}

function expandRoom(homeRoom: Room) {
    if (homeRoom.memory.sourcesUsed.length == 0 && homeRoom.memory.startSpawnPos) {
        addSources(homeRoom, restorePos( homeRoom.memory.startSpawnPos));
    }
}

function expand() {
    for (let spawn in Game.spawns) {//always have same room sources
        expandRoom(Game.spawns[spawn].room);
    }
}

function initNewRooms() {
    for (let room in Game.rooms) {
        if (Game.rooms[room].memory.sourcesUsed == null) {
            Game.rooms[room].memory.sourcesUsed = [];
        }
    }
}

function levelTimings() {    
    let highest = _.max(Game.rooms, function (room: Room) { if (room.controller) return room.controller.level; else return 0; });
    if (highest.controller && Memory.LevelTick.length <= highest.controller.level)
        Memory.LevelTick.push(Game.time - Memory.LevelTick[0]);

}
