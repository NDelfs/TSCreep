
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
