import { HARVESTER, TRANSPORTER, STARTER } from "Types/CreepType";
import * as C from "Types/Constants"; 
// Room properties =====================================================================================================

Object.defineProperty(Room.prototype, 'my', {
    get() {
        return this.controller && this.controller.my;
    },
    configurable: true,
});

// Room properties: creeps =============================================================================================
// Creeps physically in the room
Object.defineProperty(Room.prototype, 'creepsInRoom', {
    get() {
        if (!this._creepsInRoom) {
            this._creepsInRoom = this.find(FIND_MY_CREEPS);
        }
        return this._creepsInRoom;
    },
    configurable: true,
});


Object.defineProperty(Room.prototype, 'creepsAll', {
    get() {
        if (!this._creepsAll) {
            let roomName = this.name;
            this._creepsAll = this.find(FIND_MY_CREEPS, { filter: (c:Creep) => c.creationRoom == roomName });
        }
        return this._creepsAll;
    },
    configurable: true,
});

Object.defineProperty(Room.prototype, 'creeps', {
    get() {
        if (!this._creeps) {
            this._creeps = _.groupBy(this.creepsAll, (c: Creep) => c.type);
        }
        return this._creeps;
    },
    configurable: true,
});

Room.prototype.getCreeps = function (creep: CreepConstant): Creep[] {
    return this.creeps[creep] || [];
}




Object.defineProperty(Room.prototype, 'hostiles', {
    get() {
        if (!this._hostiles) {
            this._hostiles = this.find(FIND_HOSTILE_CREEPS);
        }
        return this._hostiles;
    },
    configurable: true,
});

Object.defineProperty(Room.prototype, 'invaders', {
    get() {
        if (!this._invaders) {
            this._invaders = _.filter(this.hostiles, (creep: Creep) => creep.owner.username == 'Invader');
        }
        return this._invaders;
    },
    configurable: true,
});
// Room properties: structures =========================================================================================

Object.defineProperty(Room.prototype, 'constructionSites', {
    get() {
        if (!this._constructionSites) {
            this._constructionSites = this.find(FIND_MY_CONSTRUCTION_SITES);
        }
        return this._constructionSites;
    },
    configurable: true,
});

Object.defineProperty(Room.prototype, 'repairSites', {
    get() {
        try {
            if (Game.time % 100 == 0 && this._repairUpdate == null) {
                this._repairUpdate = true;
                this.memory._repairSites = [];
                let controller = this.controller;
                let structs = _.filter(this.structures, function (struct: Structure) {
                        return (struct.hits < controller.level * 100000) && (struct.hits < struct.hitsMax - 1000);
                });
                structs.sort(function (obj: Structure, obj2: Structure): number { return obj.hits - obj2.hits; });
                for (let struct of structs) {
                    this.memory._repairSites.push(struct.id);
                }
            }
        } catch (e){ console.log(this.name, "failed repairSites",e); };
        return this.memory._repairSites || [];
    },
    set(iVal : string[]) {
        this.memory._repairSites = iVal;
    },
    configurable: true,
});

//structures currently in the room
Object.defineProperty(Room.prototype, 'structures', {
    get() {
        if (!this._allStructures) {
            this._allStructures = this.find(FIND_STRUCTURES);
        }
        return this._allStructures;
    },
    configurable: true,
});

//structures currently in the room
Object.defineProperty(Room.prototype, 'myStructures', {
    get() {
        if (!this._myStructures) {
            this._myStructures = this.find(FIND_MY_STRUCTURES);
        }
        return this._myStructures;
    },
    configurable: true,
});

// Room properties: resources ===========================================================================================
Object.defineProperty(Room.prototype, 'availEnergy', {
    get() {
        if (!this._availEnergy) {
            let roomEne = 0;
            for (let sourceID of this.memory.sourcesUsed) {
                roomEne += Memory.Resources[sourceID].AvailResource;
            }
            if (this.storage)
                roomEne += this.storage.store.energy;
            this._availEnergy = roomEne;
        }
        return this._availEnergy;
    },
    configurable: true,
});

Object.defineProperty(Room.prototype, 'controllerStoreDef', {
    get() {
        if (!this._controllerStoreDef) {
            if (this.memory.controllerStoreID) {
                let store: StructureContainer | null = Game.getObjectById(this.memory.controllerStoreID);
                if (store) {
                    let ID = store.id;
                    let transporters = this.getCreeps(TRANSPORTER).concat(this.getCreeps(STARTER));
                    let def = store.storeCapacity - store.store.energy;
                    if (def > C.Controler_AllowedDef) {
                        this.memory.controllerStoreDef = def;
                        let transportersTmp = _.filter(transporters, function (creep: Creep) {
                            return creep.memory.currentTarget && creep.memory.currentTarget.ID == ID;
                        }) as Creep[];
                        for (let creep of transportersTmp) {
                            this.memory.controllerStoreDef -= creep.carry.energy;
                        }
                    }
                }
            }
        }
        return this._controllerStoreDef;
    },
    set(iVal : number) {
        this._controllerStoreDef = iVal;
    },
    configurable: true,
});

Object.defineProperty(Room.prototype, 'drops', {
    get() {
        if (!this._drops) {
            this._drops = _.groupBy(this.find(FIND_DROPPED_RESOURCES), (r: Resource) => r.resourceType);
        }
        return this._drops;
    },
    configurable: true,
});

Object.defineProperty(Room.prototype, 'droppedEnergy', {
    get() {
        return this.drops[RESOURCE_ENERGY] || [];
    },
    configurable: true,
});
