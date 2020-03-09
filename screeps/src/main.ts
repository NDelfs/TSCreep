'use strict';
import { ErrorMapper } from "utils/ErrorMapper";
//const profiler = require('Profiler/screeps-profiler');
import './ScreepExtends/Room';
import './ScreepExtends/Creep';
import './ScreepExtends/Source';
import 'ScreepExtends/Lab';
import 'ScreepExtends/Resource';


import { PM, createNewMaster } from "PishiMaster";
import { Spawner } from "Spawners/Spawner";
import { DataUpdate } from "utils/DataUpdate";

import { baseExpansion } from "Base/BaseExpansion";

import { Market } from "Base/Market";
import { CreepUpdate } from "Drones/CreepsUpdate";
//import PishiMaster from "PishiMaster"
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { TRANSPORT } from "./Types/TargetTypes";
import { TRANSPORTER, BUILDER } from "./Types/CreepType";



function clearVec(vec: { [name: string]: any }) {
  for (var i in vec) {
    delete vec[i];
  }
}

function reset() {
  if (_.size(Game.rooms) == 1 && !Memory.respawncomplete) { // you only have one room and you haven't done the respawn.
    var room = _.find(Game.rooms); // get the only room somehow
    if (room && room.controller && room.controller.level == 1) { // RCL one on a single room means we've *just* respawned
      clearVec(Memory.creeps);
      clearVec(Memory.Resources);
      clearVec(Memory.rooms);
      clearVec(Memory.flags);
      clearVec(Memory.spawns);
      Memory.creepIndex = 0;
      Memory.respawncomplete = true; // don't do respawn again
      console.log("Reset Memory because of respawn")

      // do all the once-off code here
      Memory.Resources = {};
      Memory.LevelTick = [];
      Memory.LevelTick.push(Game.time);
    }
    else
      Memory.respawncomplete = false; // because we are RCL 2+, we reset the respawn complete flag for next respawn. The code won't run again because we are already RCL+2
  }
}

function testeCode() {

}

function main() {
  //for (let roomID in Memory.rooms) {
  //  let roomMem = Memory.rooms[roomID];
  //  let newMem: RoomMemory = {};//here data is transfered to new struct
  //  Memory.rooms[roomID] = newMem;
  //}
  reset();
  try {
    profiler.registerFN(DataUpdate)();
  }
  catch (e) {
    console.log("Failed Data update with: ", e);
  }

  try {
    if (!PM || !PM.ticksAlive) {
      //delete PishiMaster;
      //PishiMaster = new _PishiMaster();
      createNewMaster();
    }
    else {
      PM.refresh();
    }
  }
  catch (e) {
    console.log("pishi master init/refresh failed with : ", e);
  }
  try {
    PM.run();
  }
  catch (e) {
    console.log("pishi master run failed with : ", e);
  }

  //try {
  //    profiler.registerFN(baseExpansion)();
  //    //baseExpansion();
  //}
  //catch (e) {
  //    console.log("Failed base expansion update with: ", e);
  //}
  //try {
  //    profiler.registerFN(Spawner)();
  //    //Spawner();
  //}
  //catch (e) {
  //    console.log("Failed spawner update with: ", e);
  //}
  //console.log(`Current game tick is ${Game.time}`);
  profiler.registerFN(CreepUpdate)();
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      let mem = Memory.creeps[name];
      let colony = PM.colonies[mem.creationRoom];
      if (colony) {//special case of using creeps before colony is created
        let room = Game.rooms[mem.curentRoom];
        if (room && (mem.type == TRANSPORTER || mem.type == BUILDER)) {
          colony.refreshDropPickup(room);
        }
        if (mem.targetQue) {
          for (let targ of mem.targetQue) {
            if (targ) {
              colony.forceUpdateEnergy = true;
              let creepMis = colony.resourceHandler._resourceRequests[targ.ID];
              if (creepMis) {
                for (let req of creepMis)
                  req.updateCreepD();
              }
              else {
                let creepP = colony.resourceHandler.resourcePush[targ.ID];
                if (creepP)
                  creepP.updateCreepD();
              }
            }
          }
        }
      }
      delete Memory.creeps[name];   
    }
  }
}



let USE_ERROR_MAPPER = true;
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code

const USE_PROFILER = true;
let _loop: () => void;
if (USE_PROFILER) {
  profiler.enable();
  _loop = () => profiler.wrap(main);
}
else {
  _loop = main;
}
if (USE_ERROR_MAPPER) {
  _loop = ErrorMapper.wrapLoop(_loop);
}

export const loop = _loop;
