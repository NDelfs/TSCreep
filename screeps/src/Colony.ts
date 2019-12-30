import * as Mem from "Memory";

import { HARVESTER, TRANSPORTER, STARTER, BUILDER } from "Types/CreepType";
import * as targetT from "Types/TargetTypes"
import * as creepT from "Types/CreepType";
import * as C from "Types/Constants";
import { profile } from "profiler/decorator";
import { findAndBuildLab } from "Base/BaseExpansion"
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
import { restorePos } from "./utils/posHelpers";
import { getBuilderBody } from "./Spawners/Spawner";
import { BOOST } from "Types/TargetTypes";
import { PrettyPrintErr } from "./utils/PrettyPrintErr";


function getRandomInt(min: number, max: number) {
  return Math.floor(min + ((1 - min / max) * Math.random()) * Math.floor(max));
}

const ColonyMemoryDef: ColonyMemory = {
  outposts: [],
  inCreepEmergency: null,
  sourcesUsed: [],
  mineralsUsed: [],
  startSpawnPos: null,
  ExpandedLevel: 0,
  controllerStoreID: null,
  wallEnergy: 0,
  boosts: [],
  creepBuildQue: [],
  labMemories: [],
}

function refreshArray(array: any[]) {
  array = _.compact(_.map(array, obj => Game.getObjectById(obj.id)));
}

export class resourceRequest {
  id: string;
  resource: ResourceConstant;
  ThreshouldAmount: number;//if its acceptable to end early
  ThreshouldHard: number;//the absolute value requested
  creeps: string[];
  resOnWay: number;
  createdTime: number;

  constructor(ID: string, iResource: ResourceConstant, iThreshould: number, iThreshouldMax: number, room: Room) {
    this.id = ID;
    this.createdTime = Game.time;
    this.resource = iResource;
    this.ThreshouldAmount = iThreshould;
    this.ThreshouldHard = iThreshouldMax
    this.resOnWay = 0;
    //this.creeps = [];
    this.creeps = _.filter(room.getCreeps(TRANSPORTER), function (obj) {
      return obj.alreadyTarget(ID);
    }).map((obj) => { return obj.name; });
    this.updateCreepD();
  }

  public amount(): number {
    let obj = Game.getObjectById(this.id) as AnyStoreStructure;
    if (obj) {
      if (this.ThreshouldHard > this.ThreshouldAmount)
        return obj.store[this.resource] + this.resOnWay;
      else
        return obj.store[this.resource] - this.resOnWay;
    }
    else
      return 0;
  }

  public updateCreepD() {
    this.resOnWay = 0;
    let creepsTmp = _.compact(_.map(this.creeps, obj => Game.creeps[obj]));
    this.creeps = [];
    for (let creep of creepsTmp) {
      let found = false;
      for (let targ of creep.memory.targetQue) {
        if (targ.ID == this.id) {
          this.resOnWay += creep.carry[this.resource];
          this.creeps.push(creep.name);
          found = true;
        }
      }
      if (!found) {
        console.log(creep.room.name, creep.name, "where not activly working for resource anymore", this.resource, this.id);
      }
    }
  }

  public addTran(creep: Creep, preknownAmount?: number) {
    let already = _.find(this.creeps, (mCreep) => mCreep == creep.name) || false;
    if (!already) {
      this.creeps.push(creep.name);
      this.resOnWay += preknownAmount || creep.carry[this.resource];
    }
  }
  public removeTran(creep: Creep, preknownAmount?: number) {
    let removed = _.remove(this.creeps, (mCreep) => mCreep == creep.name);
    if (removed.length > 0) {
      this.resOnWay -= preknownAmount || creep.carry[this.resource];
      if (this.resOnWay < 0) {
        console.log(creep.room.name, "res on way went negative, carry", creep.carry[this.resource], preknownAmount || creep.carry[this.resource]);
        this.resOnWay = Math.max(this.resOnWay, 0);
      }
    }
    if (this.creeps.length == 0)
      this.resOnWay = 0;
  }
}
profiler.registerClass(resourceRequest, 'resourceRequest');

export function countBodyPart(body: BodyPartConstant[], type: BodyPartConstant): number {
  let ret = 0;
  for (let part of body) {
    ret += part == type ? 1 :0;
  }
  return ret;
}

//@profile
export class Colony {
  mRebuild: number;
  memory: ColonyMemory;
  name: string;
  room: Room;
  outpostIDs: string[];//all rooms ids;
  outposts: Room[];
  controller: StructureController;
  spawns: StructureSpawn[];
  towers: StructureTower[];
  extensions: StructureExtension[];
  labs: StructureLab[];
  nuker: StructureNuker | undefined;

  forceUpdateEnergy: boolean;
  spawnEnergyNeed: number;
  energyNeedStruct: targetData[];
  energyTransporters: Creep[];

  _resourceRequests: { [id: string]: resourceRequest[] };
  resourcePush: { [id: string]: resourceRequest };
  resourceExternal: ResourceConstant[];

  creepBuildQueRef: queData[];

  public addEnergyTran(creep: Creep, preknownAmount?: number) {
    let already = _.find(this.energyTransporters, (mCreep) => mCreep.name == creep.name);
    if (!already) {
      this.energyTransporters.push(creep);
      this.spawnEnergyNeed -= preknownAmount || creep.carry.energy;
    }
  }
  public removeEnergyTran(creep: Creep) {
    let removed = _.remove(this.energyTransporters, (mCreep) => mCreep.name == creep.name);
    if (removed.length > 0)
      this.spawnEnergyNeed += creep.carry.energy;
  }

  //mRepairTargets: { ID: string, healtTarget: number }[];
  emergencyRepairSites: string[];
  repairSites: string[];
  wallSites: { id: string, newHits: number }[];

  public getReq(id: string, res: ResourceConstant): resourceRequest | undefined {
    if (this._resourceRequests[id])
      return this._resourceRequests[id].find((req) => { return req.resource == res });
    return undefined;
  }

  public removeTranReq(id: string, res: ResourceConstant, creep: Creep) {
    let req = this.getReq(id, res);
    if (req) {
      let targetObj = Game.getObjectById(id) as AnyStoreStructure;
      if (req.creeps.length == 1 && targetObj.store[req.resource] + req.resOnWay >= req.ThreshouldHard) {
        _.remove(this._resourceRequests[id], (req) => { return req.resource == res });
      }
      else {
        req.removeTran(creep);
      }
    }
    else
      console.log("tried to use a target req that is already deleted")
  }

  public addRequest(req: resourceRequest) {
    if (this._resourceRequests[req.id] == null)
      this._resourceRequests[req.id] = [];
    this._resourceRequests[req.id].push(req);
  }

  rebuildBoostResourceReq(boosts: BoostMemory[], labs: StructureLab[]) {
    try {
      for (let boost of boosts) {
        let amount = boost.boostCost * boost.nrCreep;
        let lab = labs[boost.labID];
        if (lab.store[boost.boost] < amount) {
          this.addRequest(new resourceRequest(lab.id, boost.boost, amount - 1, amount, this.room));
        }
        if (lab.store.energy < amount) {
          this.addRequest(new resourceRequest(lab.id, RESOURCE_ENERGY, amount - 1, amount, this.room));
        }
        console.log(this.name, "rebuild boost res req", JSON.stringify(this._resourceRequests[lab.id]));
      }
    }
    catch (e) {
      console.log("failed to rebuild boost req", e);
    }
  }

  constructor(iRoom: Room) {
    if (!Memory.ColonyMem)//this is rare enough that I do ugly fix here
      Memory.ColonyMem = {};
    this.room = iRoom;
    this.name = iRoom.name;
    this.memory = Mem.wrap(Memory.ColonyMem, this.name, ColonyMemoryDef);
    if (!this.memory.creepBuildQue) {//for first time running new code, can be deleted when code have been live
      this.memory.creepBuildQue = [];
      this.memory.boosts = [];
    }
    if (!this.memory.labMemories) {
      this.memory.labMemories=[];
    }
    this.creepBuildQueRef = this.memory.creepBuildQue;


    this.mRebuild = getRandomInt(2000, 5000); //rebuil about every hour
    this.forceUpdateEnergy = false;

    global[this.name] = this;
    global[this.name.toLowerCase()] = this;
    this.outpostIDs = this.memory.outposts;
    this.controller = this.room.controller!;

    this.nuker = this.room.myStructures.find((struct) => { return struct.structureType == STRUCTURE_NUKER; }) as StructureNuker | undefined;
    this.spawns = _.filter(this.room.myStructures, { structureType: STRUCTURE_SPAWN }) as StructureSpawn[];
    this.towers = _.filter(this.room.myStructures, { structureType: STRUCTURE_TOWER }) as StructureTower[];
    this.extensions = _.filter(this.room.myStructures, { structureType: STRUCTURE_EXTENSION }) as StructureExtension[];
    this.repairSites = [];
    this.emergencyRepairSites = [];
    this.wallSites = [];
    this.spawnEnergyNeed = 0;
    this.energyNeedStruct = [];
    this.energyTransporters = [];
    this.labs = [];
    for (let mem of this.memory.labMemories) {
      let lab = Game.getObjectById(mem.ID) as StructureLab | null;
      if (lab) {
        this.labs.push(lab);
      }
      else {
        break;
      }
    }
    findAndBuildLab(this, this.labs);

    this._resourceRequests = {};
    this.resourcePush = {};
    this.resourceExternal = [];
    this.rebuildBoostResourceReq(this.memory.boosts, this.labs);//this is needed as long as we do not save the requests
    this.computeLists(true);
    this.energyTransporters = _.filter(this.room.getCreeps(TRANSPORTER).concat(this.room.getCreeps(STARTER)), function (obj) {
      let ret = false;
      for (let target of obj.memory.targetQue) {//would be nice to have the same system for extensions as every thing else. Maybe with new que its possible to just que them up?
        ret = ret || target.type == targetT.POWERUSER && obj.carry.energy > 0;
      }
      return false;

    });
    this.refreshEnergyDemand(true);

    this.outposts = _.compact(_.map(this.outpostIDs, outpost => Game.rooms[outpost]));
    expandResources(this, this.spawns[0].pos);
  }

  public refresh() {
    this.memory = Mem.wrap(Memory.ColonyMem, this.name, ColonyMemoryDef);
    this.creepBuildQueRef = this.memory.creepBuildQue;
    this.room = Game.rooms[this.name];
    this.outposts = _.compact(_.map(this.outpostIDs, outpost => Game.rooms[outpost]));
    this.controller = this.room.controller!;
    if (this.nuker)
      this.nuker = Game.getObjectById(this.nuker.id) as StructureNuker;
    //refreshArray(this.spawns);
    this.spawns = _.compact(_.map(this.spawns, obj => Game.getObjectById(obj.id))) as StructureSpawn[]
    //refreshArray(this.extensions);
    this.extensions = _.compact(_.map(this.extensions, obj => Game.getObjectById(obj.id))) as StructureExtension[];
    //refreshArray(this.energyTransporters);
    this.energyTransporters = _.compact(_.map(this.energyTransporters, obj => Game.creeps[obj.name]));

    this.towers = _.compact(_.map(this.towers, id => Game.getObjectById(id.id))) as StructureTower[];
    this.labs = _.compact(_.map(this.labs, id => Game.getObjectById(id.id))) as StructureLab[];
    if (Game.time % 100) {
      findAndBuildLab(this, this.labs);

      for (let reqID in this._resourceRequests) {//clean up resource requests
        let reqs = this._resourceRequests[reqID];
        _.remove(reqs, (req) => { return req.createdTime > Game.time + 1000 });
      }
    }

    this.computeLists();
    this.refreshEnergyDemand(this.forceUpdateEnergy);
    this.forceUpdateEnergy = false;

    if (this.memory.controllerStoreID == null) {//maybe can be done more rarely?
      let con = this.controller.pos.findInRange(FIND_STRUCTURES, 2, { filter: { structureType: STRUCTURE_CONTAINER } });
      if (con.length > 0 && con[0].isActive()) {
        this.memory.controllerStoreID = con[0].id;
      }
    }
  }



  public computeWallList() {
    try {
    let walls = this.room.structures.filter((struct) => { return (struct.structureType == STRUCTURE_WALL || struct.structureType == STRUCTURE_RAMPART) && struct.hits != undefined });
    this.wallSites = [];
    if (walls.length > 0) {
      walls.sort((a, b) => { return a.hits - b.hits });
      let lastHit = _.last(walls).hits;
      for (let wall of walls) {
        let upgradeAmount = Math.min(Math.max(lastHit - wall.hits, 1e5), 2e5);
        if (this.wallSites.length > 0)
          _.last(this.wallSites).newHits = Math.max(_.last(this.wallSites).newHits, wall.hits);
        this.wallSites.push({ id: wall.id, newHits: wall.hits + upgradeAmount });
      }
      //console.log(this.name, "first have", walls[0].hits, "last have", _.last(walls).hits, "new hits =", this.wallSites[0].newHits);

      }
    } catch (e) {
      console.log("find wall sites failed", e);
    }
  }

  public orderNewCreep(type: CreepConstant) {
    if (type == BUILDER) {
      const mem: CreepMemory = { type: creepT.BUILDER, creationRoom: this.name, permTarget: null, moveTarget: null, targetQue: [] };
      //this.creepRequest.push({ memory: mem, body: getBuilderBody(this.room) });
      this.queNewCreep(mem, getBuilderBody(this.room));
    }
  }

  public queNewCreep(creepMemory: CreepMemory, body: BodyPartConstant[]) {
    let data: queData = { memory: creepMemory, body: body };
    if (this.room.name == "E49N47") {
      this.queBoostCreep(data);
      console.log("called on boost Creep", this.memory.boosts.length);
    }
    this.creepBuildQueRef.push(data);
  }

  private computeLists(force?: boolean) {
    try {
      if (Game.time % 100 == 0 || force) {
        let emergstructs = _.filter(this.room.structures, function (struct: Structure) {
          return (struct.hits < struct.hitsMax && struct.hits < 1500);
        });

        emergstructs.sort(function (obj: Structure, obj2: Structure): number { return obj2.hits - obj.hits; });
        this.emergencyRepairSites = emergstructs.map((obj) => { return obj.id; });


        let structs = _.filter(this.room.structures, function (struct: Structure) {
          return (struct.hitsMax < 5e5) && (struct.hits < struct.hitsMax - 3000 && struct.hits < 0.6 * struct.hitsMax);
        });
        structs.sort((obj, obj2) => { return (obj2.hitsMax - obj2.hits) - (obj.hitsMax - obj.hits); });
        if (emergstructs.length > 0)
          console.log(this.name, emergstructs[0].structureType, emergstructs[0].pos.x, emergstructs[0].pos.y, 'first has diff', emergstructs[0].hits, "second", _.last(emergstructs).hits);
        this.repairSites = structs.map((obj) => { return obj.id; });
      }
    } catch (e) { console.log(this.name, "failed repairSites", e); };

    if (this.room.storage) {
      let timeBetween = 1e4;
      let proportion = 0.05;
      try {
        if ((Game.time % timeBetween) == 0) {//1e4 ticks => container lose 1e5 of 2.5e5. Rampart loses 3e4 and roads loses 1k (5k on swamp) of 5k (25k on swamp)
          this.memory.wallEnergy = Math.max(0, this.memory.wallEnergy) + this.memory.sourcesUsed.length * 10 * proportion * timeBetween; //for a single room this give 1e/s
          console.log(this.name, "posible wall energy is now", this.memory.wallEnergy, "added", this.memory.sourcesUsed.length * 10 * proportion * timeBetween);
        }

        if ((Game.time % 2500) == 0 && this.memory.wallEnergy > 5000) {//1e4 ticks => container lose 1e5 of 2.5e5. Rampart loses 3e4 and roads loses 1k (5k on swamp) of 5k (25k on swamp)
          //this.memory.wallEnergy = 0;

          //let nrBuilders = Math.floor(Math.min(this.memory.wallEnergy / 1e4, this.room.storage.store.energy / 1e4));
          //console.log(this.name, "nr builders =", nrBuilders, this.memory.wallEnergy / 1e4, this.room.storage.store.energy / 1e4);
          //for (let i = 0; i < nrBuilders; i++) {
          const mem: CreepMemory = { type: creepT.BUILDER, creationRoom: this.name, permTarget: null, moveTarget: null, targetQue: [] };
          //this.creepRequest.push({ memory: mem, body: getBuilderBody(this.room) });
          this.queNewCreep(mem, getBuilderBody(this.room));
          //}
        }
      } catch (e) {
        console.log("create wall builder failed", e);
      }
      if ((Game.time % 2500) == 0 || force) {
        this.computeWallList();
      }
    }

  }


  public refreshEnergyDemand(force?: boolean) {
    if (Game.time % 10 == 0 || force) {
      this.energyNeedStruct = [];
      this.spawnEnergyNeed = this.room.energyCapacityAvailable - this.room.energyAvailable;

      let del = this.energyTransporters;
      for (let creep of del) {
        this.spawnEnergyNeed -= creep.carry.energy;
      }

      for (let obj of this.spawns) {
        if (obj.energy < obj.energyCapacity) {
          //this.spawnEnergyNeed -= obj.energyCapacity - obj.energy;
          let uses = _.find(del, (creep) => creep.alreadyTarget(obj.id));
          if (!uses)
            this.energyNeedStruct.push({ ID: obj.id, type: targetT.POWERUSER, resType: RESOURCE_ENERGY, pos: obj.pos, range: 1 });
        }
      }
      for (let obj of this.extensions) {
        if (obj.energy < obj.energyCapacity) {
          //this.spawnEnergyNeed -= obj.energyCapacity - obj.energy;
          let uses = _.find(del, (creep) => creep.alreadyTarget(obj.id));
          if (!uses)
            this.energyNeedStruct.push({ ID: obj.id, type: targetT.POWERUSER, resType: RESOURCE_ENERGY, pos: obj.pos, range: 1 });
        }
      }
      //for (let obj of this.towers) {
      //    if (obj.energy < obj.energyCapacity * 0.7) {
      //        this.spawnEnergyNeed += obj.energyCapacity - obj.energy;
      //        let uses = _.find(del, (creep) => creep.currentTarget && creep.currentTarget.ID == obj.id);
      //        if (!uses)
      //            this.energyNeedStruct.push({ ID: obj.id, type: targetT.POWERUSER, pos: obj.pos, range: 1 });
      //    }
      //}
      let conStore = Game.getObjectById(this.memory.controllerStoreID!);
      if (conStore && this.getReq(this.memory.controllerStoreID!, RESOURCE_ENERGY) == null && (conStore as AnyStoreStructure).store.energy < 2000 - C.Controler_AllowedDef) {
        this.addRequest(new resourceRequest(this.memory.controllerStoreID!, RESOURCE_ENERGY, 2000 - C.Controler_AllowedDef, 2000, this.room));
      }
      if (this.room.terminal && this.getReq(this.room.terminal.id, RESOURCE_ENERGY) == null && this.room.terminal.store.energy < C.TERMINAL_STORE - 800 && this.room.storage && this.room.storage.store.energy > C.TERMINAL_MIN_STORAGE) {
        this.addRequest(new resourceRequest(this.room.terminal.id, RESOURCE_ENERGY, C.TERMINAL_STORE - 800, C.TERMINAL_STORE, this.room));
      }

      //if (this.spawnEnergyNeed != 0 || this.room.memory.EnergyNeed != 0)
      //    console.log(this.name, "Total energy need new vs old", this.spawnEnergyNeed, this.room.memory.EnergyNeed, "struct new vs old", this.energyNeedStruct.length, this.room.memory.EnergyNeedStruct.length, "nr trans", this.energyTransporters.length);
    }
  
    // else
    //if (this.spawnEnergyNeed != 0 || this.room.memory.EnergyNeed != 0)
    //    console.log(this.name, "energy need new vs old", this.spawnEnergyNeed, this.room.memory.EnergyNeed, "struct new vs old", this.energyNeedStruct.length, this.room.memory.EnergyNeedStruct.length, "nr trans", this.energyTransporters.length);
  }

  runTowers() {
    let room = this.room;
    let healer = false;
    if (room.hostiles.length > 0) {
      for (let creep of room.hostiles) {
        if (creep.getActiveBodyparts(HEAL) > 0)
          healer = true;
      }
    }
    for (let tower of this.towers) {
      try {
        if (room.hostiles.length > 0) {
          if (!healer) {
              tower.attack(room.hostiles[0]);
              continue;
          }
           else {
              if (Game.time % 100 == 0)
                this.computeWallList();
              let struct = Game.getObjectById(this.wallSites[0].id) as Structure;
              if (struct && struct.hits < 5e5)
                tower.repair(struct);
            }
          
        }
        if (this.emergencyRepairSites.length > 0 && tower.energy > tower.energyCapacity * 0.5) {
          let struct = Game.getObjectById(this.emergencyRepairSites[0]) as Structure;
          if (struct) {
            tower.repair(struct);
            if (struct.hits > struct.hitsMax - 100 || room.controller && (struct.hits >= room.controller.level * 100000))
              this.emergencyRepairSites.shift();
          }
          else {
            console.log(room.name, "failed to find building, removing it");
            this.emergencyRepairSites.shift();
          }
        }
        if (tower.store.getFreeCapacity(RESOURCE_ENERGY) > 300 && this.getReq(tower.id,RESOURCE_ENERGY) == null) {
          this.addRequest(new resourceRequest(tower.id, RESOURCE_ENERGY, tower.energyCapacity - 300, tower.energyCapacity, room));
        }
      }
      catch (e) {
        console.log("CRASH", room.name, e)
      }
    }
  }

  public queBoostCreep(creepData: queData): void {
    if (!this.room.terminal || this.labs.length == 0) {
      return;
    }
    try {
      let boostType: MineralBoostConstant | null = null;
      let boostCost = 1e9;
      if (creepData.memory.type == creepT.BUILDER) {
        boostType = RESOURCE_LEMERGIUM_HYDRIDE;
        boostCost = countBodyPart(creepData.body, WORK) * 30;
      }

      //create boost que and target
      if (boostType && this.room.terminal.store[boostType] >= boostCost) {

        let booster = this.memory.boosts.find(value => value.boost == boostType);
        if (booster) {
          booster.nrCreep += 1;
        }
        else {
          let labNr = _.findLastIndex(this.memory.labMemories, (val => val.state == null));
          if (labNr) {
            booster = { boost: boostType, nrCreep: 1, labID: labNr, boostCost: boostCost };
            this.memory.boosts.push(booster);
          }
        }
        let lab = this.labs[booster!.labID];
        let amount = booster!.boostCost * booster!.nrCreep;
        if (lab.store[booster!.boost] < amount) {
          let req = this.getReq(lab.id, boostType );
          if (req) {
            req.ThreshouldHard += boostCost;
            req.ThreshouldAmount += boostCost;
          }
          else {
            this.addRequest(new resourceRequest(lab.id, boostType, boostCost - 1, boostCost, this.room));
          }
          let reqEne = this.getReq(lab.id, RESOURCE_ENERGY);
          if (reqEne) {
            reqEne.ThreshouldHard += boostCost;
            reqEne.ThreshouldAmount += boostCost;
          }
          else {
            this.addRequest(new resourceRequest(lab.id, RESOURCE_ENERGY, boostCost - 1, boostCost, this.room));
          }
        }
        console.log(this.name, "new boost res req", JSON.stringify(this._resourceRequests[this.labs[booster!.labID].id]));
        let boostTarget: targetData = { ID: lab.id, type: BOOST, pos: lab.pos, range: 1, targetVal: boostCost, resType: boostType };
        creepData.memory.targetQue.unshift(boostTarget);
      }
    }
    catch(e){
      console.log(this.name, 'que boost failed', e);
    }
  }

  boostCreep(creep: Creep, target: targetData): number {
    let boostT = target.resType;
    let boostInfo = this.memory.boosts.find(value => value.boost == boostT);
    console.log(this.room.name, "in place for boost", boostT, JSON.stringify(boostInfo));
    if (boostInfo) {
      let lab = this.labs[boostInfo.labID];
      if (lab.store[boostInfo.boost] >= target.targetVal!) {
        let err = this.labs[boostInfo.labID].boostCreep(creep);
        if (err == OK) {
          creep.completeTarget();
          boostInfo.nrCreep -= 1;
          console.log(this.name, "boosted", creep.name, PrettyPrintErr(err));
          if (boostInfo.nrCreep <= 0) {
            _.remove(this.memory.boosts, value => value.boost == boostT);
          }
        }
        else {
          return err;
        }
      }
      else {
        console.log(lab.room.name, "waiting for boost res");
        return ERR_NOT_ENOUGH_RESOURCES;
      }

    }
    else
      throw ("failed to find boost" + boostT);

    return OK;
  }
}
profiler.registerClass(Colony, 'Colony');




function addSources(colony: Colony, homeRoomPos: RoomPosition, findType: FIND_MINERALS | FIND_SOURCES) {
  const sources = colony.room.find(findType);
  console.log("nrSources", sources.length);
  if (sources.length == 0)
    return;
  if (findType == FIND_MINERALS) {
    console.log("addSource 1", sources.length);
  }
  for (const source of sources) {
    let pos = source.pos;
    let nrNeig = 0;
    let res = colony.room.lookForAtArea(LOOK_TERRAIN, pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
    for (let [ind, spot] of Object.entries(res)) {
      nrNeig += Number(spot.terrain != "wall");
    }
    let goal = { pos: pos, range: 1 };
    let pathObj = PathFinder.search(homeRoomPos, goal);//ignore object need something better later. cant use for desirialize
    let newWorkPos = _.last(pathObj.path);
    let mem: SourceMemory = {
      pos: source.pos,
      usedByRoom: homeRoomPos.roomName,
      maxUser: nrNeig,
      workPos: newWorkPos,
      container: null,
      linkID: null,
      AvailResource: 0,
      nrUsers: 0,
      resourceType: RESOURCE_ENERGY,
    };

    if (findType == FIND_SOURCES) {
      Memory.Resources[source.id] = mem;
      colony.memory.sourcesUsed.push(source.id);
    }
    else if (findType == FIND_MINERALS) {
      let min = source as Mineral;
      mem.resourceType = min.mineralType;
      Memory.Resources[source.id] = mem;
      colony.memory.mineralsUsed.push(source.id);
    }
  }
}

function expandResources(homeRoom: Colony, centrePos: RoomPosition) {//should loop through outposts also
  if (homeRoom.memory.sourcesUsed.length == 0) {
    addSources(homeRoom, centrePos, FIND_SOURCES);
  }
  if (homeRoom.memory.mineralsUsed.length == 0) {
    addSources(homeRoom, centrePos, FIND_MINERALS);
  }
}
