Object.defineProperty(Resource.prototype, 'store', {
  get() {
    let store: { [resource: string]: number } = {};
    store[RESOURCE_ENERGY] = this.amount;
    return store;
  },
  configurable: true,
});
