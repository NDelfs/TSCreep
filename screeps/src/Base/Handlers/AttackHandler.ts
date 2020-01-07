import {Colony} from "Colony"
import { findClosestColonies } from "../../utils/ColonyUtils";
import { ATTACKER } from "../../Types/CreepType";

class RoomAttack {
  room: string;
  flag: Flag;
  closestColonies: Colony[];
  creeps: Creep[];
  spawnQueCreeps: string[];
  constructor(colonies: { [name: string]: Colony },flag: Flag) {
    this.flag = flag;
    this.room = flag.pos.roomName;
    this.closestColonies = findClosestColonies(colonies, this.room, 4);
    this.creeps = [];
    this.spawnQueCreeps = [];
  }

  public refresh(colonies: { [name: string]: Colony }) {
    this.closestColonies = this.closestColonies.map((col) => { return colonies[col.name]; });
    this.flag = Game.getObjectById(this.flag.name) as Flag;
    this.creeps = this.creeps.map((creep) => { return Game.creeps[creep.name]; });
    //if creeps got spawned lets move them to current creeps
    for (let i = 0; i < this.spawnQueCreeps.length; i++) {
      let creep = Game.creeps[this.spawnQueCreeps[i]];
      if (creep) {
        this.creeps.push(creep);
        this.spawnQueCreeps[i] = "";
      }
    }
    _.remove(this.spawnQueCreeps, (sp) => { return sp.length == 0 });
  }

  public run() {
    let nrAttack = this.creeps.length + this.spawnQueCreeps.length;
    if (nrAttack < 3) {
      for (let i = nrAttack; i < nrAttack; i++) {
        const mem: CreepMemory = { type: ATTACKER, creationRoom: "", permTarget: null, moveTarget: { pos: this.flag.pos, range: 2 }, targetQue: [] };
        //ret.push({ memory: mem, body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, RANGED_ATTACK], prio: 1, eTresh: 0.9});
        this.closestColonies[i].queNewCreep(mem,);
      }
    }
  }
}

export class AttackHandler {
  rooms: RoomAttack[];
  constructor(colonies: { [name: string]: Colony }) {
    this.rooms = [];
    this.findNew(colonies);
  }

  private findNew(colonies: { [name: string]: Colony }) {
    const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_BLUE; });//TODO: What color?
    for (let flag of wflags) {
      try {
        let found = this.rooms.find((col) => { return col.flag == flag });
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
