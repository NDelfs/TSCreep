import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";
import { PrettyPrintErr } from "../../utils/PrettyPrintErr";

function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getBuildTarget(creep: Creep) : void {
    let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_EXTENSION || STRUCTURE_CONTAINER } });
    if (inQue.length == 0) {
        inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
    }
    if (inQue.length > 0) {
        creep.setTarget(inQue[0].id, targetT.CONSTRUCTION, inQue[0].pos, 3);
    }
}

export function getRepairTarget(creep: Creep): void {   
    let que = global[creep.memory.creationRoom].repairSites;
    if (que.length > 0) {
        let index = getRandomInt(que.length);//insdead shift it if enough energy to repair is on current creep
        let obj = Game.getObjectById(que[index]) as Structure;
        creep.setTarget(obj.id, targetT.REPAIR, obj.pos, 3);
    }
}

export function useBuildTarget(creep: Creep): number {
    if (creep.currentTarget) {
        let con: ConstructionSite | null = Game.getObjectById(creep.currentTarget.ID);
        if (con) {
            const err = creep.build(con);
            return err;
        }
    }
    creep.currentTarget = null;
    return ERR_INVALID_TARGET;
}
export function useRepairTarget(creep: Creep): number {
    if (creep.currentTarget) {
        let con: Structure | null = Game.getObjectById(creep.currentTarget.ID);
        if (con) {
            const err = creep.repair(con);
            if (!(con.hits < con.hitsMax * 0.7 && con.hits < 15000))
                creep.currentTarget = null;
            return err;
        }
    }
    creep.currentTarget = null;
    return ERR_INVALID_TARGET;
}
