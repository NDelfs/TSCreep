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
}

function filterCreeps() {
  let creepsGrouped = _.groupBy(Game.creeps, (c: Creep) => c.creationRoom);
  for (let roomID in creepsGrouped) {
    Game.rooms[roomID].creepsAll = creepsGrouped[roomID];
  }
}

export function updateSource(source: Source | Mineral) {
  try {
    let sMem = source.memory;
    const pos = restorePos(sMem.workPos);

      let room = Game.rooms[pos.roomName];
      sMem.AvailResource = 0;
      const energys = pos.lookFor(LOOK_RESOURCES);
      for (let energy of energys) {
        sMem.AvailResource += energy.amount;
      }
      if (source.memory.container) {
        let con = Game.getObjectById(source.memory.container) as StructureContainer;
        sMem.AvailResource += _.sum(con.store);
      }
      let transporters = room.getCreeps(TRANSPORTER).concat(room.getCreeps(STARTER)).concat(room.getCreeps(BUILDER));
      const transportersTmp = _.filter(transporters, function (creep) {
        return creep.alreadyTarget(source.id);
      })
      for (const transp of transportersTmp) {
        sMem.AvailResource -= Number(transp.carryCapacity);
    }
  }
  catch (e) {
    console.log(JSON.stringify(source.pos), 'failed to update old style source', e);
  }
}


function levelTimings() {
  let highest = _.max(Game.rooms, function (room: Room) { if (room.controller) return room.controller.level; else return 0; });
  if (highest.controller && Memory.LevelTick.length <= highest.controller.level)
    Memory.LevelTick.push(Game.time - Memory.LevelTick[0]);

}
