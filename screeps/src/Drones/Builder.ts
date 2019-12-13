import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { resetDeliverTarget, useDeliverTarget } from "Drones/Funcs/DeliverEnergy";
import { getBuildTarget, useBuildTarget, getRepairTarget, useRepairTarget } from "Drones/Funcs/Build";
import * as targetT from "Types/TargetTypes";
import { getSourceTarget, useEnergyTarget, getFromStoreTarget } from "Drones/Funcs/DroppedEnergy";
import { PM } from "PishiMaster";

export function Builder(creep: Creep) {
    //resetDeliverTarget(creep);
  let haveEnoughEnergy = creep.carry.energy > 50;
  if (creep.getTarget() == null) {
        if (!getRepairTarget(creep)) {
          getBuildTarget(creep);
          if (creep.getTarget() == null) {
            let colony = PM.colonies[creep.memory.creationRoom];
            while (colony.wallSites.length > 0 && creep.getTarget() == null) {
              let wall = Game.getObjectById(colony.wallSites[0].id) as Structure;
              if (wall.hits + 4e4 < colony.wallSites[0].newHits) {
                creep.addTarget(wall.id, targetT.REPAIR_WALL, wall.pos, 3);
                let target = creep.getTarget()!;
                target.targetVal = colony.wallSites[0].newHits;
                console.log(creep.room.name, "found a wall target, goal wall", target.targetVal, "at pos", target.pos.x, target.pos.y);
              }
              else {
                console.log(creep.room.name, "removed a wall from list", wall.hits, wall.hits + 4e4, colony.wallSites[0].newHits);
                colony.wallSites.shift();
                if (colony.wallSites.length == 0)
                  colony.computeWallList();
              }
            }

          }
        }
  }
  //if it has one target only that should mean that it has a build or repair target but not started to pick up energy
  if (creep.memory.targetQue.length == 1 && ((!haveEnoughEnergy && !creep.inPlace) || creep.carry.energy == 0)) {//get closest energy
        let target1 = getSourceTarget(creep, RESOURCE_ENERGY);
        let target2 = getFromStoreTarget(creep, RESOURCE_ENERGY);
       
        if (target1 && target2) {
            let range1 = creep.pos.getRangeTo(target1.pos.x, target1.pos.y);
            let range2 = creep.pos.getRangeTo(target2.pos.x, target2.pos.y);
          if (range1 < range2) {
                creep.addTargetFirst(target1);
                Memory.Resources[target1.ID].AvailResource -= creep.carryCapacity;
            }
          else {
                creep.addTargetFirst(target2);
            }
        }
        else if (target1) {
          creep.addTargetFirst(target1);
            Memory.Resources[target1.ID].AvailResource -= creep.carryCapacity;
        }
        else if (target2) {
            creep.addTargetFirst(target2);
    }
    }
    let inPlace = creep.inPlace;
    //repair roads
    if (!inPlace && creep.carry.energy > 0) {
        let road = creep.pos.lookFor(LOOK_STRUCTURES);
        if (road.length > 0 && road[0].hits + 400 < road[0].hitsMax) {
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
  if (target == null)
    console.log(creep.room.name,"builder have nothing to do")

    if (target && inPlace) {
        switch (target.type) {
            case targetT.CONSTRUCTION:
                useBuildTarget(creep);
            break;
          case targetT.REPAIR_WALL: {
            useRepairTarget(creep);
            PM.colonies[creep.memory.creationRoom].memory.wallEnergy -= creep.getActiveBodyparts(WORK);
            break;
          }
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
