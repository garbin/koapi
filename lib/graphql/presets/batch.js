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
        parentForeignKey = 'id',
        foreignKey = `${pluralize.singular(root.constructor.prototype.tableName)}_id`,
        mappingKey = pluralize.singular(root.constructor.prototype.tableName),
        query = q => q,
        list = true,
        model
      } = options
      const attrName = options.attrName || foreignKey
      const items = await batch.load(Object.assign({}, options, {
        name: `${parent.name}-${model.name}`,
        async fetch (parents) {
          const items = await model.forge().query(q => {
            q.whereIn(foreignKey, parents.map(parent => parent.get(parentForeignKey)))
            return query(q)
          }).fetchAll()
          return items
        },
        assemble (children, parents) {
          return parents.map(parent => {
            if (list) {
              return children.filter(child => {
                if (child.get(attrName) === parent.get(parentForeignKey)) {
                  child[mappingKey] = child
                  return true
                }
                return false
              })
            } else {
              return children.find(child => child.get(attrName) === parent.get(parentForeignKey))
            }
          })
        }
      }))(root, args, ctx, info)
      return items
    }
  },
  hasMany (model, options) {
    return batch.fetch(Object.assign({ list: true, model }, options))
  },
  belongsToMany (options) {
    return async (root, args, ctx, info) => {
      const selfModel = root.constructor
      const relationName = options.relation
      const items = await batch.load({
        async fetch (parents) {
          const empty = selfModel.forge()
          const relation = empty[relationName]().relatedData
          const knex = empty.query().clone()
          const children = await knex.select(`${relation.targetTableName}.*`, `${relation.joinTableName}.${relation.key('foreignKey')}`)
            .from(relation.targetTableName)
            .leftJoin(relation.joinTableName, `${relation.joinTableName}.${relation.key('otherKey')}`, '=', `${relation.targetTableName}.${relation.targetIdAttribute}`)
            .whereIn(`${relation.joinTableName}.${relation.key('foreignKey')}`, parents.map(parent => parent.id))
          return children.map(child => relation.target.forge(child))
        },
        assemble (children, parents) {
          const empty = selfModel.forge()
          const relation = empty[relationName]().relatedData
          return parents.map(parent => children.filter(child => child.get(relation.key('foreignKey')) === parent.id))
        }
      })(root, args, ctx, info)
      return items
    }
  },
  hasOne (model, options) {
    return batch.fetch(Object.assign({model, list: false}, options))
  },
  belongsTo (model, options = {}) {
    return async (root, args, ctx, info) => {
      const { parent = root.constructor } = options
      const fk = options.parentKey || `${pluralize.singular(model.prototype.tableName)}_id`
      const items = await batch.load({
        name: `${parent.name}-${model.name}`,
        async fetch (parents) {
          const items = await model.forge().query(q => {
            q.whereIn('id', parents.map(parent => parent.get(fk)))
          }).fetchAll()
          return items
        },
        assemble (items, parents) {
          return parents.map(parent =>
          items.find(item => item.id === parent.get(fk)))
        }
      })(root, args, ctx, info)
      return items
    }
  }
}
