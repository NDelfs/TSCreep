
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
