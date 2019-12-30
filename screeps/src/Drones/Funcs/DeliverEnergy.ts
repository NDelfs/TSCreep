import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";
import { PrettyPrintErr, PrettyPrintCreep } from "../../utils/PrettyPrintErr";
import * as C from "Types/Constants";
import { getSourceTarget, getFromStoreTarget } from "Drones/Funcs/DroppedEnergy";
import { PM } from "PishiMaster";

export function resetDeliverTarget(creep: Creep) {
  let target = creep.getTarget();
  if (target && targetT.RequiresEnergy.includes(target.type) && creep.carry.energy == 0) {
    creep.completeTarget();
    creep.say("reset");
  }
}

function getClosest(roomPos: RoomPosition, iTargets: targetData[]): targetData {
  let index: number = 0;
  let minDist = 100;
  for (let i = 0; i < iTargets.length; i++) {
    let target = iTargets[i];
    let newD = roomPos.getRangeTo(target.pos.x, target.pos.y);
    if (newD < minDist) {
      minDist = newD;
      index = i;
    }
  }
  return iTargets.splice(index, 1)[0];
}
function getMatchingSource(creep: Creep, target: targetData, alreadyresourceType: ResourceConstant | null | undefined): targetData[] {
  if (alreadyresourceType != null)//already have res
    return [target];
  let sourceT = getSourceTarget(creep, target.resType!);
  if (sourceT == null)
    sourceT = getFromStoreTarget(creep, target.resType!);
  if (sourceT) {
    return [sourceT, target];
  }
  return [];
}

export function getNewDeliverTarget(creep: Creep, resourceType?: ResourceConstant | null): targetData[] {
  let roomPos: RoomPosition = creep.pos;
  let colony = PM.colonies[roomPos.roomName];
  if ((resourceType == null || resourceType == RESOURCE_ENERGY) && colony.energyNeedStruct.length && colony.spawnEnergyNeed > 0) {
    //if (roomPos.roomName == "E47N45")
    //console.log(roomPos.roomName, "found energy demand", colony.energyNeedStruct.length, colony.spawnEnergyNeed);
    let target = getClosest(roomPos, colony.energyNeedStruct);
    let targets = getMatchingSource(creep, target, resourceType);
    return targets;
    //PM.colonies[creep.memory.creationRoom].addEnergyTran(creep);
  }
  //if (roomPos.roomName == "E49N47")
  //console.log("looking for resource reg")

  for (let [id, reqs] of Object.entries(colony.resourceHandler._resourceRequests)) {
    for (let req of reqs) {
      if (resourceType == null || req.resource == resourceType) {
        let obj = Game.getObjectById(id) as AnyStoreStructure;
        //if (roomPos.roomName == "E49N47")
        //console.log("found resource reg", req.resource, obj, req.amount(), "amount in transport", req.resOnWay);
        let haveRes = (colony.room.storage && colony.room.storage.store[req.resource!] != 0) || (colony.room.terminal && colony.room.terminal.store[req.resource!] != 0);
        if (obj && haveRes && req.amount() < req.ThreshouldAmount) {
          //if (roomPos.roomName == "E49N47")
          //console.log(roomPos.roomName, obj.structureType, "used new target (amound, store, onWay, Threshold)", req.amount(), obj.store[req.resource], req.resOnWay, req.ThreshouldAmount);
          let target: targetData = { ID: id, type: targetT.TRANSPORT, pos: obj.pos, range: 1, resType: req.resource };
          let targets = getMatchingSource(creep, target, resourceType);
          if (targets.length > 0)
            return targets;
          //req.addTran(creep);
        }
      }
    }
  }


  //if (roomPos.roomName == "E49N47")
  //console.log("failed to find resource req")
  return [];
}

export function getStorageDeliverTarget(room: Room, resourceType: ResourceConstant): targetData | null {
  //base dump mineral
  if (resourceType != RESOURCE_ENERGY && room.terminal) {
    return { ID: room.terminal.id, type: targetT.POWERSTORAGE, resType: resourceType, pos: room.terminal.pos, range: 1 };
  }
  //base dump energy
  if (room.storage) {
    let colony = PM.colonies[room.name];
    if (colony.nuker && room.storage.store.energy > 1e5 && colony.nuker.store.energy < 3e5) {
      console.log(colony.name, "transport to nuker");
      return { ID: colony.nuker.id, type: targetT.POWERSTORAGE, resType: resourceType, pos: colony.nuker.pos, range: 1 };
    }
    else
      return { ID: room.storage.id, type: targetT.POWERSTORAGE, resType: resourceType, pos: room.storage.pos, range: 1 };
  }

  return null;
}

//export function getDeliverTarget(creep: Creep, findStore: boolean): boolean {//depricadet
//  let room = Game.rooms[creep.memory.creationRoom];
//  let colony = PM.colonies[creep.memory.creationRoom];
//    //first prio colony energy

//    //if (room.name == "E49N47")
//        //console.log("in get deliver")

//  if (colony.energyNeedStruct.length && colony.spawnEnergyNeed > 0 && creep.carry.energy > 0) {
//        //if (room.name == "E49N47")
//            //console.log(room.name, "found energy demand", PM.colonies[creep.memory.creationRoom].energyNeedStruct.length, PM.colonies[creep.memory.creationRoom].spawnEnergyNeed);
//    creep.addTargetT(getClosest(creep.pos, colony.energyNeedStruct));
//        PM.colonies[creep.memory.creationRoom].addEnergyTran(creep);
//        return true;
//    }
//    else {
//        //if (room.name == "E49N47")
//            //console.log("looking for resource reg")
//    for (let [id, req] of Object.entries(colony.resourceRequests)) {
//            if (creep.carry[req.resource] > 0) {
//                let obj = Game.getObjectById(id) as AnyStoreStructure;
//                //if (room.name == "E49N47")
//                    //console.log("found resource reg", req.resource, obj, req.amount(), "amount in transport", req.resOnWay);
//                if (obj && obj.store[req.resource] + req.resOnWay < req.ThreshouldAmount) {
//                    //if (room.name == "E49N47")
//                      //console.log(creep.room.name, obj.structureType, "used new target (store, onWay, Threshold)", obj.store[req.resource], req.resOnWay, req.ThreshouldAmount);
//                    creep.addTarget(id, targetT.TRANSPORT, obj.pos, 1);
//                    req.addTran(creep);
//                    return true;
//                }
//            }
//        }
//        //if (room.name == "E49N47")
//            //console.log("failed to find resource req")
//        //base dump mineral
//        if (findStore && creep.carry.energy == 0 && room.terminal && creep.carryAmount > 0) {
//            creep.addTarget(room.terminal.id, targetT.POWERSTORAGE, room.terminal.pos, 1);
//            return true;
//        }
//        //base dump energy
//    if (findStore && room.storage) {
//      if (colony.nuker && room.storage.store.energy > 1e5 && colony.nuker.store.energy < 3e5) {
//        creep.addTarget(colony.nuker.id, targetT.POWERSTORAGE, colony.nuker.pos, 1);
//        console.log(colony.name, "transport to nuker");
//        return true;
//      }
//      else {
//        creep.addTarget(room.storage.id, targetT.POWERSTORAGE, room.storage.pos, 1);
//        return true;
//      }
//    }
//    }
//    return false;
//}

function getCloseDeliverTarget(creep: Creep): void {
  //let room = Game.rooms[creep.memory.creationRoom];
  //let structs = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
  //    filter: function (str) {
  //        return (str.structureType == STRUCTURE_EXTENSION ||
  //            str.structureType == STRUCTURE_SPAWN || str.structureType == STRUCTURE_TOWER) &&
  //            str.energy < str.energyCapacity;
  //    }
  //});
  //else {
  if (PM.colonies[creep.memory.creationRoom].energyNeedStruct.length > 0) {
    creep.addTargetT(getClosest(creep.pos, PM.colonies[creep.memory.creationRoom].energyNeedStruct));
  }
  // }

}


export function useDeliverTarget(creep: Creep): number {
  let target = creep.getTarget()!;

  let targetObj = Game.getObjectById(target.ID) as AnyStoreStructure | null;
  let err: number = ERR_NOT_FOUND;
  //if (creep.room.name == "E49N47" && targetObj)
  //console.log("in use deliver", creep.memory.targetQue.length, targetObj!.pos.x, targetObj!.pos.y)
  if (targetObj) {
    let key = _.findKey(creep.carry) as ResourceConstant;
    if (key)
      err = creep.transfer(targetObj, key);
    //if (creep.room.name == "E49N47")
    //console.log("transfered", PrettyPrintErr(err), targetObj, targetObj.pos.x, targetObj.pos.y)
    if (err == OK && target.type == targetT.TRANSPORT) {
      PM.colonies[creep.memory.creationRoom].resourceHandler.removeTranReq(targetObj.id, target.resType!, creep);
    }
    else {
      if (err == ERR_FULL || err == OK) {
        creep.completeTarget();
        if (creep.carry.energy >= 50 && target.type == targetT.POWERUSER) {
          getCloseDeliverTarget(creep);
          return OK;
        }
        PM.colonies[creep.memory.creationRoom].removeEnergyTran(creep);
        err = OK;
      }
    }
  }

  creep.completeTarget();
  //if (creep.room.name == "E49N47")
  //console.log("should delete", creep.memory.targetQue.length)
  return err;
}
