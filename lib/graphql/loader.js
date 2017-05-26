const DataLoader = require('dataloader')

module.exports = class Loader {
  constructor (loaders = {}) {
    this.loaders = loaders
  }
  acquire (name, batchFun, options) {
    this.loaders[name] = this.loaders[name] || new DataLoader(batchFun, options)
    return this.loaders[name]
  }
}
