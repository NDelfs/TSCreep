import * as targetT from "Types/TargetTypes";
import { restorePos, storePos } from "utils/posHelpers";
import { PrettyPrintErr } from "../../utils/PrettyPrintErr";
import { PM } from "PishiMaster";
import { DROPPED_RESOURCE, STORAGE_RESOURCE } from "Types/TargetTypes";
import { getRandomInt } from "../../utils/minorUtils";


export function getSourceTarget(creep: Creep, resource: ResourceConstant | null): targetData | null {
  let avail: string[] = [];
  try {
    if (resource == null || resource == RESOURCE_ENERGY) {
      for (let ID of PM.colonies[creep.creationRoom].memory.sourcesUsed) {
        let sourceMem: SourceMemory = Memory.Resources[ID];
        if (sourceMem.AvailResource > creep.carryCapacity * 0.8) {
          avail.push(ID);
        }
      }
      //if (creep.room.name == "E47N45") {
      //  console.log('in getSourceTarget, found avail', avail.length);
      //}
      if (avail.length > 0) {
        const index = getRandomInt(avail.length);
        let target: targetData = {
          ID: avail[index], type: targetT.DROPPED_RESOURCE, resType: RESOURCE_ENERGY, pos: Memory.Resources[avail[index]].workPos, range: 1
        }
        return target;
      }
    }

    for (let ID of PM.colonies[creep.creationRoom].memory.mineralsUsed) {
      let min = Memory.Resources[ID];

      if (min.AvailResource > creep.carryCapacity && (min.resourceType == resource || resource == null)) {
        let target: targetData = {
          ID: ID, type: targetT.DROPPED_RESOURCE, resType: min.resourceType, pos: min.workPos, range: 1
        }
        //console.log(creep.room, "transport mineral");
        return target;
      }
    }

    let resHandler = PM.colonies[creep.creationRoom].resourceHandler;
    for (let pushID in resHandler.resourcePush) {
      let resD = resHandler.resourcePush[pushID];
      let targetObj = Game.getObjectById(pushID) as AnyStoreStructure;
      if (targetObj) {
        //if (creep.room.name == "E49N47")
        //    console.log(creep.room.name, targetObj.structureType, "found resource push (store, onWay, amount, Threshold, max)", targetObj.store[resD.resource], resD.resOnWay, resD.amount(), resD.ThreshouldAmount, resD.ThreshouldHard);
        if ((resource == null || resD.resource == resource) && resD.amount() >= resD.ThreshouldAmount) {

          let target: targetData = {
            ID: pushID, type: targetT.TRANSPORT_PICKUP, resType: resD.resource, pos: targetObj.pos, range: 1
          }
          //console.log(colony.name, "new push target", resD.amount(), resD.resOnWay, resD.resource);
          return target;
        }
      }
    }
  }
  catch (e) {
    console.log("find dropped failed", e);
  }
  return null;
}

export function getFromStoreTarget(creep: Creep, resource: ResourceConstant, iAmount?: number): targetData | null {
  let amount = creep.carryCapacity;
  if (iAmount) {
    amount = Math.min(amount, iAmount);
  }
  let room = Game.rooms[creep.memory.creationRoom];
  if (room.storage && (room.storage.store[resource] >= amount || !room.storage.my)) {
    return { ID: room.storage.id, type: targetT.STORAGE_RESOURCE, resType: resource, pos: room.storage.pos, range: 1 }
  }
  else if (room.terminal && (room.terminal.store[resource] >= amount || !room.terminal.my)) {
    return { ID: room.terminal.id, type: targetT.STORAGE_RESOURCE, resType: resource, pos: room.terminal.pos, range: 1 }
  }
  return null;
}

function structWithdraw(creep: Creep, struct: AnyStoreStructure, resType: ResourceConstant, freeSpace: number): number {
  let amount = struct.store[resType] || 0;
  amount = Math.min(freeSpace, amount);
  let retErr = creep.withdraw(struct, resType, amount);//required to handle droped and container
  if (retErr == OK)
    freeSpace -= amount;
  else
    console.log(creep.room.name, creep.memory.type, "A creep failed to pickup from store", PrettyPrintErr(retErr));
  return retErr;
}

export function useEnergyTarget(creep: Creep, target: targetData): number {
  let retErr: number = ERR_NOT_FOUND;
  let freeSpace = creep.carryCapacity - creep.carryAmount;
  if (target.type == DROPPED_RESOURCE || target.type == STORAGE_RESOURCE) {
    const workPos = restorePos(target.pos);
    let res = workPos.lookFor(LOOK_RESOURCES);
    if (res.length > 0) {
      retErr = creep.pickup(res[0]);
      if (retErr == OK)
        freeSpace -= res[0].amount;
      else
        console.log(creep.room.name, "A creep failed to pickup dropped resource", PrettyPrintErr(retErr));
    }
    if (freeSpace > 0) {
      let structs = workPos.lookFor(LOOK_STRUCTURES);//id can be stored in resource, then below code can be used instead
      for (let struct of structs) {
        if (struct.structureType != STRUCTURE_ROAD) {
          let storageObj = struct as AnyStoreStructure;
          structWithdraw(creep, storageObj, target.resType!, freeSpace);
        }
      }
    }
  }
  else {
    let resHandler = PM.colonies[creep.memory.creationRoom].resourceHandler;
    let req = resHandler.resourcePush[target.ID];
    if (req) {
      let storageObj = Game.getObjectById(target.ID) as AnyStoreStructure;
      structWithdraw(creep, storageObj, target.resType!, freeSpace);
      if (storageObj.store[target.resType!] - freeSpace <= req.ThreshouldHard) {
        delete resHandler.resourcePush[target.ID];
        //console.log("push request deleted");
      }
      else {
        resHandler.resourcePush[target.ID].removeTran(creep, freeSpace);
        // console.log("push request one transport less");
      }
    }
    else
      console.log("request could not be found when withdrawing resources");
  }
  //reuse target if two times do not work in same action
  creep.completeTarget();
  return retErr;
}

export function getMineralTarget(creep: Creep): targetData | null {// depricated
  for (let ID of PM.colonies[creep.creationRoom].memory.mineralsUsed) {
    let min = Memory.Resources[ID];
    if (min.AvailResource > creep.carryCapacity) {
      let target: targetData = {
        ID: ID, type: targetT.DROPPED_RESOURCE, pos: min.workPos, range: 1
      }
      return target;
    }
  }

  return null;
}
