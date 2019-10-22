import { ErrorMapper } from "utils/ErrorMapper";

import { Transporter } from "Drones/Transporter";
import { Upgrader } from "Drones/Upgrader";
import { Spawner } from "Spawners/Spawner";
import { ExtensionFlagPlacement } from "Base/ExtensionFlagPlacement";
import { DataUpdate } from "utils/DataUpdate";
import { Starter } from "Drones/starter";
import { Harvester } from "Drones/Harvester";
import { scout } from "Drones/Scout";
import { TowerOperation } from "Base/TowerOperation";
import * as creepT from "Types/CreepType";

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
            clearVec(Memory.Sources);
            clearVec(Memory.rooms);
            clearVec(Memory.flags);
            clearVec(Memory.spawns);
            Memory.creepIndex = 0;
            Memory.respawncomplete = true; // don't do respawn again
            console.log("Reset Memory because of respawn")

            // do all the once-off code here
            Memory.Sources = {};
            Memory.LevelTick = [];
            Memory.LevelTick.push(Game.time);
        }
        else
            Memory.respawncomplete = false; // because we are RCL 2+, we reset the respawn complete flag for next respawn. The code won't run again because we are already RCL+2
    }
}

function testeCode() {
    //let pos = new RoomPosition(4, 21, Game.spawns["Spawn1"].pos.roomName);
    //let homeRoomPos = Game.spawns["Spawn1"].pos;
    //let goal = { pos: pos, range: 1 };
    //let pathObj = PathFinder.search(homeRoomPos, goal);//ignore object need something better later.
    //let newWorkPos = _.last(pathObj.path);
    //console.log(newWorkPos.x, newWorkPos.y, newWorkPos.roomName);
}
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
    try {
        //testeCode();
    }
    catch (e) {
        console.log("Testecode failed with : ", e);
    }
    reset();
    try {
        DataUpdate();
        ExtensionFlagPlacement();
    }
    catch (e) {
        console.log("Failed Data update with: ", e);
    }
    try {
        Spawner();
    }
    catch (e) {
        console.log("Failed spawner update with: ",e);
    }
    //console.log(`Current game tick is ${Game.time}`);

    for (let creepID in Game.creeps) {
        try {
            switch (Game.creeps[creepID].memory.type) {
                case creepT.STARTER: {
                    Starter(Game.creeps[creepID]);
                    break;
                }
                case creepT.TRANSPORTER: {
                    Transporter(Game.creeps[creepID]);
                    break;
                }
                case creepT.UPGRADER: {
                    Upgrader(Game.creeps[creepID]);
                    break;
                }
                case creepT.HARVESTER: {
                    Harvester(Game.creeps[creepID]);
                    break;
                }
                case creepT.SCOUT: {
                    scout(Game.creeps[creepID]);
                    break;
                }
            }
        }
        catch (e) {
            console.log("Failed creep with: ",e);
        }       
    }
    try {
        TowerOperation();
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
});
