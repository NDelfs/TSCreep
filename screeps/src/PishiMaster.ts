import { Colony } from "Colony"
import * as Mem from "Memory";
import { LabMaster } from "Base/LabMaster"
import { profile } from "profiler/decorator";
import { baseExpansion } from "Base/BaseExpansion"
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { Market } from "./Base/Market";
import { Spawner } from "./Spawners/Spawner";

const PishiMasterMemoryDef: PishiMasterMemory = {
}


//@profile
export class _PishiMaster {
    
    memory: PishiMasterMemory;
    ticksAlive: number;
    colonies: { [name: string]: Colony };
    labMaster: LabMaster;
    market: Market;
    constructor() {
        this.memory = Mem.wrap(Memory, "PishiMasterMem", PishiMasterMemoryDef);
        this.ticksAlive = 1;
        this.colonies = {};
        for (let roomID in Game.rooms) {
            let room = Game.rooms[roomID];
            if (room.controller && room.controller.my/* && room.controller.level>0*/)
              this.colonies[roomID] = new Colony(Game.rooms[roomID]);
        }    
        this.labMaster = new LabMaster(this.colonies);
        this.market = new Market(this.colonies);
    }
    refresh() {
        this.ticksAlive++;
        for (let colonyID in this.colonies) {
            this.colonies[colonyID].refresh();
        }
 
    }

    run() {
        for (let colonyID in this.colonies) {
            let colony = this.colonies[colonyID];
            Spawner(colony,this.colonies);
          colony.runTowers();
          baseExpansion(colony);
        }
       
        this.labMaster.run();
        this.market.run();
    }


}
profiler.registerClass(_PishiMaster, '_PishiMaster');


export function createNewMaster() {
    PM = new _PishiMaster();
}

export var PM: _PishiMaster;
