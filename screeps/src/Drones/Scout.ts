import * as targetT from "Types/TargetTypes";
import { goToTarget } from "Drones/Funcs/Walk";

export function scout(creep: Creep): void {
    if (creep.memory.currentTarget == null) {
        creep.say("no target");
        return;
    }
    if (goToTarget(creep)) {

    }
}
