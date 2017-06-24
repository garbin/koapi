const pluralize = require('pluralize')

module.exports = {
  list (options = {}) {
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
        .fetchAll().then(items => parents.map(parent => items.filter(item => {
          if (item.get(foreignKey) === parent.id) {
            item[mappingKey] = item
            return true
          }
          return false
        })))
      }).load(root)
      return data
    }
  },
  item (options = {}) {
    return async (root, args, ctx, info) => {
      const {
        getLoader = ctx => ctx.loader,
        parent = root.constructor,
        model
      } = options
      const loader = getLoader(ctx)
      const data = await loader.acquire(`${parent.name}-${model.name}`, parents => {
        const fk = options.parentKey || `${pluralize.singular(model.prototype.tableName)}_id`
        return model.forge().query(q => q.whereIn('id', parents.map(parent => parent.get(fk))))
        .fetchAll().then(items => parents.map(parent =>
          items.find(item => item.id === parent.get(fk))
        ))
      }).load(root)
      return data
    }
  }
}
