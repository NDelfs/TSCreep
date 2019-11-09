
Object.defineProperty(Creep.prototype, 'type', {
    get() {
        return this.memory.type;
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'creationRoom', {
    get() {
        return this.memory.creationRoom;
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'carryAmount', {
    get() {
        if (!this._carryAmount) {
            this._carryAmount = _.sum(this.carry);
        }
        return this._carryAmount;
    },
     configurable: true,
});
