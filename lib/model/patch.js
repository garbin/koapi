module.exports = function (bookshelf) {
  bookshelf.Collection.prototype.fetchPage = function (...args) {
    const model = this.model.forge()
    model._knex = this._knex
    return model.fetchPage(...args)
  }
}
