const types = require('../types')

module.exports = function fetch (items, options = {}) {
  const { args, name = '' } = options
  const itemsArray = Object.entries(items).map(([fetchName, fetchConfig]) => {
    const resolve = fetchConfig.resolve || (async (root, {id}, ctx, info) => {
      const item = await fetchConfig.model.findById(id, {require: true})
      return item
    })
    return {
      name: fetchName,
      model: fetchConfig.model,
      resolve: fetchConfig.compose ? fetchConfig.compose(resolve) : resolve,
      type: fetchConfig.type
    }
  })
  const fetchValues = itemsArray.reduce((values, item) => {
    const resolve = item.resolve
    values[item.name] = { value: resolve }
    return values
  }, {})
  const FetchType = new types.Enum({
    name: `${name}FetchType`,
    values: fetchValues
  })
  const FetchableItem = new types.Union({
    name: `${name}FetchableItem`,
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
    type: FetchableItem,
    args: Object.assign({
      type: types.nonNull(FetchType),
      id: types.nonNull(types.ID)
    }, args),
    resolve: async (root, args, ctx, info) => {
      const { type } = args
      const result = await type(root, args, ctx, info)
      return result
    }
  }
}
