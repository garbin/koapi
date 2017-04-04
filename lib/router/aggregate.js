const Router = require('koa-router')
const {default: Collection} = require('bookshelf/lib/collection')
const {middleware: paginate} = require('koa-pagination')
const convert = require('koa-convert')
const _ = require('lodash')

function parseArgs (oriArgs, optionDefaults = {}) {
  let args = Array.prototype.slice.call(oriArgs)
  let none = async (ctx, next) => await next()
  let options = args.pop()
  let middlewares = args
  middlewares = _.compact(middlewares)
  if (_.isFunction(options)) {
    middlewares = middlewares.concat(options)
    options = {}
  }
  middlewares = _.isEmpty(middlewares) ? [none] : middlewares
  options = _.defaults(options, optionDefaults)

  return {middlewares, options}
}

class AggregateRouter extends Router {
  static define (options) {
    let { setup } = options
    const rest = _.omit(options, ['setup'])
    if (_.isFunction(options)) {
      setup = options
      options = {}
    }
    options = rest || options
    setup = setup || (router => router)
    const router = new AggregateRouter(options)
    setup(router)
    return router
  }
  getConfig (path, options) {
    if (path instanceof Collection) {
      options.collection = path
    }
    const { dimensions: [dimension], metrics: [metric] } = options
    options.filterable = options.filterable || []
    options.searchable = options.searchable || []
    options.path = options.path || `/aggregate/${options.collection.model.prototype.tableName}`
    options.defaults = Object.assign({}, {
      dimensions: [dimension.name],
      metrics: [metric.name],
      by: dimension.name
    }, options.defaults)
    return options
  }
  aggregate (path, ...args) {
    const { middlewares, options } = parseArgs(args)
    const config = this.getConfig(path, options)
    this.get(options.path, convert(paginate(config.pagination)), ...(middlewares || []), async ctx => {
      const {collection, dimensions, metrics, defaults} = config
      const query = collection.model.forge().query()
      ;(ctx.request.query.dimensions || defaults.dimensions).forEach(name => {
        const dimension = dimensions.find(dim => dim.name === name)
        query.column(dimension.column)
      })
      ;(ctx.request.query.metrics || defaults.metrics).forEach(name => {
        const metric = metrics.find(metric => metric.name === name)
        query[metric.aggregate](metric.column)
      })
      if (config.filterable) {
        let filters = config.filterable.map(filter => {
          return _.isString(filter) ? (q, filters) => {
            if (filters[filter] === undefined) {
              return q
            }
            if (_.isArray(filters[filter])) {
              q.whereIn(filter, filters[filter])
            } else {
              q.where(filter, '=', filters[filter])
            }
            return q
          } : filter
        })
        filters.forEach(filter => {
          try {
            let _filters = ctx.request.query.filters || {}
            if (_.isString(_filters)) {
              _filters = JSON.parse(_filters)
            }
            filter(query, _filters)
          } catch (e) {}
        })
      }
      if (config.searchable) {
        let keywords = _.get(ctx, 'request.query.q')
        if (keywords) {
          query.where(function () {
            options.searchable.forEach((field, index) => {
              this[index ? 'orWhere' : 'where'](field, 'LIKE', '%' + keywords + '%')
            })
          })
        }
      }
      query.groupBy(ctx.request.query.by || defaults.by)
      query.limit(ctx.pagination.limit).offset(ctx.pagination.offset)
      ctx.body = await query.select()
    })
  }
}

module.exports = AggregateRouter
