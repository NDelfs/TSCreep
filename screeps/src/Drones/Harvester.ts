import * as targetT from "Types/TargetTypes";
import { goToTarget } from "Drones/Funcs/Walk";

export function Harvester(creep: Creep): void {
    if (creep.memory.currentTarget == null) {
        let sourceMem: SourceMemory = Memory.Sources[creep.memory.mainTarget];
        creep.memory.currentTarget = { ID: creep.memory.mainTarget, type: targetT.SOURCE, pos: sourceMem.workPos, range:0 }
    }
    if (goToTarget(creep)) {
        let source: Source = Game.getObjectById(creep.memory.mainTarget) as Source;
        creep.harvest(source);
        if (creep.carry[RESOURCE_ENERGY] > 40)
            creep.drop(RESOURCE_ENERGY);
    }
}
