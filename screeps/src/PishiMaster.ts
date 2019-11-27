import { Colony } from "Colony"
import * as Mem from "Memory";
import { LabMaster } from "Base/LabMaster"
import { profile } from "profiler/decorator";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

const PishiMasterMemoryDef: PishiMasterMemory = {
}


//@profile
export class _PishiMaster {
    
    memory: PishiMasterMemory;
    ticksAlive: number;
    colonies: { [name: string]: Colony };
    labMaster: LabMaster;
    constructor() {
        this.memory = Mem.wrap(Memory, "PishiMasterMem", PishiMasterMemoryDef);
        this.ticksAlive = 1;
        this.colonies = {};
        for (let roomID in Game.rooms) {
            let room = Game.rooms[roomID];
            if (room.controller && room.controller.my && room.controller.level>0)
              this.colonies[roomID] = new Colony(Game.rooms[roomID]);
        }    
        this.labMaster = new LabMaster(this.colonies);
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
       
       this.labMaster.run();
       
    }


}
profiler.registerClass(_PishiMaster, '_PishiMaster');


export function createNewMaster() {
    PM = new _PishiMaster();
}

export var PM: _PishiMaster;
