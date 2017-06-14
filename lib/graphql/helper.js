const types = require('./types')
const relay = require('./relay')
const { wrap } = require('lodash')
const pluralize = require('pluralize')

const defaultWrapper = (resolver, ...args) => {
  return resolver(...args)
}

const helper = module.exports = {
  resolve (...resolvers) {
    return async (...args) => {
      let value
      for (const resolver of resolvers) {
        value = await resolver(...args, value)
      }
      return value
    }
  },
  batchLoad (options = {}) {
    return async (root, args, ctx, info) => {
      const {
        getLoader = ctx => ctx.loader,
        parent = root.constructor,
        foreignKey = `${pluralize.singular(root.constructor.prototype.tableName)}_id`,
        mappingKey = pluralize.singular(root.constructor.prototype.tableName),
        model
      } = options
      const loader = getLoader(ctx)
      const data = await loader.acquire(`${parent.name}-${model.name}`, parents => {
        return model.forge().query(q => q.whereIn(foreignKey, parents.map(parent => parent.id)))
        .fetchAll().then(items => parents.map(parent =>
          items.filter(item => {
            if (item.get(foreignKey) === parent.id) {
              item[mappingKey] = parent
              return true
            }
            return false
          })
        ))
      }).load(root)
      return data
    }
  },
  mutation ({ model, type, enabled = ['create', 'update', 'destroy'], wrapper, name }) {
    name = name || type
    const mutation = {}
    for (const action of enabled) {
      mutation[`${action}${name}`] = helper[action]({ model, type, wrapper })
    }

    return mutation
  },
  create ({model, type, wrapper = defaultWrapper}) {
    const resolver = (root, { attributes }) => {
      return model.forge().save(attributes)
    }
    return {
      type,
      args: { attributes: types.json() },
      resolve: wrap(resolver, wrapper)
    }
  },
  update ({model, type, wrapper = defaultWrapper}) {
    const resolver = async (root, { id, attributes }) => {
      const item = await model.findById(id, {require: true})
      await item.save(attributes)
      return item
    }
    return {
      type,
      args: {attributes: types.json(), id: types.string()},
      resolve: wrap(resolver, wrapper)
    }
  },
  destroy ({model, type, wrapper = defaultWrapper}) {
    const resolver = async (root, {id}) => {
      const item = await model.findById(id, {require: true})
      await item.destroy()
      return item
    }
    return {
      type,
      args: {id: types.string()},
      resolve: wrap(resolver, wrapper)
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
