import * as targetT from "Types/TargetTypes";
import { restorePos, storePos } from "utils/posHelpers";
import { PrettyPrintErr } from "../../utils/PrettyPrintErr";

function getRandomInt(max : number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getSourceTarget(creep: Creep, resource: ResourceConstant | null): targetData | null {
    let avail: string[] = [];
    if (resource == null || resource == RESOURCE_ENERGY) {
        for (let ID of Game.rooms[creep.creationRoom].memory.sourcesUsed) {
            let sourceMem: SourceMemory = Memory.Resources[ID];
            if (sourceMem.AvailResource > creep.carryCapacity * 0.8) {
                avail.push(ID);
            }
        }

        if (avail.length > 0) {
            const index = getRandomInt(avail.length);
            let target: targetData = {
                ID: avail[index], type: targetT.DROPPED_ENERGY, resType: RESOURCE_ENERGY, pos: Memory.Resources[avail[index]].workPos, range: 1
            }
            return target;
        }
    }
    else {// mineral search left then
        for (let ID of Game.rooms[creep.creationRoom].memory.mineralsUsed) {
            let min = Memory.Resources[ID];

            if (min.AvailResource > creep.carryCapacity && (min.resourceType == resource || resource == null)) {
                let target: targetData = {
                    ID: ID, type: targetT.DROPPED_MINERAL, resType: min.resourceType, pos: min.workPos, range: 1
                }
                return target;
            }
        }
    }
    return null;
}

export function getFromStoreTarget(creep: Creep, resource: ResourceConstant): targetData | null {
    let room = Game.rooms[creep.memory.creationRoom];
    if (room.storage && room.storage.store[resource] >= creep.carryCapacity) {
        return { ID: room.storage.id, type: targetT.DROPPED_ENERGY, resType: resource, pos: room.storage.pos, range: 1 }
    }
    else if (room.terminal && room.terminal.store[resource] >= creep.carryCapacity) {
        return { ID: room.terminal.id, type: targetT.DROPPED_ENERGY, resType: resource, pos: room.terminal.pos, range: 1 }
    }
    return null;
}

export function useEnergyTarget(creep: Creep, target: targetData): number {
    let retErr : number = ERR_NOT_FOUND;
    const workPos = restorePos(target.pos);
    let freeSpace = creep.carryCapacity- creep.carryAmount;
    let res = workPos.lookFor(LOOK_RESOURCES);
    if (res.length > 0 ) {
        retErr = creep.pickup(res[0]);
        if (retErr == OK)
            freeSpace -= res[0].amount;
        else
            console.log(creep.room.name, "A creep failed to pickup dropped resource", PrettyPrintErr(retErr));
    }

    if (freeSpace>0) {
        let structs = workPos.lookFor(LOOK_STRUCTURES);
        for (let struct of structs) {
            if (struct.structureType != STRUCTURE_ROAD) {
                let key: ResourceConstant = RESOURCE_ENERGY;
                let amount = 0;
                if (target.type == targetT.DROPPED_MINERAL) {
                    let storageObj = struct as StructureStorage | StructureContainer;
                    key = _.findKey(storageObj.store) as ResourceConstant;
                    amount = storageObj.store[key]||0;
                }
                amount = Math.min(freeSpace, amount);
                retErr = creep.withdraw(struct, key, amount);
                if (retErr == OK)
                    freeSpace -= amount;
                else
                    console.log(creep.room.name, "A creep failed to pickup from store", PrettyPrintErr(retErr));
            }
        }
    }
    //reuse target if two times do not work in same action
    creep.completeTarget();
    return retErr;
}

export function getMineralTarget(creep: Creep): targetData | null {
    for (let ID of Game.rooms[creep.creationRoom].memory.mineralsUsed) {
        let min = Memory.Resources[ID];
        if (min.AvailResource > creep.carryCapacity) {
            let target: targetData = {
                ID: ID, type: targetT.DROPPED_MINERAL, pos: min.workPos, range: 1
            }
            return target;
        }
    }

    return null;
}
