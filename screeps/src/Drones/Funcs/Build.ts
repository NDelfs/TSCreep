import * as targetT from "Types/TargetTypes";
import { restorePos } from "utils/posHelpers";
import { PrettyPrintErr } from "../../utils/PrettyPrintErr";

function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getBuildTarget(creep: Creep) : void {
    let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: { structureType: STRUCTURE_EXTENSION || STRUCTURE_CONTAINER } });
    if (inQue.length > 0) {
        creep.memory.currentTarget = { ID: inQue[0].id, type: targetT.CONSTRUCTION, pos: inQue[0].pos, range: 3 };
    }
    else {
        let inQue = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
        if (inQue.length > 0) {
            creep.memory.currentTarget = { ID: _.first(inQue).id, type: targetT.CONSTRUCTION, pos: inQue[0].pos, range: 3 };
        }
    }
}

export function getRepairTarget(creep: Creep): void {
    let inQue = creep.room.find(FIND_STRUCTURES, { filter: function (build) { return build.hits < build.hitsMax * 0.5 && build.hits < 15000; } });
    if (inQue.length > 0) {
        let index = getRandomInt(inQue.length);
        creep.memory.currentTarget = { ID: inQue[index].id, type: targetT.REPAIR, pos: inQue[index].pos, range: 3 };
    }
}

export function useBuildTarget(creep: Creep): number {
    if (creep.memory.currentTarget) {
        let con: ConstructionSite | null = Game.getObjectById(creep.memory.currentTarget.ID);
        if (con) {
            const err = creep.build(con);
            return err;
        }
    }
    creep.memory.currentTarget = null;
    return ERR_INVALID_TARGET;
}
export function useRepairTarget(creep: Creep): number {
    if (creep.memory.currentTarget) {
        let con: Structure | null = Game.getObjectById(creep.memory.currentTarget.ID);
        if (con) {
            const err = creep.repair(con);
            if (!(con.hits < con.hitsMax * 0.7 && con.hits < 15000))
                creep.memory.currentTarget = null;
            return err;
        }
    }
    creep.memory.currentTarget = null;
    return ERR_INVALID_TARGET;
}
