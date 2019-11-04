import * as targetT from "Types/TargetTypes";
import { goToTarget } from "Drones/Funcs/Walk";

export function scout(creep: Creep): void {
    if (creep.memory.currentTarget == null) {
        creep.say("no target");
        creep.suicide();
        return;
    }
    let spawns = creep.room.find(FIND_MY_SPAWNS);
    if (spawns.length > 0 && creep.room.controller && creep.room.controller.sign&& creep.room.controller.sign.username == "Gorgar") {
        creep.say("done");
        creep.suicide();
    }
    if (goToTarget(creep) && creep.memory.currentTarget) {
        //if (creep.memory.currentTarget.type == targetT.POSITION) {
        //    if (creep.room.controller) {
        //        creep.memory.currentTarget = { ID: creep.room.controller.id, type: targetT.CONTROLLER, pos: creep.room.controller.pos, range: 1 }
        //    }
        //}
        if (creep.memory.currentTarget.type == targetT.CONTROLLER) {
            if (creep.room.controller && !creep.room.controller.my) {
                let err = creep.claimController(creep.room.controller);
                if (err != OK)
                    console.log("Scout fail to claim");
                else
                    creep.signController(creep.room.controller, "IMO the chocolate bar");
            }
            else if (creep.room.controller) {
                creep.signController(creep.room.controller, "IMO the chocolate bar");
                creep.memory.currentTarget = null;
            }
        }
    }
}
