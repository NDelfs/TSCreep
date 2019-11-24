import { Colony } from "Colony"
import * as Mem from "Memory";
import { findAndBuildLab } from "Base/BaseExpansion"
import { profile } from "profiler/decorator";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

const PishiMasterMemoryDef: PishiMasterMemory = {
}

const REACTION_CHAIN = {
    /*....*/
    G: { needs: ["ZK", "UL"], reacts: ["GO", "GH"] },
    GO: { needs: ["G", "O"], reacts: ["GHO2"] },
    GH: { needs: ["G", "H"], reacts: ["GH2O"] },
    GH2O: { needs: ["GH", "OH"], reacts: ["XGH2O"] },
    GHO2: { needs: ["GO", "OH"], reacts: ["XGHO2"] },
    XGH2O: { needs: ["GH2O", "X"] },
    XGHO2: { needs: ["GHO2", "X"] },
    OH: { needs: ["O", "H"], reacts: ["UH2O", "UHO2", "ZH2O", "ZHO2", "KH2O", "KHO2", "LH2O", "LHO2", "GH2O", "GHO2"] },
}

//@profile
export class _PishiMaster {
    
    memory: PishiMasterMemory;
    ticksAlive: number;
    colonies: { [name: string]: Colony };
    constructor() {
        this.memory = Mem.wrap(Memory, "PishiMasterMem", PishiMasterMemoryDef);
        this.ticksAlive = 1;
        this.colonies = {};
        for (let roomID in Game.rooms) {
            let room = Game.rooms[roomID];
            if (room.controller && room.controller.my && room.controller.level>0)
              this.colonies[roomID] = new Colony(Game.rooms[roomID]);
        }
    }
    refresh() {
        this.ticksAlive++;
        for (let colonyID in this.colonies) {
            this.colonies[colonyID].refresh();
        }
    }

    run() {
        for (let colonyID in this.colonies) {
            this.colonies[colonyID].runTowers();
        }
        if (Game.time % 10 == 9)
            this.LabMaster();
    }

    private LabMaster() {
        //have fast access of sum of all resources, if I already have a bunch no need to produce more
        //normaly only plan for highest level, controller buf may be exception. Do GH as long as no 10 room excist
        for (let col in this.colonies) {
            let colony = this.colonies[col];
            findAndBuildLab(colony.room, colony.labs);
            
            //as fast as 12 labs excist start producing GH,  in off rooms
            //if a 6 room and 15 more labs, do full chain using GH HO

            //or go all the way at 12 and when second criteria happens empty the 6 room labs and build full chain
        }
    }
}
profiler.registerClass(_PishiMaster, '_PishiMaster');


export function createNewMaster() {
    PM = new _PishiMaster();
}

export var PM: _PishiMaster;
