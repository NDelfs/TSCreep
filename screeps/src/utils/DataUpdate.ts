import { storePos, restorePos } from "utils/posHelpers";
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";
import { CONSTRUCTIONSTORAGE } from "../Types/Constants";
import { HARVESTER, TRANSPORTER, STARTER, BUILDER } from "Types/CreepType";
import * as C from "Types/Constants"; 
import { Starter } from "../Drones/starter";
import { PM } from "PishiMaster";
import { Colony } from "Colony"
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
        //if (Game.time % 3 == 0) {//by having a better tracking of resources we only need to update rarly for thing we didnt foorsee
            //profiler.registerFN(updateEnergyDemand)();
            profiler.registerFN(updateSources)();
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
              let transporters = room.getCreeps(TRANSPORTER).concat(room.getCreeps(STARTER)).concat(room.getCreeps(BUILDER));
                const transportersTmp = _.filter(transporters, function (creep) {
                    return creep.alreadyTarget(ID);
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

function levelTimings() {    
    let highest = _.max(Game.rooms, function (room: Room) { if (room.controller) return room.controller.level; else return 0; });
    if (highest.controller && Memory.LevelTick.length <= highest.controller.level)
        Memory.LevelTick.push(Game.time - Memory.LevelTick[0]);

}
