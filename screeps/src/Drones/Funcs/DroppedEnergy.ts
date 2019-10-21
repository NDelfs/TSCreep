import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";

export function getEnergyTarget(creep: Creep): targetData | null {
    for (let [indx, ID] of Object.entries(creep.room.memory.sourcesUsed)) {
        let sourceMem: SourceMemory = Memory.Sources[ID];
        if (sourceMem.AvailEnergy > creep.carryCapacity * 0.8) {
            return { ID: ID, type: targetT.DROPPED_ENERGY, pos: sourceMem.workPos, range: 1 };
        }
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
