import { PrettyPrintErr } from "utils/PrettyPrintErr";
import * as targetT from "Types/TargetTypes";
import { getSourceTarget, useEnergyTarget } from "./Funcs/PickupEnergy";
import { restorePos } from "../utils/posHelpers";
import { resetDeliverTarget, getNewDeliverTarget, useDeliverTarget } from "./Funcs/DeliverEnergy";
import { getBuildTarget, useBuildTarget, getRepairTarget, useRepairTarget } from "./Funcs/Build";
import { HARVESTER, STARTER, BUILDER } from "Types/CreepType";
import { getTransportTarget } from "./Transporter";
import { getRandomInt } from "../utils/minorUtils";

function printRes(creep: Creep, iErr: number, name: string): void {
  if (iErr == OK)
    creep.say("OK " + name);
  else
    creep.say(name + " " + PrettyPrintErr(iErr));
}

export function Starter(creep: Creep) {
  resetDeliverTarget(creep);

  //got no energy, find where
  if (creep.getTarget() == null && !creep.memory.moveTarget) {
    getTransportTarget(creep, false);
    if (creep.room.name == "E47N46")
      console.log("find transport target", creep.getTarget());
    if (creep.getTarget() == null && creep.store.energy > 0) {
      let controller = creep.room.controller;
      if (controller) {//if safe tick run external construction target getter, same used for builder
        if (controller.ticksToDowngrade > 5000) {
          getRepairTarget(creep);
          if (creep.room.name == "E47N46")
          console.log("find repair target", creep.getTarget());
          if (creep.getTarget() == null) {
            getBuildTarget(creep);
            if (creep.room.name == "E47N46")
            console.log("find build target", creep.getTarget());
          }
        }
        if (creep.getTarget() == null)
          creep.addTarget(controller.id, targetT.CONTROLLER, controller.pos, 3);

      }
    }
    if (creep.carry.energy == 0 && !creep.getTarget()) {
      let t = getSourceTarget(creep, RESOURCE_ENERGY);
      if(t)
        creep.addTargetT(t);
    }

    if (creep.getTarget() == null) {
      let sources = creep.room.find(FIND_SOURCES);
      for (let source of sources) {
        const harvesters = _.filter(creep.room.getCreeps(HARVESTER), function (creepF) { return creepF.getTarget() && creepF.getTarget()!.ID == source.id; });
        if (harvesters.length == 0) {
          const starters = _.filter(creep.room.getCreeps(STARTER), function (creepF) { return creepF.getTarget() && creepF.getTarget()!.ID == source.id; });
          if (starters.length < source.memory.maxUser && (source.energy > creep.carryCapacity * starters.length || source.ticksToRegeneration < 50)) {
            creep.addTarget(source.id, targetT.SOURCE, source.memory.workPos, 0);
            creep.say("go mining");
          }
        }
      }
    }
    if (creep.getTarget() == null) {
      console.log(creep.room.name,"Starter could not find a target");
      if (creep.room.controller!.level > 5 && creep.room.storage && creep.room.storage.store.energy > 10000) {
        console.log("starter converted to builder")
        creep.memory.type = BUILDER;
      }
      return;
    }
  }

  //repair roads
  if ((creep.room.controller == null || creep.room.controller.level < 3) && creep.carry.energy > 0) {
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
  ///////////////use the target///////////
  let target = creep.getTarget();
  if (target && creep.inPlace) {
    switch (target.type) {
      case targetT.STORAGE_RESOURCE:
      case targetT.DROPPED_RESOURCE:
      case targetT.TRANSPORT_PICKUP:{
        const err = useEnergyTarget(creep, target);
        printRes(creep, err, "transf");
        return;
      }
      case targetT.SOURCE: {
        //if (creep.memory.permTarget == null)
        //throw ("no permanent target on starter");
        let source: Source | null = Game.getObjectById(target.ID);
        if (source) {
          const err = creep.harvest(source);
          if (err == OK && creep.carry.energy == creep.carryCapacity)
            creep.completeTarget();
          else
            printRes(creep, err, "mine");
          //multi tic action so no reset per defauls
          return;
        }
        else
          creep.completeTarget();
        break;
      }
      case targetT.CONTROLLER: {
        if (creep.room.controller) {
          let err = creep.upgradeController(creep.room.controller);
          if (err == ERR_NOT_OWNER) {
            err = creep.claimController(creep.room.controller);
            if (err == ERR_NOT_IN_RANGE)
              creep.moveTo(creep.room.controller);

          }
          printRes(creep, err, "upgrade");
        }
        else
          creep.completeTarget();
        break;
      }
      case targetT.CONSTRUCTION: {
        let err = useBuildTarget(creep);
        printRes(creep, err, "build");
        break;
      }
      case targetT.REPAIR: {
        let err = useRepairTarget(creep);
        printRes(creep, err, "rep");
        break;
      }
      case targetT.POWERSTORAGE:
      case targetT.TRANSPORT:
      case targetT.POWERUSER: {
        const err = useDeliverTarget(creep);
        printRes(creep, err, "transf");
        break;
      }
      default: {
        let type = target.type;
        creep.completeTarget();
        throw ("The target type is not handled " + type);
      }
    }
  }
}

