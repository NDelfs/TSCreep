import * as targetT from "Types/TargetTypes";
import { PM } from "PishiMaster";
import { Colony } from "Colony"
import { sendEnergy } from "Base/LinkOperation"
import { resourceRequest } from "Base/Handlers/ResourceHandler";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { PrettyPrintErr } from "../utils/PrettyPrintErr";


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
    creep.harvest(res);//should att to not harvest if full inventory.
    creep.say("Mine");
    if (res.memory.container) {
      if (creep.carry[res.memory.resourceType] >= creep.carryCapacity - creep.memory.targetQue[0].targetVal!) {
        creep.drop(res.memory.resourceType);
        let cont = Game.getObjectById(res.memory.container!) as StructureContainer;
        let colony = PM.colonies[creep.memory.creationRoom];
        if (cont) {
          
          //below is code for requesting resource pickup
          if (cont.store[res.memory.resourceType] >= 800) {//this could use transfer 2, 
            if (!colony.resourceHandler.resourcePush[cont.id]) {
              colony.resourceHandler.resourcePush[cont.id] = new resourceRequest(cont.id, res.memory.resourceType, 800, 400, cont.room);
              console.log("requested mineral pickup from", JSON.stringify(cont.pos));
            }
          }
          else if (cont.store[RESOURCE_ENERGY] != 0 && !colony.resourceHandler.resourcePush[cont.id]) {
            colony.resourceHandler.resourcePush[cont.id] = new resourceRequest(cont.id, RESOURCE_ENERGY, 0, 0, cont.room);
            console.log("requested special pickup from", JSON.stringify(cont.pos));
          }
        }
        else {
          console.log(colony.name, "Could not find mineral container, reseting");
          res.memory.container = null;
        }
      }
    }
    
  }
  else
    console.log(creep.room.name, "Failed to find extractor");
}

function transfer2(creep: Creep, memory: any, memID: string) {
  try {
    if (memory[memID]) {
      let resT = memory.resourceType as ResourceConstant;
      let cont = Game.getObjectById(memory[memID]) as AnyStoreStructure;
      if (cont) {
        let err = creep.drop(resT);
        if (err == OK) {//if its full we will drop instead     
          //below is code for requesting resource pickup
          if (cont.store[resT] >= 1000) {
            let colony = PM.colonies[creep.memory.creationRoom];
            if (!colony.resourceHandler.resourcePush[cont.id]) {
              colony.resourceHandler.resourcePush[cont.id] = new resourceRequest(cont.id, resT, 800, 400, cont.room);
              console.log("requested energy pickup from", memID, JSON.stringify(cont.pos));
            }
          }
          return true;
        }
        console.log(JSON.stringify(creep.pos), "harvester failed transfer due to", PrettyPrintErr(err));
      }
      else {
        memory[memID] = null;
      }
    }
  }
  catch (e) {
    console.log(JSON.stringify(creep.pos),"transfer2 failed", memID, e);
  }
  return false;
}

function drop(creep: Creep, memory: any, memID: string) {
  try {
    if (memory[memID]) {
      let resT = memory.resourceType as ResourceConstant;
      let cont = Game.getObjectById(memory[memID]) as Resource;
      if (cont) {
        let err = creep.drop(resT);
        if (err == OK) {//if its full we will drop instead     
          //below is code for requesting resource pickup
          if (cont.amount >= 1000) {
            let colony = PM.colonies[creep.memory.creationRoom];
            if (!colony.resourceHandler.resourcePush[cont.id]) {
              colony.resourceHandler.resourcePush[cont.id] = new resourceRequest(cont.id, resT, 200, 0, creep.room,true);
              console.log("requested energy pickup from", memID, JSON.stringify(cont.pos));
            }
          }
          return true;
        }
        console.log(JSON.stringify(creep.pos), "harvester failed transfer due to", PrettyPrintErr(err));
      }
      else {
        memory[memID] = null;
      }
    }
  }
  catch (e) {
    console.log(JSON.stringify(creep.pos), "transfer2 failed", memID, e);
  }
  return false;
}

function mineSource(creep: Creep, res: Source) {
  creep.harvest(res);
  creep.say("Mine");
  let amount = creep.carryAmount;
  if (creep.carryCapacity != 0 && amount >= creep.carryCapacity * 0.6) {
   
    if (res.memory.linkID) {
      let link = Game.getObjectById(res.memory.linkID) as StructureLink;
      if (!link) {
        console.log("didnt find link", JSON.stringify(creep.pos))
      }
      if (link.energy < link.energyCapacity) {
        amount = amount - (link.energyCapacity - link.energy);
        creep.transfer(link, RESOURCE_ENERGY);
      }
      let col = PM.colonies[creep.memory.creationRoom];
      sendEnergy(col, link);
    }
    if (amount >= creep.carryCapacity - 10) {//current does not get added yet
      if (!transfer2(creep, res.memory, "container")) {
        if (!drop(creep, res.memory, "lastDropID")) {
          creep.drop(res.memory.resourceType);
          let dropedRes = creep.pos.lookFor("resource");
          if (dropedRes.length > 0) {
            res.memory.lastDropID = dropedRes[0].id;
            console.log("found new dropped resource at", JSON.stringify(res.pos));
          }
        }
      }
    }
  }
}
