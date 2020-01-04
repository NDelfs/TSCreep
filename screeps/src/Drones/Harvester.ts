import * as targetT from "Types/TargetTypes";
import { PM } from "PishiMaster";
import { Colony } from "Colony"
import { sendEnergy } from "Base/LinkOperation"
import { updateSource } from "../utils/DataUpdate";
import { resourceRequest } from "../Base/ResourceHandler";

export function Harvester(creep: Creep): void {
  //if (creep.room.name == "E48N47")
  //console.log("in place ", creep.inPlace, creep.currentTarget)
  let target = creep.getTarget();
  if (creep.inPlace && target) {
    let source = Game.getObjectById(target.ID) as Source | Mineral;
    if (source.memory.resourceType == RESOURCE_ENERGY)
      mineSource(creep, source as Source);
    else
      mineMineral(creep, source as Mineral);
  }
}

function mineMineral(creep: Creep, res: Mineral) {
  let extractor: StructureExtractor| null = null;
  if (res.memory.linkID == null) {//abuse code because we do not find it anywhere else
    let extractors = res.pos.lookFor(LOOK_STRUCTURES) as StructureExtractor[];
    if (extractors.length > 0) {
      extractor = extractors[0];
      res.memory.linkID = extractor.id;
    }
  }
  else
    extractor = Game.getObjectById(res.memory.linkID);

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
  if (creep.carryCapacity != 0 && amount > creep.carryCapacity * 0.8) {
    if (res.memory.linkID) {
      let link = Game.getObjectById(res.memory.linkID) as StructureLink;
      if (link.energy < link.energyCapacity) {
        amount = amount - (link.energyCapacity - link.energy);
        creep.transfer(link, RESOURCE_ENERGY);
      }
      let col = PM.colonies[creep.memory.creationRoom];
      sendEnergy(col, link);    
    }
    if (amount > creep.carryCapacity * 0.8) {
      creep.drop(RESOURCE_ENERGY, amount);
      updateSource(res);
    }
  }
}
