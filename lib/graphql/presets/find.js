const types = require('../types')
module.exports = function (options) {
  const { compose, type, args, collection } = options || {}
  const resolver = options.resolve || (async (root, {id}, ctx) => {
    const item = await collection(ctx, root).query(q => q.where(id)).fetchOne({require: true})
    return item
  })
  return {
    type,
    args: Object.assign({
      id: types.id()
    }, args),
    resolve: compose ? compose(resolver) : resolver
  }
}
