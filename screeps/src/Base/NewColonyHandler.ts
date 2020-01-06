import { Colony } from "Colony"
import { nrCreepInQue } from "../utils/minorUtils";
import { SCOUT, STARTER } from "../Types/CreepType";
import { CONTROLLER } from "../Types/TargetTypes";
import { calculateBodyFromSet } from "../Spawners/Spawner";

function calculateScoutQue(spawCol: Colony, flag: Flag) {
  //const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_WHITE; });
  //for (let flag of wflags) {
  const creeps = _.filter(Game.creeps, function (creep) { return creep.memory.type == SCOUT && creep.alreadyTarget(flag.name); });
  let nrCreep = nrCreepInQue(spawCol, SCOUT) + creeps.length;
  if (nrCreep == 0 && flag.room == null) {
    const targ: targetData = { ID: flag.name, type: CONTROLLER, pos: flag.pos, range: 1 };
    const mem: CreepMemory = { type: SCOUT, creationRoom: flag.pos.roomName, permTarget: null, moveTarget: { pos: flag.pos, range: 2 }, targetQue: [targ] };
    spawCol.queNewCreep(mem, [CLAIM, MOVE]);
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
  private findClosest(colonies: { [name: string]: Colony }) : Colony {
    let newName = this.flag.pos.roomName;
    let dists: { name: string, dist: number }[] = [];
    for (let colName in colonies) {
      
      let col = colonies[colName];
      if (colName != newName && col.controller.level >= 3) {
        dists.push({ name: col.name, dist: Game.map.getRoomLinearDistance(col.name, newName) - col.controller.level });//balance in the controller level
      }
    }
    dists.sort((a, b) => { return a.dist - b.dist });
    console.log("Find closest got first as", JSON.stringify(dists[0]), JSON.stringify(_.last(dists)));

    let closest: { name: string, dist: number }= { name: "", dist: 999};
    for (let dist of dists) {
      if (dist.dist > closest.dist)
        break;//abort early if linear is more expensive than closest real Path
      let colony = colonies[dist.name];
      let route =Game.map.findRoute(colony.name, this.flag.pos.roomName, {
        routeCallback(roomName) {
          let room = Game.rooms[roomName];
          let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName)!;
          let isHighway = (parseInt(parsed[1]) % 10 === 0) || (parseInt(parsed[2]) % 10 === 0);
         // let isMyRoom = room && room.controller && room.controller.my;
          if (isHighway) {
            return 1;
          } else {
            return 2;
          }
        }
      })
 
      //updade dist and closest
      if (route != -2) {
        console.log("find closest real dist to room =", route.length, dist.name, "col level", colonies[dist.name].controller.level);
        dist.dist = route.length - colonies[dist.name].controller.level;//balance in the controller level
        if (dist.dist < closest.dist)
          closest = dist;
      }
      else {
        dist.dist = 999;
      }
    }
    if (closest.dist < 999)
      return colonies[closest.name];
    else {
      throw "Can not find path to room" + this.flag.pos.roomName;
    }
  }
 
  constructor(colonies: { [name: string]: Colony }, flag: Flag) {
    this.flag = flag;
    this.closestColony = this.findClosest(colonies);
    this.scoutSpawned = false;
  }

  public refresh(colonies: { [name: string]: Colony }) {
    this.flag = Game.getObjectById(this.flag.name) as Flag;
    this.closestColony = colonies[this.closestColony.name];
    this.newColony = colonies[this.flag.pos.roomName];
    if (this.newColony && !this.newColony.memory.startSpawnPos) {
      this.newColony.memory.startSpawnPos = this.flag.pos;
      this.newColony.memory.startSpawnPos.y += -2;
    }
  }

  public run() {
    if (!this.newColony) {
      if (!this.scoutSpawned || (Game.time % 500 == 8)) {
        calculateScoutQue(this.closestColony, this.flag);
        this.scoutSpawned = true;
      }
    }
    else {
      let nrStart = this.newColony.room.getCreeps(STARTER).length;
      if (nrStart < 2) {
        nrStart += nrCreepInQue(this.closestColony, STARTER);
        if (nrStart < 2) {
          const mem: CreepMemory = { type: STARTER, creationRoom: this.newColony.name, permTarget: null, moveTarget: null, targetQue: [] };
          this.closestColony.queNewCreep(mem, calculateBodyFromSet(this.closestColony.room, [WORK, CARRY, MOVE], 10));
        }
      }
    }
  }
}

export class NewColonyHandler {
  newColonies: newColony[];
  constructor(colonies: { [name: string]: Colony }) {
    this.newColonies = [];
    const wflags = _.filter(Game.flags, function (flag) { return flag.color == COLOR_WHITE; });
    for (let flag of wflags) {
      try {
        this.newColonies.push(new newColony(colonies, flag));
      }
      catch (e) {
        console.log("failed to create new Colony", e);
      }
    }
  }

  public refresh(colonies: { [name: string]: Colony }) {
    for (let newC of this.newColonies)
      newC.refresh(colonies);
  }

  public run() {
    for (let newC of this.newColonies)
      newC.run();
  }
}
