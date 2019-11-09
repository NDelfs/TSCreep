import * as targetT from "Types/TargetTypes";
import { restorePos, storePos } from "utils/posHelpers";

function getRandomInt(max : number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getEnergyTarget(creep: Creep): targetData | null {
    let avail: string[] = [];
    for (let ID of Game.rooms[creep.creationRoom].memory.sourcesUsed) {
        let sourceMem: SourceMemory = Memory.Resources[ID];
        if (sourceMem.AvailResource > creep.carryCapacity * 0.8) {
            avail.push(ID);
        }
    }
    
    if (avail.length > 0) {
        const index = getRandomInt(avail.length);
        let target: targetData = {
            ID: avail[index], type: targetT.DROPPED_ENERGY, pos: Memory.Resources[avail[index]].workPos, range: 1
        }
        return target;
    }
    return null;
}


export function useEnergyTarget(creep: Creep, target: targetData): number {
    const workPos = restorePos(target.pos);
    let res = workPos.lookFor(LOOK_RESOURCES);
    if (res.length > 0) {
        return creep.pickup(res[0]);
    }
    else {
        let res = workPos.lookFor(LOOK_STRUCTURES);
        for (let struct of res) {
            if (struct.structureType != STRUCTURE_ROAD) {
                let key: ResourceConstant = RESOURCE_ENERGY;
                if (target.type == targetT.DROPPED_MINERAL) {
                    let storageObj = struct as StructureStorage | StructureContainer;
                    key = _.findKey(storageObj.store) as ResourceConstant;
                }
                return creep.withdraw(struct, key);
            }
        }
    }
    return ERR_NOT_FOUND;
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
