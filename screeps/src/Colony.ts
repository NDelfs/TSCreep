import * as Mem from "Memory";
import { TowerOperation } from "Base/TowerOperation"
import { HARVESTER, TRANSPORTER, STARTER } from "Types/CreepType";
import * as targetT from "Types/TargetTypes"
import { profile } from "profiler/decorator";
//@ts-ignore
import profiler from "Profiler/screeps-profiler";

const ColonyMemoryDef: ColonyMemory = {
    outposts: [],
}

function refreshArray(array: any[]) {
    array = _.compact(_.map(array, obj => Game.getObjectById(obj.id)));
}


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

    forceUpdateEnergy: boolean;
    spawnEnergyNeed: number;
    energyNeedStruct: targetData[];
    energyTransporters: Creep[];
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
        console.log("recreate obj");
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

        this.energyTransporters = _.filter(this.room.getCreeps(TRANSPORTER).concat(this.room.getCreeps(STARTER)), function (obj) {
            if (obj.currentTarget) {
                return obj.currentTarget.type == targetT.POWERUSER && obj.carry.energy>0;
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
                    let uses = _.find(del, (creep) => creep.currentTarget && creep.currentTarget.ID == obj.id);
                    if (!uses)
                        this.energyNeedStruct.push({ ID: obj.id, type: targetT.POWERUSER, pos: obj.pos, range: 1 });
                }
            }
            for (let obj of this.extensions) {
                if (obj.energy < obj.energyCapacity) {
                    //this.spawnEnergyNeed -= obj.energyCapacity - obj.energy;
                    let uses = _.find(del, (creep) => creep.currentTarget && creep.currentTarget.ID == obj.id);
                    if (!uses)
                        this.energyNeedStruct.push({ ID: obj.id, type: targetT.POWERUSER, pos: obj.pos, range: 1 });
                }
            }
            for (let obj of this.towers) {
                if (obj.energy < obj.energyCapacity * 0.7) {
                    this.spawnEnergyNeed += obj.energyCapacity - obj.energy;
                    let uses = _.find(del, (creep) => creep.currentTarget && creep.currentTarget.ID == obj.id);
                    if (!uses)
                        this.energyNeedStruct.push({ ID: obj.id, type: targetT.POWERUSER, pos: obj.pos, range: 1 });
                }
            }
            //if (this.spawnEnergyNeed != 0 || this.room.memory.EnergyNeed != 0)
            //    console.log(this.name, "Total energy need new vs old", this.spawnEnergyNeed, this.room.memory.EnergyNeed, "struct new vs old", this.energyNeedStruct.length, this.room.memory.EnergyNeedStruct.length, "nr trans", this.energyTransporters.length);
        }
       // else
            //if (this.spawnEnergyNeed != 0 || this.room.memory.EnergyNeed != 0)
            //    console.log(this.name, "energy need new vs old", this.spawnEnergyNeed, this.room.memory.EnergyNeed, "struct new vs old", this.energyNeedStruct.length, this.room.memory.EnergyNeedStruct.length, "nr trans", this.energyTransporters.length);
    }

    runTowers() {
        TowerOperation(this.towers,this);
    }

}
profiler.registerClass(Colony, 'Colony');
