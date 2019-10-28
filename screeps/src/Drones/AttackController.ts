import { goToTarget } from "Drones/Funcs/Walk";
import * as targetT from "Types/TargetTypes";

export function AttackerController(creep: Creep) {
    if (creep.memory.currentTarget == null) {
        let attackFlag = _.filter(Game.flags, function (flag) { return flag.color == COLOR_CYAN });
        if (attackFlag.length > 0 && attackFlag[0].pos.roomName != creep.pos.roomName) {
            creep.memory.currentTarget = { ID: attackFlag[0].name, type: targetT.POSITION, pos: attackFlag[0].pos, range: 5 };
        }
    }
    if (goToTarget(creep)) {
        if (creep.room.controller) {
            creep.attackController(creep.room.controller);
            creep.moveTo(creep.room.controller);
        }
    }
}
