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

export function CreepUpdate() {
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
}
