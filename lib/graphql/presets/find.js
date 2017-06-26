const types = require('../types')
module.exports = function (options) {
  const { compose, type, args, collection, query = ({id}) => ({id}) } = options || {}
  const resolver = options.resolve || (async (root, args, ctx) => {
    const item = await collection(ctx, root).query(q => q.where(query(args))).fetchOne({require: true})
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
