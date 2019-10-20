import { restorePos } from "../utils/posHelpers";
import { isEqualPos } from "../utils/posHelpers";

export function Harvester(creep: Creep): void {
    let sourceMem: SourceMemory = Memory.Sources[creep.memory.mainTarget];
    const workPos = restorePos(sourceMem.workPos);
    if (!isEqualPos(workPos, creep.pos)) {
        creep.moveTo(workPos);
    }
    else {
        let source: Source = Game.getObjectById(creep.memory.mainTarget) as Source;
        creep.harvest(source);

        if (creep.carry[RESOURCE_ENERGY] > 40)
            creep.drop(RESOURCE_ENERGY);
    }
}
