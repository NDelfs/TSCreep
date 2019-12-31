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
import { PrettyPrintCreep, PrettyPrintErr } from "utils/PrettyPrintErr";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { BOOST } from "../Types/TargetTypes";
import { PM } from "../PishiMaster";


export function CreepUpdate() {
  for (let creepID in Game.creeps) {
    try {
      let creep = Game.creeps[creepID];
      if (creep.memory.targetQue.length > 3) {
        console.log(creep.room.name, "rampant targets, cleared instead", JSON.stringify(creep.memory.targetQue));
        creep.memory.targetQue = [];
      }

      if (creep.spawning)
        continue;
      creep.walk();
      let target = creep.getTarget();
      if (target) {
        if (target.type == BOOST) {
          if (creep.inPlace) {
            try {
              let err = PM.colonies[creep.memory.creationRoom].boostCreep(creep, target);
              if (err != OK) {
                console.log(creep.room.name, "failed boost", PrettyPrintErr(err));
              }
            }
            catch (e) {
              console.log(creep.room.name, "creep target boost failed", e);
            }
          }
          continue;
        }

      }

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
