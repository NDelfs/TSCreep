Object.defineProperty(StructureLab.prototype, 'memory', {
  get() {
    //console.log(this.id, Memory.Resources[this.id]);
    return global[this.room.name].memory.labMem[this.id];
  },
  configurable: true,
});
