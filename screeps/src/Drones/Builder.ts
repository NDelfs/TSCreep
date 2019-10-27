import { goToTarget } from "Drones/Funcs/Walk";
import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { resetDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import { getBuildTarget, useBuildTarget } from "./Funcs/Build";
import * as targetT from "Types/TargetTypes";
import { getEnergyTarget, useEnergyTarget } from "./Funcs/DroppedEnergy";

export function Builder(creep: Creep) {
    resetDeliverTarget(creep);
    if (creep.memory.currentTarget == null && creep.carry.energy > 50)
        getBuildTarget(creep);
    else if (creep.memory.currentTarget == null) {//get closest energy
        let target1 = getEnergyTarget(creep);
        let target2: targetData|null=null;
        let storages = creep.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_STORAGE } });
        if (storages.length > 0) {
            target2 = {
                ID: storages[0].id, type: targetT.DROPPED_ENERGY, pos: storages[0].pos, range: 1
            }
        }
        if (target1 && target2) {
            let range1 = creep.pos.getRangeTo(target1.pos.x, target1.pos.y);
            let range2 = creep.pos.getRangeTo(target2.pos.x, target2.pos.y);
            if (range1 < range2) {
                creep.memory.currentTarget = target1;
                Memory.Sources[creep.memory.currentTarget.ID].AvailEnergy -= creep.carryCapacity;
            }
            else
                creep.memory.currentTarget = target2;
        }
        else if (target1) {
            creep.memory.currentTarget = target1;
            Memory.Sources[creep.memory.currentTarget.ID].AvailEnergy -= creep.carryCapacity;
        }
        else if (target2) {
            creep.memory.currentTarget = target2;
        }
    }

    if (creep.memory.currentTarget && goToTarget(creep)) {
        switch (creep.memory.currentTarget.type) {
            case targetT.CONSTRUCTION:
                useBuildTarget(creep);
                break;
            case targetT.DROPPED_ENERGY:
                useEnergyTarget(creep, creep.memory.currentTarget);
                break;
            default: {
                let type = creep.memory.currentTarget.type;
                creep.memory.currentTarget = null;
                throw ("The target type is not handled " + type);
            }
        }
    }
}
