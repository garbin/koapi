const types = require('../types')
const relay = require('../relay')
const connection = require('./connection')

module.exports = function search (items, options) {
  const { cursor, args, name = '' } = options || {}
  const itemsArray = Object.entries(items).map(([searchName, itemConfig]) => {
    const resolve = itemConfig.resolve || connection.resolve(Object.assign({
      collection: ctx => itemConfig.model.collection(),
      cursor
    }, itemConfig.resolveOptions))
    return {
      name: searchName,
      model: itemConfig.model,
      resolve: itemConfig.compose ? itemConfig.compose(resolve) : resolve,
      type: itemConfig.type
    }
  })
  const searchValues = itemsArray.reduce((values, item) => {
    const resolve = item.resolve
    values[item.name] = { value: resolve }
    return values
  }, {})
  const SearchType = new types.Enum({
    name: `${name}SearchType`,
    values: searchValues
  })
  const SearchableItem = new types.Union({
    name: `${name}SearchableItem`,
    types: itemsArray.map(item => item.type),
    resolveType: model => {
      for (const item of itemsArray) {
        if (model instanceof item.model) {
          return item.type
        }
      }
    }
  })

  return {
    type: relay.connection.create(SearchableItem),
    args: relay.connection.args(Object.assign({
      type: types.nonNull(SearchType)
    }, args)),
    resolve: relay.connection.resolve(async (root, args, ctx, info) => {
      const { type } = args
      const result = await type(root, args, ctx, info)
      return result
    })
  }
}
