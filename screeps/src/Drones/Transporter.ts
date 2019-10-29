import { goToTarget } from "Drones/Funcs/Walk";
import { getEnergyTarget, useEnergyTarget } from "Drones/Funcs/DroppedEnergy";
import { getDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import * as targetT from "Types/TargetTypes";

export function Transporter(creep: Creep) {
    if (creep.carry[RESOURCE_ENERGY] == 0 && creep.memory.currentTarget == null) {
        creep.memory.currentTarget = getEnergyTarget(creep);
        if (creep.memory.currentTarget) {
            Memory.Sources[creep.memory.currentTarget.ID].AvailEnergy -= creep.carryCapacity;
            creep.say("Go to source")
        }
    }
    else if (creep.memory.currentTarget == null) {
        let targ = getDeliverTarget(creep, true);
        if(targ)
          creep.memory.currentTarget = targ;
    }
    if (creep.memory.currentTarget == null && creep.room.memory.EnergyNeed > 0) {
        if (creep.room.storage) {
            creep.memory.currentTarget = {
                ID: creep.room.storage.id, type: targetT.DROPPED_ENERGY, pos: creep.room.storage.pos, range: 1
            }
        }
    }

    if (creep.memory.currentTarget == null)
        creep.say("zZzZ")

    if (creep.memory.currentTarget && goToTarget(creep)) {
        switch (creep.memory.currentTarget.type) {
            case targetT.POWERSTORAGE:
            case targetT.POWERUSER: useDeliverTarget(creep, creep.memory.currentTarget); break;
            case targetT.DROPPED_ENERGY: useEnergyTarget(creep, creep.memory.currentTarget); creep.memory.currentTarget = null; break;
            default: console.log("Canceled ", creep.memory.currentTarget.type); creep.memory.currentTarget = null;
    }
    }
}
