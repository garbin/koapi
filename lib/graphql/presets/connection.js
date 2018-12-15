const types = require('../types')
const { isEmpty, isArray, isFunction } = require('lodash')
const relay = require('../relay')

module.exports = {
  args (args) {
    return Object.assign({
      keyword: types.string(),
      orderBy: types.string(),
      filterBy: types.json()
    }, args)
  },
  resolve (options) {
    const {
      collection = ctx => options.model.collection(),
      searchable = [],
      sortable = [],
      filterable = [],
      cursor,
      limit = 10
    } = options || {}
    return async (model, {first = limit, after, keyword, orderBy, filterBy = {}}, ctx, info) => {
      const { query = collection(ctx, model) } = ctx
      const result = await query.query(q => {
        if (query.relatedData) {
          const foreignKey = query.relatedData.key('foreignKey')
          const parentId = query.relatedData.parentId
          q.where({ [foreignKey]: parentId })
        }
        if (!isEmpty(filterBy) && filterable.length) {
          const filter = field => {
            if (filterBy[field]) {
              if (!isFunction(field)) {
                q.where({[field]: filterBy[field]})
              } else {
                field({filterBy, query: q})
              }
            }
          }
          const applyFilters = isArray(filterable)
          ? () => filterable.forEach(filter)
          : filterable
          applyFilters({ filter, query: q, filterBy })
        }
        if (searchable.length && keyword) {
          q.where(function () {
            const like = ['pg', 'postgres'].includes(q.client.config.client)
            ? 'ILIKE' : 'LIKE'
            searchable.forEach((field, index) => index
            ? this.orWhere(field, like, `%${keyword}%`)
            : this.where(field, like, `%${keyword}%`))
          })
        }
        if (sortable.length) {
          let orderByField = sortable[0]
          let orderByDirection = 'DESC'
          if (orderBy) {
            orderByField = orderBy.trimLeft('-')
            orderByDirection = orderBy[0] === '-' ? 'DESC' : 'ASC'
          }
          q.orderBy(orderByField, orderByDirection)
        }
      }).fetchPage({
        limit: first,
        offset: after
      })
      return relay.connection.result(result.models, {
        total: result.pagination.rowCount,
        after,
        first
      }, cursor)
    }
  }
}
