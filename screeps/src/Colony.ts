import * as Mem from "Memory";

import { HARVESTER, TRANSPORTER, STARTER } from "Types/CreepType";
import * as targetT from "Types/TargetTypes"
import * as C from "Types/Constants"; 
import { profile } from "profiler/decorator";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

const ColonyMemoryDef: ColonyMemory = {
    outposts: [],
}

function refreshArray(array: any[]) {
    array = _.compact(_.map(array, obj => Game.getObjectById(obj.id)));
}

export class resourceRequest {
    id: string;
    resource: ResourceConstant;
    ThreshouldAmount: number;
    ThreshouldMax: number;
    creeps: string[];
    resOnWay: number;

    constructor(ID: string, iResource: ResourceConstant, iThreshould: number, iThreshouldMax : number, room:Room) {
        this.id = ID;
        this.resource = iResource;
        this.ThreshouldAmount = iThreshould;
        this.ThreshouldMax = iThreshouldMax
        this.resOnWay = 0;
        //this.creeps = [];
        this.creeps = _.filter(room.getCreeps(TRANSPORTER), function (obj) {
            return obj.alreadyTarget(ID);
        }).map((obj) => { return obj.name; });
        this.updateCreepD();
    }

    public amount(): number {
        let obj = Game.getObjectById(this.id) as AnyStoreStructure;
        if (obj)
            return obj.store[this.resource] + this.resOnWay;
        else
            return 0;
    }

    public updateCreepD() {
        this.resOnWay = 0;
        let creepsTmp = _.compact(_.map(this.creeps, obj => Game.creeps[obj]));
        this.creeps = [];
        for (let creep of creepsTmp) {
            this.resOnWay += creep.carry[this.resource];
            this.creeps.push(creep.name);
        }
    }

    public addTran(creep: Creep) {
        let already = _.find(this.creeps, (mCreep) => mCreep == creep.name);
    if (!already && creep.carry.energy > 0) {
        this.creeps.push(creep.name);
        this.resOnWay += creep.carry[this.resource];
    }
}
    public removeTran(creep: Creep) {
        let removed = _.remove(this.creeps, (mCreep) => mCreep == creep.name);
        if (removed.length > 0)
            this.resOnWay -= creep.carry[this.resource];
}
}
profiler.registerClass(resourceRequest, 'resourceRequest');

//interface resourcePush {
//    id: string;
//    resource: ResourceConstant;
//    MaxAmount: number
//    creeps: string[];
//}

//@profile
export class Colony {
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

    forceUpdateEnergy: boolean;
    spawnEnergyNeed: number;
    energyNeedStruct: targetData[];
    energyTransporters: Creep[];

    resourceRequests: { [id: string]: resourceRequest };
    resourcePush: { [id: string]: resourceRequest };

    public addEnergyTran(creep: Creep) {
        let already = _.find(this.energyTransporters, (mCreep) => mCreep.name == creep.name);
        if (!already && creep.carry.energy>0) {
            this.energyTransporters.push(creep);
            this.spawnEnergyNeed -= creep.carry.energy;
        }
    }
    public removeEnergyTran(creep: Creep) {      
        let removed = _.remove(this.energyTransporters, (mCreep) => mCreep.name == creep.name);
        if (removed.length > 0)
            this.spawnEnergyNeed += creep.carry.energy;
    }
    
    repairSites: string[];
    constructor(iRoom: Room) {
        if (!Memory.ColonyMem)//this is rare enough that I do ugly fix here
            Memory.ColonyMem = {};
        this.forceUpdateEnergy = false;
        this.room = iRoom;
        this.name = iRoom.name;
        this.memory = Mem.wrap(Memory.ColonyMem, this.name, ColonyMemoryDef);
        //global[this.name] = this;
        //global[this.name.toLowerCase()] = this;
        console.log(this.room.name,"recreate obj");
        this.outpostIDs = this.memory.outposts;
        this.controller = this.room.controller!;
        this.spawns = _.filter(this.room.myStructures, { structureType: STRUCTURE_SPAWN }) as StructureSpawn[];
        this.towers = _.filter(this.room.myStructures, { structureType: STRUCTURE_TOWER }) as StructureTower[];
        this.extensions = _.filter(this.room.myStructures, { structureType: STRUCTURE_EXTENSION }) as StructureExtension[];
        this.repairSites = [];
        this.computeLists(true);
        this.spawnEnergyNeed = 0;
        this.energyNeedStruct = [];
        this.energyTransporters = [];
        this.labs = [];

        this.resourceRequests = {};
        this.resourcePush = {};

        this.energyTransporters = _.filter(this.room.getCreeps(TRANSPORTER).concat(this.room.getCreeps(STARTER)), function (obj) {
            let ret = false;
            for (let target of obj.memory.targetQue) {//would be nice to have the same system for extensions as every thing else. Maybe with new que its possible to just que them up?
                ret = ret || target.type == targetT.POWERUSER && obj.carry.energy > 0;
            }
            return false;

        });
        this.refreshEnergyDemand(true);

        this.outposts = _.compact(_.map(this.outpostIDs, outpost => Game.rooms[outpost]));
    }

    public refresh() {
        this.room = Game.rooms[this.name];
        this.outposts = _.compact(_.map(this.outpostIDs, outpost => Game.rooms[outpost]));
        this.controller = this.room.controller!;
        //refreshArray(this.spawns);
        this.spawns = _.compact(_.map(this.spawns, obj => Game.getObjectById(obj.id))) as StructureSpawn[]
        //refreshArray(this.extensions);
        this.extensions = _.compact(_.map(this.extensions, obj => Game.getObjectById(obj.id))) as StructureExtension[];
        //refreshArray(this.energyTransporters);
        this.energyTransporters = _.compact(_.map(this.energyTransporters , obj => Game.creeps[obj.name]));

        this.towers = _.compact(_.map(this.towers, id => Game.getObjectById(id.id))) as StructureTower[];
        this.labs = _.compact(_.map(this.labs, id => Game.getObjectById(id.id))) as StructureLab[];
        this.computeLists();
        this.refreshEnergyDemand(this.forceUpdateEnergy);
        this.forceUpdateEnergy = false;
        
    }

    private computeLists(force?:boolean){
        try {
            if (Game.time % 100 == 0 || force) {
                let controller = this.controller;
                let structs = _.filter(this.room.structures, function (struct: Structure) {
                    return (struct.hits < controller.level * 100000) && (struct.hits < struct.hitsMax - 1000);
                });
                structs.sort(function (obj: Structure, obj2: Structure): number { return obj.hits - obj2.hits; });
                for (let struct of structs) {
                    this.repairSites.push(struct.id);
                }
            }
        } catch (e) { console.log(this.name, "failed repairSites", e); };
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
            let conStore = Game.getObjectById(this.room.memory.controllerStoreID!);
            if (conStore && this.resourceRequests[this.room.memory.controllerStoreID!] == null && (conStore as AnyStoreStructure).store.energy < 2000 - C.Controler_AllowedDef) {
                this.resourceRequests[this.room.memory.controllerStoreID!] = new resourceRequest(this.room.memory.controllerStoreID!, RESOURCE_ENERGY, 2000 - C.Controler_AllowedDef, 2000, this.room);
            }
            if (this.room.terminal && this.resourceRequests[this.room.terminal.id] == null && this.room.terminal.store.energy < C.TERMINAL_STORE - 800 && this.room.storage && this.room.storage.store.energy > C.TERMINAL_MIN_STORAGE) {
                this.resourceRequests[this.room.terminal.id] = new resourceRequest(this.room.terminal.id, RESOURCE_ENERGY, C.TERMINAL_STORE - 800, C.TERMINAL_STORE, this.room);
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
        for (let tower of this.towers) {
            try {
                if (room.hostiles.length > 0) {
                    tower.attack(room.hostiles[0]);
                }
                else if (this.repairSites.length > 0 && tower.energy > tower.energyCapacity * 0.5) {
                    let struct = Game.getObjectById(this.repairSites[0]) as Structure;
                    if (struct) {
                        tower.repair(struct);
                        if (struct.hits > struct.hitsMax - 100 || room.controller && (struct.hits >= room.controller.level * 100000))
                            this.repairSites.shift();
                    }
                    else {
                        console.log(room.name, "failed to find building, removing it");
                        this.repairSites.shift();
                    }
                }
                if (tower.store.getFreeCapacity(RESOURCE_ENERGY) > 300 && this.resourceRequests[tower.id] == null) {
                    this.resourceRequests[tower.id] = new resourceRequest(tower.id, RESOURCE_ENERGY, tower.energyCapacity - 300, tower.energyCapacity, room);
                }
            }
            catch (e) {
                console.log("CRASH",room.name,e)
            }
        }
    }

}
profiler.registerClass(Colony, 'Colony');
