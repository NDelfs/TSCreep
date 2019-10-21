import { goToTarget } from "Drones/Funcs/Walk";
import { getEnergyTarget } from "Drones/Funcs/DroppedEnergy";


export function Transporter(creep: Creep) {
    if (creep.carry[RESOURCE_ENERGY] == 0 && creep.memory.currentTarget == null) {
        creep.memory.currentTarget = getEnergyTarget(creep);
        if (creep.memory.currentTarget) {
            Memory.Sources[creep.memory.currentTarget.ID].AvailEnergy -= creep.carryCapacity;
            creep.say("Go to source")
        }
    }
    else if (creep.memory.currentTarget == null) {
        //3 codes to get xtensions, spawns, storage. right now xt and spawn could be just struct
        //take the most important or closest one
    }

    if (creep.memory.currentTarget && goToTarget(creep)) {
        //use target, switch on targets type
    }
}
