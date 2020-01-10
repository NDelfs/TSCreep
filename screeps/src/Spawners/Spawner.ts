import { PrettyPrintErr, PrettyPrintCreep } from "../utils/PrettyPrintErr";
import * as creepT from "Types/CreepType";
import * as targetT from "Types/TargetTypes";
import { CONTROLLER } from "Types/TargetTypes";
import { TRANSPORTER, HARVESTER, STARTER, BUILDER } from "Types/CreepType";
import { Transporter } from "../Drones/Transporter";
import { Colony } from "Colony"
import { nrCreepInQue } from "../utils/minorUtils";
import { getFlagsInRoom, FLAG_NEW_COLONY } from "../Types/FlagTypes";

let names1 = ["Jackson", "Aiden", "Liam", "Lucas", "Noah", "Mason", "Jayden", "Ethan", "Jacob", "Jack", "Caden", "Logan", "Benjamin", "Michael", "Caleb", "Ryan", "Alexander", "Elijah", "James", "William", "Oliver", "Connor", "Matthew", "Daniel", "Luke", "Brayden", "Jayce", "Henry", "Carter", "Dylan", "Gabriel", "Joshua", "Nicholas", "Isaac", "Owen", "Nathan", "Grayson", "Eli", "Landon", "Andrew", "Max", "Samuel", "Gavin", "Wyatt", "Christian", "Hunter", "Cameron", "Evan", "Charlie", "David", "Sebastian", "Joseph", "Dominic", "Anthony", "Colton", "John", "Tyler", "Zachary", "Thomas", "Julian", "Levi", "Adam", "Isaiah", "Alex", "Aaron", "Parker", "Cooper", "Miles", "Chase", "Muhammad", "Christopher", "Blake", "Austin", "Jordan", "Leo", "Jonathan", "Adrian", "Colin", "Hudson", "Ian", "Xavier", "Camden", "Tristan", "Carson", "Jason", "Nolan", "Riley", "Lincoln", "Brody", "Bentley", "Nathaniel", "Josiah", "Declan", "Jake", "Asher", "Jeremiah", "Cole", "Mateo", "Micah", "Elliot"]
let names2 = ["Sophia", "Emma", "Olivia", "Isabella", "Mia", "Ava", "Lily", "Zoe", "Emily", "Chloe", "Layla", "Madison", "Madelyn", "Abigail", "Aubrey", "Charlotte", "Amelia", "Ella", "Kaylee", "Avery", "Aaliyah", "Hailey", "Hannah", "Addison", "Riley", "Harper", "Aria", "Arianna", "Mackenzie", "Lila", "Evelyn", "Adalyn", "Grace", "Brooklyn", "Ellie", "Anna", "Kaitlyn", "Isabelle", "Sophie", "Scarlett", "Natalie", "Leah", "Sarah", "Nora", "Mila", "Elizabeth", "Lillian", "Kylie", "Audrey", "Lucy", "Maya", "Annabelle", "Makayla", "Gabriella", "Elena", "Victoria", "Claire", "Savannah", "Peyton", "Maria", "Alaina", "Kennedy", "Stella", "Liliana", "Allison", "Samantha", "Keira", "Alyssa", "Reagan", "Molly", "Alexandra", "Violet", "Charlie", "Julia", "Sadie", "Ruby", "Eva", "Alice", "Eliana", "Taylor", "Callie", "Penelope", "Camilla", "Bailey", "Kaelyn", "Alexis", "Kayla", "Katherine", "Sydney", "Lauren", "Jasmine", "London", "Bella", "Adeline", "Caroline", "Vivian", "Juliana", "Gianna", "Skyler", "Jordyn"]
let namesCombined = _.flatten(_.map(names1, function (v, i) { return [v, names2[i]]; }));

function getRandomName() {
  if (Memory.creepIndex >= namesCombined.length) {
    Memory.creepIndex = 0
  } else {
    Memory.creepIndex++
  }

  return namesCombined[Memory.creepIndex % namesCombined.length]
}

function computeBodyCost(body: BodyPartConstant[]): number {
  let ret = 0;
  for (let part of body) {
    ret += BODYPART_COST[part];
  }
  return ret;
}

export function calculateBodyFromSet(room: Room, set: BodyPartConstant[], maxSets: number, inOrder?: boolean) {
  let nrSets = Math.floor((room.energyCapacityAvailable * 0.8) / computeBodyCost(set));
  nrSets = Math.min(maxSets, nrSets, Math.floor(50 / set.length));
  let body: BodyPartConstant[] = [];
  if (inOrder) {
    body = Array<BodyPartConstant>(nrSets * set.length);
    for (let i = 0; i < set.length; i++) {
      body.fill(set[i], i * nrSets, (i + 1) * nrSets);
    }
  }
  else {
    for (let i = 0; i < nrSets; i++) {
      body = body.concat(set);
    }
  }
  
  return body;
}

function getStarterBody(room: Room): BodyPartConstant[] {
  let body: BodyPartConstant[] = [WORK, WORK, CARRY, MOVE];
  if (room.energyCapacityAvailable >= 1200) {
    body = calculateBodyFromSet(room, [WORK, CARRY, MOVE], 8);
  }
  else if (room.energyCapacityAvailable >= 800)
    body = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
  else if (room.energyCapacityAvailable >= 550)
    body = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
  return body;
}

export function getBuilderBody(room: Room): BodyPartConstant[] {
  return calculateBodyFromSet(room, [WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 5);
}

function getHarvesterBody(room: Room): BodyPartConstant[] {
  if (room.energyCapacityAvailable >= 750)
    return [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
  else if (room.energyCapacityAvailable >= 550)
    return [WORK, WORK, WORK, WORK, WORK, MOVE];
  throw ("cant get harvester body with less than 550 energy");
}

export function getTransportBody(room: Room): BodyPartConstant[] {
  return calculateBodyFromSet(room, [CARRY, CARRY, MOVE], 10);
}

function calculateTransportQue(colony: Colony): queData[] {
  let ret: queData[] = [];
  let cRoom = colony.room;
  if (colony.controller.level >= 3) {
    let transportSize = (cRoom.energyCapacityAvailable * 0.8 / 150.0) * 100;
    let limit = 2;
    let roomEne = 0;
    for (let sourceID of colony.memory.sourcesUsed) {
      roomEne += Memory.Resources[sourceID].AvailResource;
    }
    let controllerNeed = 0;

    if (colony.memory.controllerStoreID) {
      let req = colony.resourceHandler.getReq(colony.memory.controllerStoreID, RESOURCE_ENERGY);
      if (req) {
        controllerNeed = 2000 - req.amount();
      }
    }

    if (roomEne > transportSize * 4 && (controllerNeed > 500 || cRoom.storage))
      limit = 3;
    if (roomEne > transportSize * 8 && (controllerNeed > 500 || cRoom.storage))
      limit = 4;
    const nrcreeps = cRoom.getCreeps(creepT.TRANSPORTER).length + nrCreepInQue(colony, creepT.TRANSPORTER);

      //const excist = _.filter(curentHarv, function (creep: Creep) { return creep.memory.mainTarget == source });     
    if (nrcreeps < limit) {
        const mem: CreepMemory = { type: creepT.TRANSPORTER, creationRoom: colony.name, permTarget: null, moveTarget: null, targetQue: [] };
        ret.push({ memory: mem, body: getTransportBody(cRoom), prio: 1, eTresh:0.9 });
      }
    
  }
  return ret;
}

function calculateStarterQue(colony: Colony): queData[] {
  let ret: queData[] = [];
  let cRoom = colony.room;
  let newColFlag = getFlagsInRoom(FLAG_NEW_COLONY, cRoom.name);
  if (newColFlag.length > 0)
    return [];
  for (const source of colony.memory.sourcesUsed) {
    const excist = _.filter(cRoom.getCreeps(creepT.STARTER), function (creep: Creep) { return creep.memory.permTarget != null && creep.memory.permTarget.ID == source });
    let nrExc = excist.length + nrCreepInQue(colony, creepT.STARTER);
    const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Resources[source].workPos, range: 0 };
    const mem: CreepMemory = { type: creepT.STARTER, creationRoom: colony.name, permTarget: targ, moveTarget: null, targetQue: [] };
    if (cRoom.energyCapacityAvailable < 550) {
      if (nrExc < Memory.Resources[source].maxUser * 2)
        ret.push({ memory: mem, body: getStarterBody(cRoom), prio: 1, eTresh: 0.9});
    }
    else {
      if (cRoom.energyCapacityAvailable < 800 && nrExc < 4)// the old limits does not mater when harvesters excist
        ret.push({ memory: mem, body: getStarterBody(cRoom), prio: 1, eTresh: 0.9 });
      else if (cRoom.energyCapacityAvailable >= 800 && nrExc < 3)// the old limits does not mater when harvesters excist
        ret.push({ memory: mem, body: getStarterBody(cRoom), prio: 1, eTresh: 0.9 });
    }
  }
  return ret;
}

function calculateHarvesterQue(colony: Colony): queData[] {
  let ret: queData[] = [];
  let cRoom = colony.room;
  if (cRoom.energyCapacityAvailable >= 550) {
    for (let source of colony.memory.sourcesUsed) {
      const current = _.filter(cRoom.getCreeps(creepT.HARVESTER), function (creep: Creep) { return creep.memory.permTarget != null && creep.memory.permTarget.ID == source });
      let nr = current.length + nrCreepInQue(colony, creepT.HARVESTER, source);
      if (nr == 0) {
        const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Resources[source].workPos, range: 0 };
        const mem: CreepMemory = {
          type: creepT.HARVESTER, creationRoom: colony.name, permTarget: targ, moveTarget: { pos: Memory.Resources[source].workPos, range: 0 }, targetQue: [targ]
        };
        ret.push({ memory: mem, body: getHarvesterBody(cRoom), prio: 1, eTresh: 0.9 });
      }
    }
  }
  if (cRoom.terminal && ret.length == 0 && cRoom.availEnergy > 4e4) {
    for (let source of colony.memory.mineralsUsed) {
      const min = Game.getObjectById(source) as Mineral | null;
      if (min && min.mineralAmount > 0) {
        const current = _.filter(cRoom.getCreeps(creepT.HARVESTER), function (creep: Creep) { return creep.memory.permTarget != null && creep.memory.permTarget.ID == source });
        let nr = current.length + nrCreepInQue(colony, creepT.HARVESTER, source);
        if (nr == 0) {
          const targ: targetData = { ID: source, type: targetT.SOURCE, pos: Memory.Resources[source].workPos, range: 0 };
          const mem: CreepMemory = { type: creepT.HARVESTER, creationRoom: colony.name, permTarget: targ, moveTarget: { pos: Memory.Resources[source].workPos, range: 0 }, targetQue: [targ] };
          ret.push({ memory: mem, body: Array(16).fill(WORK).concat([MOVE, MOVE, MOVE, MOVE]), prio: 1, eTresh: 0.9});
        }
      }
    }

  }
  return ret;
}

function calculateUpgraderQue(colony: Colony) {
  let cRoom = colony.room;
  if (colony.memory.controllerStoreID) {
    let store: StructureContainer | null = Game.getObjectById(colony.memory.controllerStoreID);
    if (store) {
      let limit = 1;
      let roomEne = 0;
      for (let sourceID of colony.memory.sourcesUsed) {
        roomEne += Memory.Resources[sourceID].AvailResource;
      }
      let controllerNeed = 0;
      if (colony.memory.controllerStoreID) {
        let req = colony.resourceHandler.getReq(colony.memory.controllerStoreID, RESOURCE_ENERGY);
        if (req) {
          controllerNeed = 2000 - req.amount();
        }
      }

      let range = 0
      let body: BodyPartConstant[] = Array(6).fill(WORK).concat([CARRY, MOVE, MOVE]);
      if (cRoom.storage && cRoom.energyCapacityAvailable >=1050) {
        body = Array(8).fill(WORK).concat([CARRY, CARRY, CARRY, MOVE, MOVE]);
        if (cRoom.storage.store.energy > 1e5 && cRoom.energyCapacityAvailable >=1250)
          body = Array(10).fill(WORK).concat([CARRY, CARRY, CARRY, MOVE, MOVE]);
        if (cRoom.storage.store.energy > 2e5 && cRoom.energyCapacityAvailable >= 1600)
          body = Array(12).fill(WORK).concat([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]);
        if (cRoom.storage.store.energy > 3e5 && cRoom.energyCapacityAvailable >= 2000)
          body = Array(15).fill(WORK).concat([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]);
      }
      if ((!cRoom.storage && roomEne > 4000 && controllerNeed < 500)) {
        limit = 2;
        range = 1;
      }
      if ((cRoom.storage && !cRoom.storage.my)) {
        limit = 3;
        range = 1;
      }

      let current = nrCreepInQue(colony, creepT.UPGRADER) + cRoom.getCreeps(creepT.UPGRADER).length;
      if (current < limit) {
        const targ: targetData = { ID: colony.controller.id, type: targetT.CONTROLLER, pos: store.pos, range: range };
        const mem: CreepMemory = { type: creepT.UPGRADER, creationRoom: colony.name, permTarget: targ, moveTarget: { pos: store.pos, range: range }, targetQue: [targ] };
        colony.queNewCreep(mem, body);
      }
    }
  }
}

function calculateBuilderQue(colony: Colony) {
  let cRoom = colony.room;
  if (cRoom.constructionSites.length > 0 && colony.memory.controllerStoreID) {
    let totalB = 0;
    for (let str of cRoom.constructionSites) {
      totalB += str.progressTotal - str.progress;
    }
    let limit = 0;
    if (cRoom.availEnergy > 2e3 || (cRoom.terminal && cRoom.terminal.store.energy > 10000))
      limit = 1;
    if (totalB >= 50000 && (cRoom.availEnergy > 2e4 || (cRoom.terminal && cRoom.terminal.store.energy > 20000)))//require that its enough of stuff to build for varrant 2
      limit = 2;
    let current = nrCreepInQue(colony, BUILDER) + cRoom.getCreeps(creepT.BUILDER).length;
    if (current < limit) {
      for (let i = current; i < limit; i++)
        colony.orderNewCreep(BUILDER);
      console.log(colony.name, "ordered new builders", limit - current);
    }
  }
}

function spawnCreep(que: queData[], spawner: StructureSpawn, colony: Colony, colonies: { [name: string]: Colony }): number {
  if (que.length > 0 && spawner.spawning == null) {
    const err = spawner.spawnCreep(que[0].body, "test1", { dryRun: true });
    if (err == OK) {
      if (que[0].memory.moveTarget == null && que[0].memory.targetQue.length > 0) {
        que[0].memory.moveTarget = { pos: que[0].memory.targetQue[0].pos, range: que[0].memory.targetQue[0].range };
      }
      let err = spawner.spawnCreep(que[0].body, PrettyPrintCreep(que[0].memory.type) + " " + getRandomName(), { memory: que[0].memory });
      if (err == OK) {
        spawner.memory.currentlySpawning = que[0];
        if (que[0].memory.type != creepT.HARVESTER && que[0].memory.type != creepT.TRANSPORTER && que[0].memory.type != creepT.UPGRADER)
          console.log("spawned", PrettyPrintCreep(que[0].memory.type), "at", spawner.room.name);

        colonies[spawner.room.name].forceUpdateEnergy = true;
        que.shift();
        colony.memory.inCreepEmergency = null;
        return 1;
      }
      else
        console.log("failed to spawn", PrettyPrintCreep(que[0].memory.type), " due to ", PrettyPrintErr(err));
    }
    else if (err != ERR_NOT_ENOUGH_ENERGY) {
      console.log(spawner.room.name, "spawn failed to spawn", PrettyPrintCreep(que[0].memory.type), PrettyPrintErr(err), "now removed: length, memory", que[0].body.length, JSON.stringify(que[0].memory));
      que.shift();
    }
  }
  return 0;
}

export function spawnFromReq(colony: Colony, colonies: { [name: string]: Colony }) {
  if (colony.room.availEnergy > 800 && colony.room.creepsAll.length > 2 && (colony.room.energyAvailable >= 1500 || colony.room.energyAvailable > 0.9 * colony.room.energyCapacityAvailable)) {
    for (let spawn of colony.spawns) {
      spawnCreep(colony.creepBuildQueRef, spawn, colony, colonies);
    }
  }
}

function isFailedEconomy(colony: Colony, spawns: StructureSpawn[]): void {
  let room = colony.room;
  if (colony.memory.inCreepEmergency == null && colony.controller.level>=3 ) {//until lvl 3 it should have a NewColonyHandler looking out for it or being the first colony it does not have help to get
    for (const spawn of spawns) {
      const spawning = spawn.spawning;
      if (spawning) {
        return;
      }
    }

    if ((room.getCreeps(HARVESTER).length > 0 && room.getCreeps(TRANSPORTER).length > 0) || room.getCreeps(STARTER).length > 1)
      return;
    if ((room.getCreeps(TRANSPORTER).length > 0 || room.getCreeps(STARTER).length > 0) && room.availEnergy > 800)
      return;
    console.log(colony.name, "is in emergency");
    colony.memory.inCreepEmergency = 0;
  }
}

export function RefreshQue(colony: Colony) {
  try {
    if (Game.time % 10) {
      let avail = false;
      for (let spawn of colony.spawns) {
        avail = spawn.spawning == null || avail;
      }
      if (avail) {
        calculateBuilderQue(colony);
        calculateUpgraderQue(colony);
      }
    }
  }
  catch (e) {
    console.log("refresh Que failed with", e);
  }
}

export function Spawner(colony: Colony, colonies: { [name: string]: Colony }) {
  try {
    let cRoom = colony.room;


    if (colony.spawns.length > 0) {
      isFailedEconomy(colony, colony.spawns);
      let starterQue: queData[] = [];
      if (colony.memory.controllerStoreID == null) {
        starterQue = calculateStarterQue(colony);
        if (starterQue.length > 0)
          spawnCreep(starterQue, colony.spawns[0], colony, colonies);
        return;
      }
      let harvestQue = calculateHarvesterQue(colony);

      let TransQue = calculateTransportQue(colony);

      for (let spawnID in colony.spawns) {
        let spawn = colony.spawns[spawnID];
        spawnCreep(harvestQue, spawn, colony, colonies);
        if (cRoom.availEnergy > 800) {
          spawnCreep(TransQue, spawn, colony, colonies);
        }
      }
    }
    //if (colony.memory.inCreepEmergency != null /*&& room.name != "E49N51"*/) {
    //  let starterQue = calculateStarterQue(colony);

    //  for (let room2ID in Game.rooms) {
    //    if (colony.memory.inCreepEmergency == 0 && starterQue.length > 0) {
    //      let room2 = Game.rooms[room2ID];
    //      starterQue[0].body = getStarterBody(room2);
    //      //if (room2.energyAvailable>)//need to compute cost
    //      var spawns2 = room2.find(FIND_MY_SPAWNS);
    //      for (let spawn2ID in spawns2) {
    //        colony.memory.inCreepEmergency = spawnCreep(starterQue, spawns2[spawn2ID], colony, colonies);
    //        if (colony.memory.inCreepEmergency > 0) {
    //          console.log(colony.name, "Emergency build of starter remotely from", room2.name);
    //        }
    //      }
    //    }

    //  }
    //}


  }
  catch (e) {
    console.log(colony.name, "failed to spawn", e);
  }


}
