import * as creepT from "Types/CreepType";
import { Defender } from "Drones/Defender";
import { Builder } from "Drones/Builder";
import { Attacker } from "Drones/Attack";
import { AttackerController } from "Drones/AttackController";
import { Starter } from "Drones/starter";
import { Harvester } from "Drones/Harvester";
import { scout } from "Drones/Scout";
import { Transporter } from "Drones/Transporter";
import { Upgrader } from "Drones/Upgrader";
import { PrettyPrintCreep } from "utils/PrettyPrintErr";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";


export function CreepUpdate() {
    for (let creepID in Game.creeps) {
        try {
            let creep = Game.creeps[creepID];
            if (creep.memory.targetQue.length > 2) {
                creep.memory.targetQue = [];
                console.log(creep.room.name,"rampant targets, cleared instead", creep.type)
            }

            if (creep.spawning)
                continue;
            creep.walk();
            switch (creep.type) {
                case creepT.STARTER: {
                    profiler.registerFN(Starter)(creep);
                    //Starter(creep);
                    break;
                }
                case creepT.TRANSPORTER: {
                    profiler.registerFN(Transporter)(creep);
                   // Transporter(creep);
                    break;
                }
                case creepT.UPGRADER: {
                    profiler.registerFN(Upgrader)(creep);
                   // Upgrader(creep);
                    break;
                }
                case creepT.HARVESTER: {
                    profiler.registerFN(Harvester)(creep);
                   // Harvester(creep);
                    break;
                }
                case creepT.SCOUT: {
                    profiler.registerFN(scout)(creep);
                    //scout(creep);
                    break;
                }
                case creepT.DEFENDER: {
                    profiler.registerFN(Defender)(creep);
                   // Defender(creep);
                    break;
                }
                case creepT.BUILDER: {
                    profiler.registerFN(Builder)(creep);
                   // Builder(creep);
                    break;
                }
                case creepT.ATTACKER: {
                    profiler.registerFN(Attacker)(creep);
                    //Attacker(creep);
                    break;
                }
                case creepT.ATTACKERCONTROLLER: {
                    profiler.registerFN(AttackerController)(creep);
                   // AttackerController(creep);
                    break;
                }
            }
            creep.walk();
        }
        catch (e) {
            console.log(Game.creeps[creepID].pos.roomName, " a creep failed, type =", PrettyPrintCreep(Game.creeps[creepID].memory.type), "with err: ", e);
        }
    }
}
