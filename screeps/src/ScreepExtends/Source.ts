Object.defineProperty(Source.prototype, 'memory', {
  get() {
    //console.log(this.id, Memory.Resources[this.id]);
    return Memory.Resources[this.id];
  },
  configurable: true,
});

Object.defineProperty(Mineral.prototype, 'memory', {
  get() {
    //console.log(this.id, Memory.Resources[this.id]);
    return Memory.Resources[this.id];
  },
  configurable: true,
});
