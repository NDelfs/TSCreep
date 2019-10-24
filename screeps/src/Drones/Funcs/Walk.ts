import { restorePos } from "utils/posHelpers";
// returns true if end result is inside range
export function goToTarget(creep: Creep): boolean {
    if (creep.memory.currentTarget) {
        const workPos = restorePos(creep.memory.currentTarget.pos);
        if (creep.pos.roomName != creep.memory.currentTarget.pos.roomName || creep.pos.getRangeTo(workPos.x, workPos.y) > creep.memory.currentTarget.range) {
            creep.moveTo(workPos);
        }
        else
            return true;
        if (creep.pos.roomName == creep.memory.currentTarget.pos.roomName && creep.pos.getRangeTo(workPos.x, workPos.y) <= creep.memory.currentTarget.range)
            return true;
    }
    return false;
}
