import { Colony } from "Colony"
import { nrCreepInQue } from "utils/minorUtils";
import { SCOUT, STARTER } from "Types/CreepType";
import { CONTROLLER, POSITION } from "Types/TargetTypes";
import { calculateBodyFromSet } from "Spawners/Spawner";
import { findClosestColony } from "utils/ColonyUtils";
import { isFlagColor, FLAG_ROOM_ATTACK, FLAG_NEW_COLONY, getFlags } from "../../Types/FlagTypes";
import { isEqualPos } from "../../utils/posHelpers";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

function calculateScoutQue(spawCol: Colony, flag: Flag) {
  const creeps = _.filter(Game.creeps, function (creep) { return creep.memory.type == SCOUT && creep.alreadyTarget(flag.name); });
  console.log('in calculate scout que, already in que', nrCreepInQue(spawCol, SCOUT));
  let nrCreep = nrCreepInQue(spawCol, SCOUT) + creeps.length;
  if (nrCreep == 0 && flag.room == null) {
    const targ: targetData = { ID: flag.name, type: CONTROLLER, pos: flag.pos, range: 1 };
    const mem: CreepMemory = { type: SCOUT, creationRoom: flag.pos.roomName, curentRoom: flag.pos.roomName, permTarget: null, moveTarget: { pos: flag.pos, range: 2 }, targetQue: [targ] };
    spawCol.queNewCreep(mem, [CLAIM, MOVE]);
    console.log("spawned new scout for the new colony");
  }
  //}
  //if (room.controller && room.controller.my && room.controller.level > 2) {
  //  if (room.controller.sign == null || (room.controller.sign.username != "Gorgar")) {
  //    const creeps = _.filter(Game.creeps, function (creep) { return creep.memory.type == creepT.SCOUT && creep.alreadyTarget("controller"); });
  //    if (creeps.length == 0) {
  //      const targ: targetData = { ID: "controller", type: targetT.CONTROLLER, pos: room.controller.pos, range: 1 };
  //      const mem: CreepMemory = { type: creepT.SCOUT, creationRoom: room.name, permTarget: targ, moveTarget: { pos: room.controller.pos, range: 1 }, targetQue: [targ] };
  //      ret.push({ memory: mem, body: [MOVE], prio: 1, eTresh: 0.9});
  //    }
  //  }
  //}
}

class newColony {
  newColony: Colony | undefined;
  closestColony: Colony;
  flag: Flag;
  scoutSpawned: boolean;
  
 
  constructor(colonies: { [name: string]: Colony }, flag: Flag) {
    this.flag = flag;
    let closest = findClosestColony(colonies, flag.pos.roomName);
    if (closest)
      this.closestColony = closest;
    else
      throw "Failed to create a boosting new colony";
    this.scoutSpawned = false;
  }

  public refresh(colonies: { [name: string]: Colony }) {
    this.flag = Game.flags[this.flag.name];;
    this.closestColony = colonies[this.closestColony.name];
    this.newColony = colonies[this.flag.pos.roomName];
    if (this.newColony && !this.newColony.memory.startSpawnPos) {
      this.newColony.memory.startSpawnPos = this.flag.pos;
      this.newColony.memory.startSpawnPos.y += 1;//since V2 the start spawn is downwards
      console.log("added new start spawn pos for new colony");
    }
    if (!this.newColony && this.flag.room && this.flag.room.controller!.my) {
      colonies[this.flag.room.name] = new Colony(this.flag.room);
      this.newColony = colonies[this.flag.room.name];
    }
  }

  public run() {
    if (!this.newColony) {
      if ((!this.scoutSpawned || (Game.time % 500 == 8))) {
        calculateScoutQue(this.closestColony, this.flag);
        this.scoutSpawned = true;
      }
    }
    else {
      let starters = this.newColony.room.getCreeps(STARTER);
      for (let creep of starters) {
        if (creep.room.name != this.newColony.name && (!creep.memory.moveTarget || (creep.memory.moveTarget && !isEqualPos(creep.memory.moveTarget.pos, this.flag.pos)))) {//walk to room
          creep.walkTo(this.flag.pos, 5);
          console.log("added walk target to creep", creep.name);
        }
      }
      let nrStart = starters.length;
      if (nrStart < 2) {
        console.log("try to spawn new starter", nrStart, nrCreepInQue(this.closestColony, STARTER));
        nrStart += nrCreepInQue(this.closestColony, STARTER);
        if (nrStart < 2) {
          const mem: CreepMemory = {
            type: STARTER, creationRoom: this.newColony.name, curentRoom: this.newColony.name, permTarget: null, moveTarget: null, targetQue: [{ ID: "", type: POSITION, pos: this.flag.pos, range: 3 }]
          };
          this.closestColony.queNewCreep(mem, calculateBodyFromSet(this.closestColony.room, [WORK, CARRY, MOVE], 10));
          console.log("spawned new starter for the new colony");
        }
      }
    }
  }
}

export class NewColonyHandler {
  newColonies: newColony[];
  constructor(colonies: { [name: string]: Colony }) {
    this.newColonies = [];
    this.findNew(colonies);
  }
  
  private findNew(colonies: { [name: string]: Colony }) {
    const wflags = getFlags(FLAG_NEW_COLONY);
    for (let flag of wflags) {
      try {
        let found = this.newColonies.find((col) => { return col.flag.name == flag.name });
        if (!found) {
          this.newColonies.push(new newColony(colonies, flag));
          console.log('created new colony handler');
        }
        else {
          if (found.newColony && found.newColony.controller.level >= 5 && found.newColony.extensions.length>=10) {
            _.remove(this.newColonies, (col) => { return col.newColony && col.newColony.name == flag.pos.roomName });
            flag.remove();
          }
        }
      }
      catch (e) {
        console.log("failed to create new Colony", e);
      }
    }
  }

  public refresh(colonies: { [name: string]: Colony }) {
    if (Game.time % 100 == 0) {
      this.findNew(colonies);
    }
  
      
    for (let newC of this.newColonies) {
      try {
        newC.refresh(colonies);
      }
      catch (e) {
        console.log("New colony handler failed refresh with", e)
      }
    }
  }

  public run() {
    for (let newC of this.newColonies) {
      try {
        newC.run();

      }
      catch (e) {
        console.log("New colony handler failed run with", e)
      }
    }
  }
}
profiler.registerClass(NewColonyHandler, 'NewColonyHandler');
