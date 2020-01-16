import { Colony } from "Colony"
import * as Mem from "Memory";
import { LabMaster } from "Base/LabMaster"
import { profile } from "profiler/decorator";
import { baseExpansion } from "Base/BaseExpansion"
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { Market } from "./Base/Market";
import { Spawner, spawnFromReq, RefreshQue } from "./Spawners/Spawner";
import { NukeResourceReq } from "Base/Handlers/NukePlaner";
import { NewColonyHandler } from "Base/Handlers/NewColonyHandler";
import { AttackHandler } from "./Base/Handlers/AttackHandler";
import { findClosestColony, findPathToSource, serializePath } from "./utils/ColonyUtils";
import { restorePos } from "./utils/posHelpers";

const PishiMasterMemoryDef: PishiMasterMemory = {
}


//@profile
export class _PishiMaster {

  memory: PishiMasterMemory;
  ticksAlive: number;
  colonies: { [name: string]: Colony };
  newColHandler: NewColonyHandler;
  attackHand: AttackHandler;
  labMaster: LabMaster;
  market: Market;
  constructor() {
    console.log("rebuild pishimaster")
    global['PM'] = this;
    this.memory = Mem.wrap(Memory, "PishiMasterMem", PishiMasterMemoryDef);
    this.ticksAlive = 1;
    this.colonies = {};
    for (let roomID in Game.rooms) {
      let room = Game.rooms[roomID];
      if (room.controller && room.controller.my/* && room.controller.level>0*/) {
        try {
          this.colonies[roomID] = new Colony(Game.rooms[roomID]);
        }
        catch (e) {
          console.log("Colony construction failed", e);
        }
      }
    }
    this.newColHandler = new NewColonyHandler(this.colonies);
    this.attackHand = new AttackHandler(this.colonies);
    this.labMaster = new LabMaster(this.colonies);
    this.market = new Market(this.colonies);

    for (let sourceID in Memory.Resources) {//temporary to fill in information of old memories
      let sourceMem = Memory.Resources[sourceID];
      if (!sourceMem.path) {
        let path = findPathToSource(this.colonies[sourceMem.usedByRoom], restorePos(sourceMem.workPos));
        if (!path.incomplete) {
          sourceMem.pathCost = path.cost;
          sourceMem.path = serializePath(path.path);
        }
        else {
          console.log("failed to fill in path information to source")
        }
      }
    }
  }
  refresh() {
    this.memory = Mem.wrap(Memory, "PishiMasterMem", PishiMasterMemoryDef);
    this.ticksAlive++;
    for (let colonyID in this.colonies) {
      let col = this.colonies[colonyID];
      col.refresh();
      //find and update closest colony for boosting or helping curent col
      if (Game.time % 1e5 == 0 || (!col.memory.closestBoostCol && Game.time % 10 ==0 )) {//increase 10 to maybe 1e3 or more later
        let closeC = findClosestColony(this.colonies, colonyID);
        if (closeC)
          this.colonies[colonyID].memory.closestBoostCol = closeC.name;
      }
    }

    this.attackHand.refresh(this.colonies);
    this.newColHandler.refresh(this.colonies);
  }

  run() {
    for (let colonyID in this.colonies) {
      let colony = this.colonies[colonyID];    
      Spawner(colony, this.colonies);
      RefreshQue(colony);
      spawnFromReq(colony, this.colonies);
      colony.runTowers();
      baseExpansion(colony);
    }
    this.newColHandler.run();
    this.attackHand.run();
    this.labMaster.run();
    this.market.run();
    for (let colonyID in this.colonies) {
      if (Game.time % 100 == 0) {
        NukeResourceReq(this.colonies[colonyID]);
      }
    }

  }


}
profiler.registerClass(_PishiMaster, '_PishiMaster');


export function createNewMaster() {
  PM = new _PishiMaster();
}

export var PM: _PishiMaster;
