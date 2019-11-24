import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";
import { PrettyPrintErr } from "../../utils/PrettyPrintErr";
import * as C from "Types/Constants"; 
import { PM } from "PishiMaster";

export function resetDeliverTarget(creep: Creep) {
    if (creep.currentTarget && targetT.RequiresEnergy.includes(creep.currentTarget.type) && creep.carry.energy == 0) {
        creep.currentTarget = null;
        creep.say("reset");
    }
}

function getClosest(creep: Creep, iTargets: targetData[]): targetData{
    let index: number = 0;
    let minDist = 100;
    for (let i=0; i < iTargets.length; i++) {
        let target = iTargets[i];
        let newD = creep.pos.getRangeTo(target.pos.x, target.pos.y);
        if (newD < minDist) {
            minDist = newD;
            index = i;
        }
    }
    return iTargets.splice(index, 1)[0];
}

export function getDeliverTarget(creep: Creep, findStore: boolean): boolean {
    let room = Game.rooms[creep.memory.creationRoom];
    //first prio colony energy
    if (PM.colonies[creep.memory.creationRoom].energyNeedStruct.length && PM.colonies[creep.memory.creationRoom].spawnEnergyNeed > 0 && creep.carry.energy > 0) {
        creep.currentTarget = getClosest(creep, PM.colonies[creep.memory.creationRoom].energyNeedStruct);
        PM.colonies[creep.memory.creationRoom].addEnergyTran(creep);
    }
    else {
        for (let [id, req] of Object.entries(PM.colonies[creep.memory.creationRoom].resourceRequests)) {
            if (creep.carry[req.resource] > 0) {
                let obj = Game.getObjectById(id) as AnyStoreStructure;
                if (obj.store[req.resource] + req.resOnWay < req.ThreshouldAmount) {
                    //console.log(creep.room.name, obj.structureType, "used new target (store, onWay, Threshold)", obj.store[req.resource], req.resOnWay, req.ThreshouldAmount);
                    creep.currentTarget = { ID: id, type: targetT.TRANSPORT, pos: obj.pos, range: 1 };
                    req.addTran(creep);
                    
                    return true;
                }
            }
        }

        //base dump mineral
        if (creep.carry.energy == 0 && room.terminal && creep.carryAmount > 0) {
            creep.currentTarget = {
                ID: room.terminal.id, type: targetT.POWERSTORAGE, pos: room.terminal.pos, range: 1
            }
            return true;
        }
        //base dump energy
        if (findStore && room.storage) {
            creep.currentTarget = {
                ID: room.storage.id, type: targetT.POWERSTORAGE, pos: room.storage.pos, range: 1
            }
        }
    }
    return creep.currentTarget!=null;
}

function getCloseDeliverTarget(creep: Creep): targetData | null {
    let retT: targetData | null = null;
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
        retT = getClosest(creep, PM.colonies[creep.memory.creationRoom].energyNeedStruct);
        }
   // }
    return retT;
}


export function useDeliverTarget(creep: Creep): number {
    let targetObj = Game.getObjectById(creep.currentTarget!.ID) as AnyStoreStructure | null;
    let err: number = ERR_NOT_FOUND;
    if (targetObj) {
        let key = _.findKey(creep.carry) as ResourceConstant;
        if (key)
            err = creep.transfer(targetObj, key);

        if (err == OK && creep.currentTarget!.type == targetT.TRANSPORT) {
            let req = PM.colonies[creep.memory.creationRoom].resourceRequests[targetObj.id];
            if (req.creeps.length == 1 && targetObj.store[req.resource] + req.resOnWay > req.ThreshouldMax) {
                //console.log(creep.room.name, targetObj.structureType, "deleted new target (store, onWay, Threshold, max)", targetObj.store[req.resource], req.resOnWay, req.ThreshouldAmount, req.ThreshouldMax);
                delete PM.colonies[creep.memory.creationRoom].resourceRequests[targetObj.id];
                
            }
            else {
                req.removeTran(creep);
                //console.log(creep.room.name, targetObj.structureType, "removed creep from new target");
            }
        }
        else {
            if (err == ERR_FULL || err == OK) {
                if (creep.carry.energy >= 50 && creep.currentTarget!.type == targetT.POWERUSER) {
                    creep.currentTarget = getCloseDeliverTarget(creep);
                    return OK;
                }
                PM.colonies[creep.memory.creationRoom].removeEnergyTran(creep);
                err = OK;
            }
        }
    }
    creep.currentTarget = null;
    return err;
}
