import * as targetT from "Types/TargetTypes";
import { PM } from "PishiMaster";
import { Colony } from "Colony"
import { sendEnergy } from "Base/LinkOperation"
import { updateSource } from "../utils/DataUpdate";
import { resourceRequest } from "Base/Handlers/ResourceHandler";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";


export function Harvester(creep: Creep): void {
  //if (creep.room.name == "E48N47")
  //console.log("in place ", creep.inPlace, creep.currentTarget)
  let target = creep.getTarget();
  if (creep.inPlace && target) {
    let source = Game.getObjectById(target.ID) as Source | Mineral;
    if (source.memory.resourceType == RESOURCE_ENERGY)
      profiler.registerFN(mineSource)(creep, source as Source);
    else
      profiler.registerFN(mineMineral)(creep, source as Mineral);
  }
}

function mineMineral(creep: Creep, res: Mineral) {
  if (!res.memory.linkID)
    return;

  let extractor = Game.getObjectById(res.memory.linkID) as StructureExtractor;
  if (extractor) {
    if (extractor.cooldown) {
      creep.say("Wait");
      return;
    }
    creep.harvest(res);
    let cont = Game.getObjectById(res.memory.container!) as StructureContainer;
    //below is code for requesting resource pickup
    let totAmount = _.sum(cont.store);
    if (totAmount > 800) {
      if (totAmount != cont.store[res.memory.resourceType]) {
        let colony = PM.colonies[creep.memory.creationRoom];
        for (let key in cont.store) {
          if (cont.store[key as ResourceConstant] > 0) {
            if (!colony.resourceHandler.resourcePush[cont.id]) {
              colony.resourceHandler.resourcePush[cont.id] = new resourceRequest(cont.id, RESOURCE_ENERGY, 0, 0, cont.room);
              console.log("requested special pickup from", JSON.stringify(cont.pos));
            }
          }
        }
      }
      updateSource(res);
    }
    creep.say("Mine");
  }
  else
    console.log(creep.room.name, "Failed to find extractor");
}

function mineSource(creep: Creep, res: Source) {
  creep.harvest(res);
  creep.say("Mine");
  let amount = creep.carryAmount;
  if (creep.carryCapacity != 0 && amount > creep.carryCapacity * 0.6) {
    if (res.memory.linkID) {
      let link = Game.getObjectById(res.memory.linkID) as StructureLink;
      if (link.energy < link.energyCapacity) {
        amount = amount - (link.energyCapacity - link.energy);
        creep.transfer(link, RESOURCE_ENERGY);
      }
      let col = PM.colonies[creep.memory.creationRoom];
      sendEnergy(col, link);
      updateSource(res);//just to be sure it get emptied. could be better with some checks, but the cpu price should be low enough
    }
    if (amount > creep.carryCapacity * 0.9) {
      creep.drop(RESOURCE_ENERGY, amount);
      updateSource(res);
    }
  }
  if (creep.carryCapacity == 0 && Game.time%10 == 0)
    updateSource(res);
}
