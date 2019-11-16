import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { resetDeliverTarget, useDeliverTarget } from "Drones/Funcs/DeliverEnergy";
import { getBuildTarget, useBuildTarget, getRepairTarget, useRepairTarget } from "Drones/Funcs/Build";
import * as targetT from "Types/TargetTypes";
import { getEnergyTarget, useEnergyTarget, getEnergyStoreTarget } from "Drones/Funcs/DroppedEnergy";

export function Builder(creep: Creep) {
    resetDeliverTarget(creep);
    if (creep.currentTarget == null && creep.carry.energy > 50) {
        getRepairTarget(creep);
        if (creep.currentTarget == null) {
            getBuildTarget(creep);
        }
    }
    else if (creep.currentTarget == null && Game.rooms[creep.memory.creationRoom].availEnergy > 2000) {//get closest energy
        let target1 = getEnergyTarget(creep);
        let target2 = getEnergyStoreTarget(creep);
       
        if (target1 && target2) {
            let range1 = creep.pos.getRangeTo(target1.pos.x, target1.pos.y);
            let range2 = creep.pos.getRangeTo(target2.pos.x, target2.pos.y);
            if (range1 < range2) {
                creep.setTargetData(target1);
                Memory.Resources[target1.ID].AvailResource -= creep.carryCapacity;
            }
            else {
                creep.setTargetData(target2);
            }
        }
        else if (target1) {
            creep.setTargetData(target1);
            Memory.Resources[target1.ID].AvailResource -= creep.carryCapacity;
        }
        else if (target2) {
            creep.setTargetData(target2);
        }
    }

    if (creep.currentTarget && creep.inPlace) {
        switch (creep.currentTarget.type) {
            case targetT.CONSTRUCTION:
                useBuildTarget(creep);
                break;
            case targetT.REPAIR: {
                useRepairTarget(creep);
                break;
            }
            case targetT.DROPPED_ENERGY:
                useEnergyTarget(creep, creep.currentTarget);
                creep.say("withdraw");
                break;
            default: {
                let type = creep.currentTarget.type;
                creep.currentTarget = null;
                throw ("The target type is not handled " + type);
            }
        }
    }
}
