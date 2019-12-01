import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";
import { PrettyPrintErr } from "../../utils/PrettyPrintErr";
import { PM } from "PishiMaster";

function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getBuildTarget(creep: Creep) : void {
    let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_EXTENSION || STRUCTURE_CONTAINER } });
    if (inQue.length == 0) {
        inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
    }
    if (inQue.length > 0) {
        creep.addTarget(inQue[0].id, targetT.CONSTRUCTION, inQue[0].pos, 3);
    }
}

export function getRepairTarget(creep: Creep): boolean {
    let que = PM.colonies[creep.memory.creationRoom].repairSites;
    if (que.length > 0) {
        let index = getRandomInt(que.length);//insdead shift it if enough energy to repair is on current creep
        let obj = Game.getObjectById(que[index]) as Structure;
        creep.addTarget(obj.id, targetT.REPAIR, obj.pos, 3);
        return true;
    }
    return false;
}

export function useBuildTarget(creep: Creep): number {

    let con: ConstructionSite | null = Game.getObjectById(creep.getTarget()!.ID);
    if (con) {
        const err = creep.build(con);
        return err;
    }
    creep.completeTarget();
    return ERR_INVALID_TARGET;
}
export function useRepairTarget(creep: Creep): number {
    let con: Structure | null = Game.getObjectById(creep.getTarget()!.ID);
        if (con) {
            const err = creep.repair(con);
            if (con.hits > con.hitsMax - 100 || creep.room.controller && (con.hits >= creep.room.controller.level * 100000))
                creep.completeTarget();
            return err;
        }

    creep.completeTarget();
    return ERR_INVALID_TARGET;
}
