import {Colony} from "Colony"
import { findClosestColonies } from "../../utils/ColonyUtils";
import { ATTACKER } from "../../Types/CreepType";
import { calculateBodyFromSet } from "../../Spawners/Spawner";
import { nrCreepInQue } from "../../utils/minorUtils";
import { isFlagColor, FLAG_ROOM_ATTACK, FLAG_TARGET_ATTACK, getFlagsInRoom } from "../../Types/FlagTypes";
import { ATTACK_STRUCTURE, POSITION } from "../../Types/TargetTypes";
import { isEqualPos } from "../../utils/posHelpers";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
const NRATTACKER = 3;

class RoomAttack {
  room: string;
  flag: Flag;
  closestColonies: Colony[];
  creeps: Creep[];
  structTarget: Structure | null;
  enemyCreeps: boolean;
  owner: string;
  //spawnQueCreeps: string[];
  constructor(colonies: { [name: string]: Colony },flag: Flag) {
    this.flag = flag;
    this.room = flag.pos.roomName;
    this.closestColonies = findClosestColonies(colonies, this.room, 4);
    this.creeps = [];
    this.structTarget = null;
    //this.spawnQueCreeps = [];
    for (let col of this.closestColonies)//temporary, dependant on only one attack at a time. 
      this.creeps = this.creeps.concat(col.room.getCreeps(ATTACKER));
    this.enemyCreeps = false;
    this.owner = "";

    console.log("Room attack created", this.room, "with nr of creeps", this.creeps.length, );
  }

  public refresh(colonies: { [name: string]: Colony }) {
    this.closestColonies = this.closestColonies.map((col) => { return colonies[col.name]; });
    this.flag = Game.flags[this.flag.name];
    if(this.structTarget)
      this.structTarget = Game.getObjectById(this.structTarget.id);
    if (Game.time % 10 == 0 && this.creeps.length < NRATTACKER) {
      this.creeps = [];
      for (let col of this.closestColonies)//temporary, dependant on only one attack at a time. 
        this.creeps=this.creeps.concat(col.room.getCreeps(ATTACKER));
      console.log("room attack added creeps, found", this.creeps.length);
    }
    else
      this.creeps = _.compact( this.creeps.map((creep) => { return Game.creeps[creep.name]; }));

    if (Game.rooms[this.room]) {
      let room = Game.rooms[this.room];
      this.enemyCreeps = room.find(FIND_HOSTILE_CREEPS).length > 0;
      this.owner = "";
      if (room.controller && room.controller.owner)
        this.owner = room.controller!.owner.username
    }
    //if creeps got spawned lets move them to current creeps
    //for (let i = 0; i < this.spawnQueCreeps.length; i++) {
    //  let creep = Game.creeps[this.spawnQueCreeps[i]];
    //  if (creep) {
    //    this.creeps.push(creep);
    //    this.spawnQueCreeps[i] = "";
    //  }
    //}
    //_.remove(this.spawnQueCreeps, (sp) => { return sp.length == 0 });
  }

  public run() {
    let nrAttack = this.creeps.length;
    for (let col of this.closestColonies) {
      //console.log(col.name, "already builds", nrCreepInQue(col, ATTACKER));
      nrAttack += nrCreepInQue(col, ATTACKER);
    }

    if (nrAttack < NRATTACKER) {
      for (let i = 0; i < NRATTACKER - nrAttack; i++) {
        const mem: CreepMemory = { type: ATTACKER, creationRoom: this.closestColonies[i].name, permTarget: null, moveTarget: null, targetQue: [{ ID: "", type: POSITION, pos: this.flag.pos, range: 2 }] };
        //ret.push({ memory: mem, body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, RANGED_ATTACK], prio: 1, eTresh: 0.9});
        if (!this.enemyCreeps && this.owner == "") {
          this.closestColonies[i].queNewCreep(mem, calculateBodyFromSet(this.closestColonies[i].room, [MOVE, ATTACK, ATTACK, ATTACK], 30, true));
          console.log(this.closestColonies[i].name, "room attack qued new creeps, already had", nrAttack, "type wall remover");
        }
        else {
          this.closestColonies[i].queNewCreep(mem, calculateBodyFromSet(this.closestColonies[i].room, [TOUGH, MOVE, ATTACK], 30, true));
          console.log(this.closestColonies[i].name, "room attack qued new creeps, already had", nrAttack);
        }
      }
    }
    try {
      this.planAttacks();
    }
    catch (e) {
      console.log("Plan of attack in room", this.room, "failed with error", e);
    }
  }

  private findTarget() {
    let room = Game.rooms[this.room];
    let specialTargets = getFlagsInRoom(FLAG_TARGET_ATTACK, this.room);
    for (let spec of specialTargets) {
      let structs = spec.pos.lookFor(LOOK_STRUCTURES).filter((e) => { return e.structureType != STRUCTURE_ROAD; });
      if (structs.length > 0) {
        if (structs.length > 1) {
          console.log('found more than one building', JSON.stringify(structs));
        }
        this.structTarget = structs[0];
        return;
      }
      else {
        console.log("no target left at flag position", spec.pos);
        spec.remove();
      }
    }
    let spawns = room.find(FIND_HOSTILE_SPAWNS);
    if (spawns.length > 0)
      this.structTarget = spawns[0];
  }

  private planAttacks() {
    if (!this.structTarget && Game.rooms[this.room]) {
      this.findTarget();
      console.log("searched for new target, found", this.structTarget);
    }
    //verify or distribute target for each screep;
    for (let creep of this.creeps) {
      if (creep.room.name != this.room && (!creep.memory.moveTarget || (creep.memory.moveTarget && !isEqualPos(creep.memory.moveTarget.pos,this.flag.pos)))) {//walk to room
        creep.walkTo(this.flag.pos, 5);
        console.log("added walk target to creep", creep.name);
      }
      else if (this.structTarget) {
        let target = creep.getTarget();
        if (creep.room.name == this.room && (!target || target.ID != this.structTarget.id)) {
          creep.addTargetFirst({ ID: this.structTarget.id, pos: this.structTarget.pos, range: 1, type: ATTACK_STRUCTURE })
          console.log("added attack structure target to creep", creep.name);
        }
      }
    }
  }

  public completed(): boolean {
    let completed = this.owner == "" && this.structTarget == null;
    if (completed)
      this.flag.remove();
    return completed;
  }
}

export class AttackHandler {
  rooms: RoomAttack[];
  constructor(colonies: { [name: string]: Colony }) {
    this.rooms = [];
    this.findNew(colonies);
  }

  private findNew(colonies: { [name: string]: Colony }) {
    const wflags = _.filter(Game.flags, function (flag) { return isFlagColor(flag, FLAG_ROOM_ATTACK) });
    for (let flag of wflags) {
      try {
        let found = this.rooms.find((col) => { return col.flag.name == flag.name });
        if (!found) {
          this.rooms.push(new RoomAttack(colonies, flag));
          console.log('created new attack handler');
        }
      }
      catch (e) {
        console.log("failed to create new attack target", e);
      }
    }
  }

  public refresh(colonies: { [name: string]: Colony }) {
    if (Game.time % 100 == 0) {
      this.findNew(colonies);
    }
    for (let newC of this.rooms) {
      try {
        newC.refresh(colonies);
      }
      catch (e) {
        console.log("attack handler failed refresh with", e)
      }
    }
    if (Game.time % 100 == 0) {
      _.remove(this.rooms, (e) => { e.completed(); })
    }
  }

  public run() {
    
    for (let newC of this.rooms) {
      try {
        newC.run();

      }
      catch (e) {
        console.log("attack handler failed run with", e)
      }
    }
  }
}
profiler.registerClass(AttackHandler, 'AttackHandler');
