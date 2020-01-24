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
    //levelTimings();//only needed for benchmarking, should be per room
  }
  catch (e) {
    console.log("Failed levelTimings update with: ", e);
  }
}

function filterCreeps() {
  let creepsGrouped = _.groupBy(Game.creeps, (c: Creep) => c.creationRoom);
  for (let roomID in creepsGrouped) {
    if (Game.rooms[roomID])
      Game.rooms[roomID].creepsAll = creepsGrouped[roomID];
  }
}

//function levelTimings() {
//  let highest = _.max(Game.rooms, function (room: Room) { if (room.controller) return room.controller.level; else return 0; });
//  if (highest.controller && Memory.LevelTick.length <= highest.controller.level)
//    Memory.LevelTick.push(Game.time - Memory.LevelTick[0]);

//}
