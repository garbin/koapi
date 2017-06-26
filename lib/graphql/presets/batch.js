const pluralize = require('pluralize')

const batch = module.exports = {
  load (options) {
    return async (root, args, ctx, info) => {
      const {
        getLoader = ctx => ctx.loader,
        name,
        assemble,
        fetch } = options
      const loader = getLoader(ctx)
      const data = await loader.acquire(name, parents =>
        fetch(parents).then(items => assemble(items, parents))
      ).load(root)
      return data
    }
  },
  fetch (options = {}) {
    return async (root, args, ctx, info) => {
      const {
        parent = root.constructor,
        foreignKey = `${pluralize.singular(root.constructor.prototype.tableName)}_id`,
        mappingKey = pluralize.singular(root.constructor.prototype.tableName),
        query = q => q,
        list = true,
        model
      } = options
      const attrName = options.attrName || foreignKey
      return batch.load(Object.assign({}, options, {
        name: `${parent.name}-${model.name}`,
        async fetch (parents) {
          const items = await model.forge().query(q => {
            q.whereIn(foreignKey, parents.map(parent => parent.id))
            return query(q)
          }).fetchAll()
          return items
        },
        assemble (children, parents) {
          return parents.map(parent => {
            if (list) {
              return children.filter(child => {
                if (child.get(attrName) === parent.id) {
                  child[mappingKey] = child
                  return true
                }
                return false
              })
            } else {
              return children.find(child => child.get(attrName) === parent.id)
            }
          })
        }
      }))
    }
  },
  hasMany (options) {
    return batch.fetch(Object.assign({ list: true }, options))
  },
  hasOne (options) {
    return batch.fetch(Object.assign({list: false}, options))
  },
  belongsTo (options = {}) {
    return async (root, args, ctx, info) => {
      const {
        parent = root.constructor,
        model
      } = options
      const fk = options.parentKey || `${pluralize.singular(model.prototype.tableName)}_id`
      return batch.load({
        name: `${parent.name}-${model.name}`,
        async fetch (parents) {
          const items = await model.forge().query(q => {
            q.whereIn('id', parents.map(parent => parent.get(fk)))
          })
          return items
        },
        assemble (items, parents) {
          return parents.map(parent =>
          items.find(item => item.id === parent.get(fk)))
        }
      })
    }
  }
}
