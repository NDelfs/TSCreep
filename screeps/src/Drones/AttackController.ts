import * as targetT from "Types/TargetTypes";
import { isFlagColor, FLAG_ATTACK_CONTROLLER } from "../Types/FlagTypes";

export function AttackerController(creep: Creep) {
  if (creep.getTarget() == null && creep.inPlace) {
    let attackFlag = _.filter(Game.flags, function (flag) { return isFlagColor(flag, FLAG_ATTACK_CONTROLLER); });
        if (attackFlag.length > 0 && attackFlag[0].pos.roomName != creep.pos.roomName) {
            creep.walkTo(attackFlag[0].pos,  5);
        }
        if (attackFlag.length > 0 && attackFlag[0].pos.roomName == creep.pos.roomName && creep.room.controller)//we may not see room before the attacking creep is there
            creep.addTarget(creep.room.controller.id, targetT.CONTROLLER, creep.room.controller.pos, 1);
    }
    if (creep.inPlace) {
        if (creep.room.controller) {
            console.log("before con attack ", creep.room.controller.ticksToDowngrade);
            creep.attackController(creep.room.controller);
            console.log("after con attack ", creep.room.controller.ticksToDowngrade);
        }
    }
}
