'use strict';
import { ErrorMapper } from "utils/ErrorMapper";
//const profiler = require('Profiler/screeps-profiler');
import './ScreepExtends/Room';
import './ScreepExtends/Creep';
//@ts-ignore
import profiler from "./Profiler/screeps-profiler";
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
import { PrettyPrintCreep } from "./utils/PrettyPrintErr";
import { baseExpansion } from "./Base/BaseExpansion";
import { Defender } from "./Drones/Defender";
import { Builder } from "./Drones/Builder";
import { Attacker } from "Drones/Attack";
import { AttackerController } from "./Drones/AttackController";
import { HARVESTER, SCOUT } from "Types/CreepType";
import { connect } from "http2";
import { Market } from "./Base/Market";




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
let cpuUsed : number;
function bench(text: string) {
    if (Memory.bench) {
        console.log(text, Game.cpu.getUsed() - cpuUsed);
        cpuUsed = Game.cpu.getUsed();
    }
}
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
profiler.enable();
export const loop = ErrorMapper.wrapLoop(() => {
    profiler.wrap(function () {
        cpuUsed = 0;
        try {
        }
        catch (e) {
            console.log("Testecode failed with : ", e);
        }
        reset();
        bench("after reset");
        try {
            DataUpdate();
        }
        catch (e) {
            console.log("Failed Data update with: ", e);
        }
        bench("Data update");
        try {
            baseExpansion();
        }
        catch (e) {
            console.log("Failed base expansion update with: ", e);
        }
        bench("Base expansion");
        try {
            Spawner();
        }
        catch (e) {
            console.log("Failed spawner update with: ", e);
        }
        bench("Spawner");
        try {
            Market();
        }
        catch (e) {
            console.log("Failed market with: ", e);
        }
        bench("Market");
        //console.log(`Current game tick is ${Game.time}`);

        for (let creepID in Game.creeps) {
            try {
                let creep = Game.creeps[creepID];
                if (creep.spawning)
                    continue;
                switch (creep.type) {
                    case creepT.STARTER: {
                        Starter(creep);
                        break;
                    }
                    case creepT.TRANSPORTER: {
                        Transporter(creep);
                        break;
                    }
                    case creepT.UPGRADER: {
                        Upgrader(creep);
                        break;
                    }
                    case creepT.HARVESTER: {
                        Harvester(creep);
                        break;
                    }
                    case creepT.SCOUT: {
                        scout(creep);
                        break;
                    }
                    case creepT.DEFENDER: {
                        Defender(creep);
                        break;
                    }
                    case creepT.BUILDER: {
                        Builder(creep);
                        break;
                    }
                    case creepT.ATTACKER: {
                        Attacker(creep);
                        break;
                    }
                    case creepT.ATTACKERCONTROLLER: {
                        AttackerController(creep);
                        break;
                    }
                }
            }
            catch (e) {
                console.log(Game.creeps[creepID].pos.roomName, " a creep failed, type =", PrettyPrintCreep(Game.creeps[creepID].memory.type), "with err: ", e);
            }
        }
        bench("Creeps");
        try {
            TowerOperation();
        }
        catch (e) {
            console.log("Tower failet to run ", e);
        }
        bench("Tower operation");
        // Automatically delete memory of missing creeps
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
            }
        }


        //for (let roomID in Game.rooms) {
        //    if (roomID == "E49N47") {
        //        let room = Game.rooms[roomID];
        //        console.log("call energy need", room.getCreeps(HARVESTER).length);
        //    }
        //}
    });//end profiler
});//end loop and wraper
