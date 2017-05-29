const { default: model } = require('graphql-bookshelf')
const types = require('./types')
const relay = require('./relay')
module.exports = {
  model,
  resolve (...resolvers) {
    return async (...args) => {
      let value
      for (const resolver of resolvers) {
        value = await resolver(...args, value)
      }
      return value
    }
  },
  search (items, options) {
    const name = options.name
    const cursor = options.cursor || {
      node: ({after, index}) => after + index,
      start: ({after}) => after,
      end: ({after, first}) => after + first,
      hasNext: ({result, after, first}) => after < result.meta.count - first
    }
    const itemsArray = Object.entries(items).map(([searchName, itemConfig]) => ({
      name: searchName,
      model: itemConfig.model,
      handler: itemConfig.handler || (async ({first, after}) => {
        const result = await itemConfig.model.forge().fetchPage({limit: first, offset: after})
        return {
          meta: {
            count: result.pagination.rowCount,
            offset: result.pagination.offset,
            limit: result.pagination.limit
          },
          nodes: result.models
        }
      }),
      type: itemConfig.type
    }))
    const searchValues = itemsArray.reduce((values, item) => {
      const handler = item.handler
      values[item.name] = { value: handler }
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
      args: relay.connection.args({
        type: types.nonNull(SearchType)()
      }),
      resolve: relay.connection.resolve(async (root, args, ctx) => {
        const {type, first, after} = args
        const result = await type(args)
        return {
          totalCount: result.meta.count,
          edges: result.nodes.map((node, index) => ({
            node,
            cursor: cursor.node({
              result,
              node,
              after,
              index
            })
          })),
          pageInfo: {
            startCursor: cursor.start({
              result,
              after,
              first
            }),
            endCursor: cursor.end({
              result,
              after,
              first
            }),
            hasNextPage: cursor.hasNext({
              after,
              first,
              result
            })
          }
        }
      })
    }
  }
}
