import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";

function getRandomInt(max : number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getEnergyTarget(creep: Creep): targetData | null {
    let avail: string[] = [];
    for (let [indx, ID] of Object.entries(creep.room.memory.sourcesUsed)) {
        let sourceMem: SourceMemory = Memory.Sources[ID];
        if (sourceMem.AvailEnergy > creep.carryCapacity * 0.8) {
            avail.push(ID);
        }
    }
    
    if (avail.length > 0) {
        const index = getRandomInt(avail.length);
        let target: targetData = {
            ID: avail[index], type: targetT.DROPPED_ENERGY, pos: Memory.Sources[avail[index]].workPos, range: 1
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
    return ERR_NOT_FOUND;
}
