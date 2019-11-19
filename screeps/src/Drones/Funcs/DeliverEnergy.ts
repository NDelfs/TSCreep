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

    if (creep.carry.energy == 0 && room.terminal && creep.carryAmount > 0) {
        creep.currentTarget = {
            ID: room.terminal.id, type: targetT.POWERSTORAGE, pos: room.terminal.pos, range: 1
        }
        return true;
    }

    if (PM.colonies[creep.memory.creationRoom].energyNeedStruct.length && PM.colonies[creep.memory.creationRoom].spawnEnergyNeed > 0 && creep.carry.energy > 0) {
        creep.currentTarget = getClosest(creep, PM.colonies[creep.memory.creationRoom].energyNeedStruct);
        //room.memory.EnergyNeed -= creep.carry[RESOURCE_ENERGY];
    }
    else {
        if (room.memory.controllerStoreID && room.controllerStoreDef > C.Controler_AllowedDef && creep.carry.energy > 0) {
            let store: StructureContainer | null = Game.getObjectById(room.memory.controllerStoreID);
            if (store) {
                creep.currentTarget = {
                    ID: store.id, type: targetT.POWERSTORAGE, pos: store.pos, range: 1
                }
                room.controllerStoreDef -= creep.carry.energy;
            }
        }
        else if (findStore) {
            if (room.terminal && room.terminal.store.energy < C.TERMINAL_STORE && room.storage && room.storage.store.energy > C.TERMINAL_MIN_STORAGE)
                creep.currentTarget = { ID: room.terminal.id, type: targetT.POWERSTORAGE, pos: room.terminal.pos, range: 1 };
            else if (room.storage) {
                creep.currentTarget = {
                    ID: room.storage.id, type: targetT.POWERSTORAGE, pos: room.storage.pos, range: 1
                }
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
    let targetObj = Game.getObjectById(creep.currentTarget!.ID) as StructureStorage | StructureContainer | null;
    let err: number = ERR_NOT_FOUND;
    if (targetObj) {
        let key = _.findKey(creep.carry) as ResourceConstant;
        //creep.say(key);
        if (key)
            err = creep.transfer(targetObj, key);
        if (err == ERR_FULL || err == OK) {
            if (creep.carry.energy >= 50 && creep.currentTarget!.type == targetT.POWERUSER) {
                creep.currentTarget = getCloseDeliverTarget(creep);
                return OK;
            }
            err = OK;
        }
    }
    creep.currentTarget = null;
    return err;
}
