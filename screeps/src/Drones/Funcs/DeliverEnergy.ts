import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";
import { PrettyPrintErr } from "../../utils/PrettyPrintErr";

export function resetDeliverTarget(creep: Creep) {
    if (creep.memory.currentTarget && targetT.RequiresEnergy.includes(creep.memory.currentTarget.type) && creep.carry.energy == 0) {
        creep.memory.currentTarget = null;
        creep.say("reset");
    }
}

export function getDeliverTarget(creep: Creep, findStore: boolean): targetData | null {
    let retT : targetData | null = null;
    let room = Game.rooms[creep.memory.creationRoom];
    let availBuild = room.memory.EnergyNeedStruct;


    if (availBuild.length > 0 && room.memory.EnergyNeed >0) {
        let closest = availBuild[0];
        let dist = creep.pos.getRangeTo(closest.pos.x, closest.pos.y)
        for (let building of availBuild) {
            let tmpD = creep.pos.getRangeTo(building.pos.x, building.pos.y);
            if (tmpD < dist) {
                closest = building;
                dist = tmpD;
            }
        }
        retT = closest;
        room.memory.EnergyNeed -= creep.carry[RESOURCE_ENERGY];
    }
    else {
        if (room.memory.controllerStoreID && room.memory.controllerStoreDef > 0) {
            let store: StructureContainer | null = Game.getObjectById(room.memory.controllerStoreID);
            if (store) {
                retT = {
                    ID: store.id, type: targetT.POWERSTORAGE, pos: store.pos, range: 1
                }
                room.memory.controllerStoreDef -= creep.carry.energy;
            }
        }
        else if (findStore) {
            if (room.storage) {
                retT = {
                    ID: room.storage.id, type: targetT.POWERSTORAGE, pos: room.storage.pos, range: 1
                }
            }
        }
    }
    return retT;
}

function getCloseDeliverTarget(creep: Creep): targetData | null {
    let retT: targetData | null = null;
    let room = Game.rooms[creep.memory.creationRoom];
    let structs = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
        filter: function (str) {
            return (str.structureType == STRUCTURE_EXTENSION ||
                str.structureType == STRUCTURE_SPAWN || str.structureType == STRUCTURE_TOWER) &&
                str.energy < str.energyCapacity;
        }
    });
    if (structs.length > 0) {
        retT = {
            ID: structs[0].id, type: targetT.POWERUSER, pos: structs[0].pos, range: 1
        }
    }
    return retT;
}


export function useDeliverTarget(creep: Creep, target: targetData): number {
    let targetObj: Structure | null = Game.getObjectById(target.ID);
    let err: number = ERR_NOT_FOUND;
    if (targetObj) {
        err = creep.transfer(targetObj, RESOURCE_ENERGY);
        if (err == ERR_FULL || err == OK) {
            if (creep.carry.energy >= 50 && target.type == targetT.POWERUSER) {
                creep.memory.currentTarget = getCloseDeliverTarget(creep);
            }
            err = OK;
        }
    }
    creep.memory.currentTarget = null;
    return err;
}
