import { goToTarget } from "Drones/Funcs/Walk";
import { getEnergyTarget, useEnergyTarget, getMineralTarget, getEnergyStoreTarget } from "Drones/Funcs/DroppedEnergy";
import { getDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import * as targetT from "Types/TargetTypes";

function claimResource(creep: Creep) {
    if (creep.memory.currentTarget) {
        Memory.Resources[creep.memory.currentTarget.ID].AvailResource -= creep.carryCapacity;
        creep.say("Go to source");
    }
    
}

export function Transporter(creep: Creep) {
    let room = creep.room;
    if (creep.carryAmount == 0 && creep.memory.currentTarget == null) {
        creep.memory.currentTarget = getEnergyTarget(creep);
        if (creep.memory.currentTarget)
            claimResource(creep);
        else if (room.memory.EnergyNeed > 0) { //so that we always fill up the energy need of a room
            creep.memory.currentTarget = getEnergyStoreTarget(creep);
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

    if (creep.memory.currentTarget && creep.inPlace()) {
        switch (creep.memory.currentTarget.type) {
            case targetT.POWERSTORAGE:
            case targetT.POWERUSER: useDeliverTarget(creep, creep.memory.currentTarget); break;
            case targetT.DROPPED_MINERAL:
            case targetT.DROPPED_ENERGY: useEnergyTarget(creep, creep.memory.currentTarget); break;
            default: console.log("Canceled ", creep.memory.currentTarget.type); creep.memory.currentTarget = null;
    }
    }
}
