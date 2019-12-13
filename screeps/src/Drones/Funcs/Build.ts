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
    
      //  let index = getRandomInt(que.length);//insdead shift it if enough energy to repair is on current creep
      while (que.length>0) {
        let obj = Game.getObjectById(que[0]) as Structure;
        
        //

        if (obj.hits + 500 < obj.hitsMax) {
          if (obj.hitsMax - obj.hits < creep.carry.energy * 100 / 4) {
            que.shift();//take it for them self
          }
          creep.addTargetT({ ID: obj.id, type: targetT.REPAIR, pos: obj.pos, range: 3, targetVal: Math.min(2.5e5, obj.hitsMax) });
          console.log(creep.room.name, "found repair target", obj.structureType, obj.pos.x, obj.pos.y);
          return true;
        }
        else {
          que.shift();//can as well remove
        }
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
          if (con.hits >= (creep.getTarget()!.targetVal! - creep.getActiveBodyparts(WORK)*100))
                creep.completeTarget();
            return err;
        }

    creep.completeTarget();
    return ERR_INVALID_TARGET;
}
