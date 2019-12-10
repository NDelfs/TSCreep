import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { resetDeliverTarget, useDeliverTarget } from "Drones/Funcs/DeliverEnergy";
import { getBuildTarget, useBuildTarget, getRepairTarget, useRepairTarget } from "Drones/Funcs/Build";
import * as targetT from "Types/TargetTypes";
import { getSourceTarget, useEnergyTarget, getFromStoreTarget } from "Drones/Funcs/DroppedEnergy";

export function Builder(creep: Creep) {
    resetDeliverTarget(creep);
    if (creep.room.name, creep.getTarget() == null && creep.carry.energy > 50) {
        if (!getRepairTarget(creep)) {
            getBuildTarget(creep);
        }
    }
    else if (creep.getTarget() == null && Game.rooms[creep.memory.creationRoom].availEnergy > 2000) {//get closest energy
        let target1 = getSourceTarget(creep, RESOURCE_ENERGY);
        let target2 = getFromStoreTarget(creep, RESOURCE_ENERGY);
       
        if (target1 && target2) {
            let range1 = creep.pos.getRangeTo(target1.pos.x, target1.pos.y);
            let range2 = creep.pos.getRangeTo(target2.pos.x, target2.pos.y);
            if (range1 < range2) {
                creep.addTargetT(target1);
                Memory.Resources[target1.ID].AvailResource -= creep.carryCapacity;
            }
            else {
                creep.addTargetT(target2);
            }
        }
        else if (target1) {
            creep.addTargetT(target1);
            Memory.Resources[target1.ID].AvailResource -= creep.carryCapacity;
        }
        else if (target2) {
            creep.addTargetT(target2);
        }
    }
    let inPlace = creep.inPlace;
    //repair roads
    if (!inPlace && creep.carry.energy > 0) {
        let road = creep.pos.lookFor(LOOK_STRUCTURES);
        if (road.length > 0 && road[0].hits < road[0].hitsMax) {
            let err = creep.repair(road[0]);
            if (err == OK)
                creep.say("repaired");
        }
        let roadCon = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (roadCon.length > 0) {
            const err = creep.build(roadCon[0]);
            if (err == OK)
                creep.say("built");
        }
    }


    let target = creep.getTarget();
    if (target && inPlace) {
        switch (target.type) {
            case targetT.CONSTRUCTION:
                useBuildTarget(creep);
                break;
            case targetT.REPAIR: {
                useRepairTarget(creep);
                break;
            }
            case targetT.STORAGE_RESOURCE:
            case targetT.DROPPED_RESOURCE:
                useEnergyTarget(creep, target);
                creep.say("withdraw");
                break;
            default: {
                let type = target.type;
                creep.completeTarget();
                throw ("The target type is not handled " + type);
            }
        }
    }
}
