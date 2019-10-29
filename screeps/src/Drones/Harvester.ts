import * as targetT from "Types/TargetTypes";
import { goToTarget } from "Drones/Funcs/Walk";

export function Harvester(creep: Creep): void {
    if (creep.memory.permTarget == null)
        throw ("no permanent target on harvester");
    if (creep.memory.currentTarget == null) {
        creep.memory.currentTarget = creep.memory.permTarget;
    }
    if (goToTarget(creep) && creep.memory.currentTarget) {
        let source: Source = Game.getObjectById(creep.memory.currentTarget.ID) as Source;
        creep.harvest(source);
        if (creep.carry[RESOURCE_ENERGY] > 40)
            creep.drop(RESOURCE_ENERGY);
    }
}
