import { goToTarget } from "Drones/Funcs/Walk";
import { getEnergyTarget, useEnergyTarget, getMineralTarget } from "Drones/Funcs/DroppedEnergy";
import { getDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import * as targetT from "Types/TargetTypes";

function claimResource(creep: Creep) {
    if (creep.memory.currentTarget) {
        Memory.Resources[creep.memory.currentTarget.ID].AvailResource -= creep.carryCapacity;
        creep.say("Go to source");
    }
    
}

export function Transporter(creep: Creep) {
    if (creep.carryAmount == 0 && creep.memory.currentTarget == null) {
        creep.memory.currentTarget = getEnergyTarget(creep);
        if (creep.memory.currentTarget)
            claimResource(creep);
        else if(creep.room.storage && creep.room.memory.EnergyNeed > 0) {
            creep.memory.currentTarget = {
                ID: creep.room.storage.id, type: targetT.DROPPED_ENERGY, pos: creep.room.storage.pos, range: 1
            }
        }
        if (creep.memory.currentTarget == null) {
            creep.memory.currentTarget = getMineralTarget(creep);
            claimResource(creep);
        }
    }
    else if (creep.memory.currentTarget == null) {
        let targ = getDeliverTarget(creep, true);
        if(targ)
          creep.memory.currentTarget = targ;
    }
    

    if (creep.memory.currentTarget == null)
        creep.say("zZzZ")

    if (creep.memory.currentTarget && goToTarget(creep)) {
        switch (creep.memory.currentTarget.type) {
            case targetT.POWERSTORAGE:
            case targetT.POWERUSER: useDeliverTarget(creep, creep.memory.currentTarget); break;
            case targetT.DROPPED_MINERAL:
            case targetT.DROPPED_ENERGY: useEnergyTarget(creep, creep.memory.currentTarget); creep.memory.currentTarget = null; break;
            default: console.log("Canceled ", creep.memory.currentTarget.type); creep.memory.currentTarget = null;
    }
    }
}
