Object.defineProperty(StructureLab.prototype, 'memory', {
  get() {
    return global[this.room.name].memory.labMem[this.id];
  },
  configurable: true,
});
