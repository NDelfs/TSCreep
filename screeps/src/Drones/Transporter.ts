import { getEnergyTarget, useEnergyTarget, getMineralTarget, getEnergyStoreTarget } from "Drones/Funcs/DroppedEnergy";
import { getDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import * as targetT from "Types/TargetTypes";
import { PM } from "PishiMaster";

function claimResource(creep: Creep) {
    if (creep.currentTarget) {
        Memory.Resources[creep.currentTarget.ID].AvailResource -= creep.carryCapacity;
        creep.say("Go to source");
    }
    
}

export function Transporter(creep: Creep) {
    let room = creep.room;
    if (creep.carryAmount == 0 && creep.currentTarget == null) {
        creep.currentTarget = getEnergyTarget(creep);
        if (creep.currentTarget)
            claimResource(creep);
        else if (PM.colonies[creep.memory.creationRoom].spawnEnergyNeed  > 0) { //so that we always fill up the energy need of a room
            creep.currentTarget = getEnergyStoreTarget(creep);
        }
       

        if (creep.currentTarget == null) {
            creep.currentTarget = getMineralTarget(creep);
            claimResource(creep);
        }
    }
    else if (creep.currentTarget == null) {
        let targ = getDeliverTarget(creep, true);
            //global[creep.memory.creationRoom].spawnEnergyNeed -= creep.carry.energy;
    }
    

    if (creep.currentTarget == null)
        creep.say("zZzZ")

    if (creep.currentTarget && creep.inPlace) {
        switch (creep.currentTarget.type) {
            case targetT.POWERSTORAGE:
            case targetT.POWERUSER: useDeliverTarget(creep); break;
            case targetT.DROPPED_MINERAL:
            case targetT.DROPPED_ENERGY: useEnergyTarget(creep, creep.currentTarget); break;
            default: console.log("Canceled ", creep.currentTarget.type); creep.currentTarget = null;
    }
    }
}
