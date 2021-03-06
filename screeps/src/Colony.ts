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
import { BOOST, UNBOOST } from "Types/TargetTypes";
import { PrettyPrintErr } from "./utils/PrettyPrintErr";
import { ResourceHandler, resourceRequest } from "Base/Handlers/ResourceHandler";
import { BOOSTING, REACTREGENT } from "Types/Constants";
import { findPathToSource, serializePath } from "./utils/ColonyUtils";
import { countBodyPart } from "./utils/minorUtils";
import { BaseMineral } from "./Base/Market";


function getRandomInt(min: number, max: number) {
  return Math.floor(min + ((1 - min / max) * Math.random()) * Math.floor(max));
}

const ColonyMemoryDef: ColonyMemory = {
  colonyType: 2,
  outposts: [],
  closestBoostCol: null,
  figthInfo: null,
  inCreepEmergency: null,
  sourcesUsed: [],
  mineralsUsed: [],
  startSpawnPos: null,
  labPos: null,
  ExpandedLevel: 0,
  controllerStoreID: null,
  controllerLinkID: null,
  baseLinkID: null,
  wallEnergy: 0,
  boosts: [],
  creepBuildQue: [],
  labMem: {},
}

function refreshArray(array: any[]) {
  array = _.compact(_.map(array, obj => Game.getObjectById(obj.id)));
}


function updateObject<type>(id: string | null) {
  if (id) {
    let obj = Game.getObjectById(id) as type | null;
    return obj;
  }
  return null;
}

//@profile
export class Colony {
  mRebuild: number;
  memory: ColonyMemory;
  name: string;
  room: Room;
  outpostIDs: string[];//all rooms ids;
  outposts: Room[];
  closestBoostCol: Colony | null;
  controller: StructureController;
  controllerContainer: StructureContainer | null;
  controllerLink: StructureLink | null;
  baseLink: StructureLink | null;
  spawns: StructureSpawn[];
  towers: StructureTower[];
  extensions: StructureExtension[];
  labs: StructureLab[];
  nuker: StructureNuker | undefined;

  forceUpdateEnergy: boolean;
  spawnEnergyNeed: number;
  energyNeedStruct: targetData[];
  energyTransporters: Creep[];
  _energyAtSources: number;//just a tmp var

  resourceHandler: ResourceHandler
  resourceExternal: ResourceConstant[];
  resourceExternalPerm: ResourceConstant[];

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



  constructor(iRoom: Room) {
    if (!Memory.ColonyMem)//this is rare enough that I do ugly fix here
      Memory.ColonyMem = {};
    this.room = iRoom;
    this.name = iRoom.name;
    this.memory = Mem.wrap(Memory.ColonyMem, this.name, ColonyMemoryDef);
    
    this.creepBuildQueRef = this.memory.creepBuildQue;
    this.closestBoostCol = null;
    if (this.memory.closestBoostCol)
      this.closestBoostCol = Game.getObjectById(this.memory.closestBoostCol);

    this.mRebuild = getRandomInt(2000, 5000); //rebuil about every hour
    this.forceUpdateEnergy = false;
    this._energyAtSources = 0;
    global[this.name] = this;
    global[this.name.toLowerCase()] = this;
    this.outpostIDs = this.memory.outposts;
    this.controller = this.room.controller!;
    this.controllerContainer = updateObject<StructureContainer>(this.memory.controllerStoreID);
    this.controllerLink = updateObject<StructureLink>(this.memory.controllerLinkID);
    this.baseLink = updateObject<StructureLink>(this.memory.baseLinkID);

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
    for (let mem in this.memory.labMem) {//change this to the labMem instead
      let lab = Game.getObjectById(mem) as StructureLab | null;
      if (lab) {
        this.labs.push(lab);
      }
      else {
        break;
      }
    }
    findAndBuildLab(this, this.labs);

    this.resourceExternal = [];
    this.resourceExternalPerm = [];
    if (this.labs.length > 0)
      this.resourceExternalPerm.push(RESOURCE_LEMERGIUM_HYDRIDE);
  
    this.resourceHandler = new ResourceHandler(this.room, this.memory.boosts, this.labs);
    this.computeLists(true);
    this.energyTransporters = _.filter(this.room.getCreeps(TRANSPORTER).concat(this.room.getCreeps(STARTER)), function (obj) {
      let ret = false;
      for (let target of obj.memory.targetQue) {//would be nice to have the same system for extensions as every thing else. Maybe with new que its possible to just que them up?
        ret = ret || target.type == targetT.POWERUSER && obj.carry.energy > 0;
      }
      return ret;

    });
    this.refreshEnergyDemand(true);

    this.outposts = _.compact(_.map(this.outpostIDs, outpost => Game.rooms[outpost]));
    if (this.memory.startSpawnPos)
      expandResources(this, restorePos(this.memory.startSpawnPos));
    else if (this.spawns.length > 0) {
      this.memory.startSpawnPos = this.spawns[0].pos;
    }

    this.refreshDropPickup(this.room);
  }

  public refresh() {
    this._energyAtSources = -1;
    this.memory = Mem.wrap(Memory.ColonyMem, this.name, ColonyMemoryDef);
    this.creepBuildQueRef = this.memory.creepBuildQue;
    this.room = Game.rooms[this.name];
    this.outposts = _.compact(_.map(this.outpostIDs, outpost => Game.rooms[outpost]));
    this.controller = this.room.controller!;
    this.controllerContainer = updateObject<StructureContainer>(this.memory.controllerStoreID);
    this.controllerLink = updateObject<StructureLink>(this.memory.controllerLinkID);
    this.baseLink = updateObject<StructureLink>(this.memory.baseLinkID);
    if (this.nuker)
      this.nuker = Game.getObjectById(this.nuker.id) as StructureNuker;
    //refreshArray(this.spawns);
    this.spawns = _.compact(_.map(this.spawns, obj => Game.getObjectById(obj.id))) as StructureSpawn[];
    for (let spawn of this.spawns) {
      if (!spawn.spawning)
        spawn.memory.currentlySpawning = null;
    }
    if (this.memory.closestBoostCol)
      this.closestBoostCol = Game.getObjectById(this.memory.closestBoostCol);
    //refreshArray(this.extensions);
    this.extensions = _.compact(_.map(this.extensions, obj => Game.getObjectById(obj.id))) as StructureExtension[];
    //refreshArray(this.energyTransporters);
    this.energyTransporters = _.compact(_.map(this.energyTransporters, obj => Game.creeps[obj.name]));

    this.towers = _.compact(_.map(this.towers, id => Game.getObjectById(id.id))) as StructureTower[];
    this.labs = _.compact(_.map(this.labs, id => Game.getObjectById(id.id))) as StructureLab[];
    if (Game.time % 100) {
      findAndBuildLab(this, this.labs);
    }
    if (Game.time % 200 * this.controller.level == 0) {
      this.spawns = _.filter(this.room.myStructures, { structureType: STRUCTURE_SPAWN }) as StructureSpawn[];
      this.towers = _.filter(this.room.myStructures, { structureType: STRUCTURE_TOWER }) as StructureTower[];
      this.extensions = _.filter(this.room.myStructures, { structureType: STRUCTURE_EXTENSION }) as StructureExtension[];
    }
    this.resourceHandler.refresh();
    this.computeLists();
    this.refreshEnergyDemand(this.forceUpdateEnergy);
    this.forceUpdateEnergy = false;

    //this.resourceHandler.postRun();//should be moved to postrun

    this.lookForHostiles();
  }

  lookForHostiles() {
    if (this.room.hostiles.length >0) {
      
        let healingPower = 0;
      let target: string | null = null;
      let healT : string | null = null;
        for (let creep of this.room.hostiles) {
          let healP = creep.getActiveBodyparts(HEAL);
          healingPower = healingPower + healP * 12;//12,24,48   no boost, first, max
          if (healP == 0)
            target = creep.id;
          else
            healT = creep.id;
        }
      if (!target)
        target = healT;
        
      if (!this.memory.figthInfo) {
        this.memory.figthInfo = { target: target, healMult: 1, nrAttack: 0, healPower: healingPower, lastT: null };
      }
      else {
        this.memory.figthInfo.target = target;
        this.memory.figthInfo.healPower = healingPower;
      }
    }
    else {
      delete this.memory.figthInfo;
    }
}

  public computeWallList() {
    try {
      let walls = this.room.structures.filter((struct) => { return (struct.structureType == STRUCTURE_WALL || (struct.structureType == STRUCTURE_RAMPART && (struct as StructureRampart).my)) && struct.hits != undefined });
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
      const mem: CreepMemory = { type: creepT.BUILDER, creationRoom: this.name, curentRoom: this.name, permTarget: null, moveTarget: null, targetQue: [] };
      //this.creepRequest.push({ memory: mem, body: getBuilderBody(this.room) });
      this.queNewCreep(mem, getBuilderBody(this.room));
    }
  }

  public queNewCreep(creepMemory: CreepMemory, body: BodyPartConstant[]) {
    let data: queData = { memory: creepMemory, body: body, prio: 2, eTresh: 0.9 };
    //if (this.room.name == "E49N47") {
    this.queBoostCreep(data);
    if (data.memory.targetQue.length > 0 && data.memory.targetQue[0].type == BOOST)
      console.log(this.name, "called on boost Creep", data.memory.targetQue[0].resType, this.memory.boosts.length);
    //}
    this.creepBuildQueRef.push(data);
    if (this.creepBuildQueRef.length > 2) {
      this.creepBuildQueRef.sort((a, b) => { return a.prio - b.prio; });
      console.log("sorted que, first vs last prio", this.creepBuildQueRef[0].prio, this.creepBuildQueRef[2]);
    }
    
  }

  private computeLists(force?: boolean) {
    try {
      if (Game.time % 50 == 0 || force) {
        let emergstructs = _.filter(this.room.structures, function (struct: Structure) {
          return (struct.hits < struct.hitsMax && struct.hits < 1500);
        });

        emergstructs.sort(function (obj: Structure, obj2: Structure): number { return obj2.hits - obj.hits; });
        this.emergencyRepairSites = emergstructs.map((obj) => { return obj.id; });


        let structs = _.filter(this.room.structures, function (struct: Structure) {
          return (struct.hitsMax < 5e5) && (struct.hits < struct.hitsMax - 3000 && struct.hits < 0.6 * struct.hitsMax);
        });
        structs.sort((obj, obj2) => { return (obj2.hitsMax - obj2.hits) - (obj.hitsMax - obj.hits); });
        if (emergstructs.length > 0) {
          console.log(this.name, emergstructs[0].structureType, emergstructs[0].pos.x, emergstructs[0].pos.y, 'first has diff', emergstructs[0].hits, "second", _.last(emergstructs).hits);
          this.computeWallList();//if it excist that low it may be new built and we need it added fast
        }
        this.repairSites = structs.map((obj) => { return obj.id; });
      }
    } catch (e) { console.log(this.name, "failed repairSites", e); };

    if (this.room.storage && this.controller.level >=4) {
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
          const mem: CreepMemory = { type: creepT.BUILDER, creationRoom: this.name, curentRoom: this.name, permTarget: null, moveTarget: null, targetQue: [] };
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
      let def = C.Controler_AllowedDef;
      if (this.memory.controllerLinkID)
        def = 1000;
      if (conStore && this.resourceHandler.getReq(this.memory.controllerStoreID!, RESOURCE_ENERGY) == null && (conStore as AnyStoreStructure).store.energy < 2000 - def) {
        this.resourceHandler.addRequest(new resourceRequest(this.memory.controllerStoreID!, RESOURCE_ENERGY, 2000 - def, 2000, this.room));
      }
      if (this.room.terminal && this.room.terminal.my && this.resourceHandler.getReq(this.room.terminal.id, RESOURCE_ENERGY) == null && this.room.terminal.store.energy < C.TERMINAL_STORE - 800 && this.room.storage && this.room.storage.store.energy > C.TERMINAL_MIN_STORAGE) {
        this.resourceHandler.addRequest(new resourceRequest(this.room.terminal.id, RESOURCE_ENERGY, C.TERMINAL_STORE - 800, C.TERMINAL_STORE, this.room));
      }

      //if (this.spawnEnergyNeed != 0 || this.room.memory.EnergyNeed != 0)
      //    console.log(this.name, "Total energy need new vs old", this.spawnEnergyNeed, this.room.memory.EnergyNeed, "struct new vs old", this.energyNeedStruct.length, this.room.memory.EnergyNeedStruct.length, "nr trans", this.energyTransporters.length);
    }

    // else
    //if (this.spawnEnergyNeed != 0 || this.room.memory.EnergyNeed != 0)
    //    console.log(this.name, "energy need new vs old", this.spawnEnergyNeed, this.room.memory.EnergyNeed, "struct new vs old", this.energyNeedStruct.length, this.room.memory.EnergyNeedStruct.length, "nr trans", this.energyTransporters.length);
  }

  towerFirePower(tower: StructureTower, pos: RoomPosition) {
    return 600 - Math.min(Math.max(tower.pos.getRangeTo(pos) - 5, 0), 15) * 30;
  }

  runTowers() {
    let room = this.room;
    let hostileTarget: Creep | null = null;
    let firePower = 0;
    let healingPower = 0;
    let fInfo = this.memory.figthInfo;
    if (fInfo && fInfo.target) {
      hostileTarget = Game.getObjectById(fInfo.target);
      if (!hostileTarget)
        fInfo.target = null;
      else {
        if (fInfo.nrAttack > 0 && fInfo.lastT != fInfo.target) {
          fInfo.nrAttack = 0;
          fInfo.healPower = 1;
        }
        if (hostileTarget.hits == hostileTarget.hitsMax && fInfo!.nrAttack >= 5) {
          fInfo!.healMult++;
          fInfo!.nrAttack = 0;
        }
        for (let tower of this.towers) {
          firePower = firePower + this.towerFirePower(tower, hostileTarget.pos);
        }

        healingPower = fInfo!.healPower * fInfo!.healMult;
        if (firePower * 1.1 > healingPower) {
          fInfo!.nrAttack++;
          fInfo!.lastT = fInfo!.target;
        }
        else {
          fInfo!.nrAttack = 0;
        }
        console.log(this.name, "are under attack: healing vs firePower", healingPower, firePower, JSON.stringify(fInfo!));
      }
    }
    
    for (let tower of this.towers) {
      try {
        if (hostileTarget) {
          if (firePower*1.1 > healingPower) {
            tower.attack(hostileTarget);
            continue;
          }
          else {
            let struct = Game.getObjectById(this.wallSites[0].id) as Structure;
            if (struct && struct.hits < 5e5)
              tower.repair(struct);
          }

        }
        if (this.emergencyRepairSites.length > 0 && tower.energy > tower.energyCapacity * 0.5) {
          let struct = Game.getObjectById(this.emergencyRepairSites[0]) as Structure;
          if (struct) {
            tower.repair(struct);
            if (struct.hits > struct.hitsMax - 100 || struct.hits >= 5000)
              this.emergencyRepairSites.shift();
          }
          else {
            console.log(room.name, "failed to find building, removing it");
            this.emergencyRepairSites.shift();
          }
        }
        if (tower.store.getFreeCapacity(RESOURCE_ENERGY) > 300 && this.resourceHandler.getReq(tower.id, RESOURCE_ENERGY) == null) {
          this.resourceHandler.addRequest(new resourceRequest(tower.id, RESOURCE_ENERGY, tower.energyCapacity - 300, tower.energyCapacity, room));
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
      if (creepData.memory.type == creepT.BUILDER || (creepData.memory.type == creepT.STARTER && creepData.body.length > 29)) {//only externaly called starters are that big. Nice to get some help building in new places
        boostType = RESOURCE_LEMERGIUM_HYDRIDE;
        boostCost = countBodyPart(creepData.body, WORK) * 30;
      }
      if (creepData.memory.type == creepT.UPGRADER && this.name == "E46N47") {//should find what room to boost in depending on avail amount and current level of colony
        boostType = RESOURCE_CATALYZED_GHODIUM_ACID;
        boostCost = countBodyPart(creepData.body, WORK) * 30;
      }
      //create boost que and target
      if (boostType && this.room.terminal.store[boostType] >= boostCost) {

        let booster = this.memory.boosts.find(value => value.boost == boostType);
        if (booster) {
          booster.nrCreep += 1;
          booster.boostTime = Game.time;
        }
        else {
          let labNr = _.findLastIndex(this.labs, (val => val.memory.state == null));
          if (labNr) {
            booster = { boost: boostType, nrCreep: 1, labID: labNr, boostCost: boostCost, boostTime: Game.time };
            this.memory.boosts.push(booster);
            this.labs[labNr].memory.state = BOOSTING;
          }
        }
        let lab = this.labs[booster!.labID];
        let amount = booster!.boostCost * booster!.nrCreep;
        if (lab.store[booster!.boost] < amount) {
          let req = this.resourceHandler.getReq(lab.id, boostType);
          if (req) {
            req.ThreshouldHard += boostCost;
            req.ThreshouldAmount += boostCost;
          }
          else {
            this.resourceHandler.addRequest(new resourceRequest(lab.id, boostType, boostCost - 1, boostCost, this.room));
          }
          let reqEne = this.resourceHandler.getReq(lab.id, RESOURCE_ENERGY);
          if (reqEne) {
            reqEne.ThreshouldHard += boostCost;
            reqEne.ThreshouldAmount += boostCost;
          }
          else {
            this.resourceHandler.addRequest(new resourceRequest(lab.id, RESOURCE_ENERGY, boostCost - 1, boostCost, this.room));
          }
        }
        console.log(this.name, "new boost res req", JSON.stringify(this.resourceHandler._resourceRequests[this.labs[booster!.labID].id]));
        let boostTarget: targetData = { ID: lab.id, type: BOOST, pos: lab.pos, range: 1, targetVal: boostCost, resType: boostType };
        creepData.memory.targetQue.unshift(boostTarget);
      }
    }
    catch (e) {
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
        if (err == OK || err == ERR_NOT_ENOUGH_RESOURCES) {//the not enough res is such that the builder then can continue with its life. Still will be printed as err in log
          creep.completeTarget();
          boostInfo.nrCreep -= 1;
          console.log(this.name, "boosted", err, creep.name, PrettyPrintErr(err));
          if (boostInfo.nrCreep <= 0) {
            this.labs[boostInfo.labID].memory.state = null;
            _.remove(this.memory.boosts, value => value.boost == boostT);
          }
        }
        else {
          return err;
        }
      }
      else {
        if (!this.resourceHandler.getReq(this.labs[boostInfo.labID].id, boostInfo.boost)) {
          this.resourceHandler.addRequest(new resourceRequest(this.labs[boostInfo.labID].id, boostInfo.boost, boostInfo.boostCost - 1, boostInfo.boostCost, this.room));
          console.log(lab.room.name, "added late resource request due to missing resource for boost")
        }
        else {
          console.log(lab.room.name, "waiting for boost res");
        }
        return ERR_NOT_ENOUGH_RESOURCES;
      }

    }
    else
      throw ("failed to find boost" + boostT);

    return OK;
  }

  GetUnboostCreepTarget(creep: Creep): void {
    for (let lab of this.labs) {
      if (lab.memory.state == REACTREGENT && lab.cooldown == 0) {
        creep.addTargetFirst({ ID: lab.id, pos: lab.pos, range: 1, type: UNBOOST })
        console.log(this.name, "unboost target added to creep", JSON.stringify( lab.pos));
        return;
      }
    }
    console.log(this.name, "unboost target failed to find unboost lab");
  }

  public testPath(x2: number, y2: number, roomName?: string, maxOps?: number) {
    let start = new RoomPosition(x2, y2, roomName|| this.name);

    let pathObj = findPathToSource(this, start, maxOps);
    let myPath = serializePath(pathObj.path);
    console.log(pathObj.incomplete,"length", myPath.length - 4, "cost", pathObj.cost, myPath);
  }

  public energyAtSources() : number {
    if (this._energyAtSources >= 0)
      return this._energyAtSources;
    this._energyAtSources = 0;
    for (let sourceID of this.memory.sourcesUsed) {
      let mem = Memory.Resources[sourceID];
      if (mem.lastDropID) {
        let obj = Game.getObjectById(mem.lastDropID) as Resource | null;
        if (obj) {
          this._energyAtSources += obj.amount;
        }
        else {
          mem.lastDropID = null;
        }
      }
      if (mem.container) {
        let obj = Game.getObjectById(mem.container) as StructureContainer | null;
        if (obj) {
          this._energyAtSources += obj.store[RESOURCE_ENERGY];
        }
      }
    }
    return this._energyAtSources;
  }

  public energyAvail(): number {
    let availEnergy = 0
    if (this.room.storage) {
      availEnergy = this.room.storage.store[RESOURCE_ENERGY];
    }
    else {
      availEnergy = this.energyAtSources();
    }
    return availEnergy;
  }

  public refreshDropPickup(room: Room) {
    let drops = room.find(FIND_DROPPED_RESOURCES);
    for (let drop of drops) {
      if (!this.resourceHandler.resourcePush[drop.id]) {
        if ((drop.resourceType == RESOURCE_ENERGY || drop.resourceType in BaseMineral)) {
          if (drop.amount >= 600) {
            this.resourceHandler.resourcePush[drop.id] = new resourceRequest(drop.id, drop.resourceType, 400, 0, room,true);
            console.log("found and added a newly found droped resource", JSON.stringify(drop.pos));
          }
        }
        else {
          this.resourceHandler.resourcePush[drop.id] = new resourceRequest(drop.id, drop.resourceType, 0, 0, room,true);
          console.log("found and added a newly found droped resource", JSON.stringify(drop.pos));
        }
      }
    }
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

    let pathObj = findPathToSource(colony, pos);
    if (!pathObj.incomplete) {
      let newWorkPos = _.last(pathObj.path);
      let myPath = serializePath(pathObj.path);

      let mem: SourceMemory = {
        pos: source.pos,
        usedByRoom: homeRoomPos.roomName,
        maxUser: nrNeig,
        workPos: newWorkPos,
        path: myPath,
        pathCost: pathObj.cost,
        container: null,
        linkID: null,
        lastDropID: null,
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
    else {
      console.log("failed to fill in path information to source, did not add source information")
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
