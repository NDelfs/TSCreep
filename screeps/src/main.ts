'use strict';
import { ErrorMapper } from "utils/ErrorMapper";
//const profiler = require('Profiler/screeps-profiler');
import './ScreepExtends/Room';
import './ScreepExtends/Creep';
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { Spawner } from "Spawners/Spawner";
import { DataUpdate } from "utils/DataUpdate";

import { TowerOperation } from "Base/TowerOperation";

import { baseExpansion } from "Base/BaseExpansion";

import { Market } from "Base/Market";
import { CreepUpdate } from "Drones/CreepsUpdate";




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
  
    try {
    }
    catch (e) {
        console.log("Testecode failed with : ", e);
    }
    reset();
    try {
        profiler.registerFN(DataUpdate)();
    }
    catch (e) {
        console.log("Failed Data update with: ", e);
    }
    try {
        profiler.registerFN(baseExpansion)();
        //baseExpansion();
    }
    catch (e) {
        console.log("Failed base expansion update with: ", e);
    }
    try {
        profiler.registerFN(Spawner)();
        //Spawner();
    }
    catch (e) {
        console.log("Failed spawner update with: ", e);
    }
    try {
        profiler.registerFN(Market)();
        //Market();
    }
    catch (e) {
        console.log("Failed market with: ", e);
    }
    //console.log(`Current game tick is ${Game.time}`);
    CreepUpdate();
    try {
        profiler.registerFN(TowerOperation)();
        //TowerOperation();
    }
    catch (e) {
        console.log("Tower failet to run ", e);
    }
    // Automatically delete memory of missing creeps
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }
}



let USE_ERROR_MAPPER = false;
let USE_PROFILER = true;
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code


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
