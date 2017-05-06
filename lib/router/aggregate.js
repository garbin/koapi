const Router = require('koa-router')
const {default: Collection} = require('bookshelf/lib/collection')
const {middleware: paginate} = require('koa-pagination')
const convert = require('koa-convert')
const _ = require('lodash')

function parseArgs (oriArgs, optionDefaults = {}) {
  let args = Array.prototype.slice.call(oriArgs)
  let none = async (ctx, next) => { await next() }
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
    if (options instanceof Function) {
      options = { setup: options }
    }
    const { setup = router => router } = options
    const router = new AggregateRouter(_.omit(options, ['setup']))
    setup(router)
    return router
  }
  getConfig (path, options) {
    const { dimensions: [dimension], metrics: [metric] } = options
    if (path instanceof Function) {
      options.collection = path.collection()
      options.model = path
    } else {
      options.path = path
    }
    options = Object.assign({
      filterable: [],
      searchable: [],
      path: `/aggregate/${options.model.prototype.tableName}`,
      defaults: {
        dimensions: [dimension.name],
        metrics: [metric.name],
        by: dimension.name
      }
    }, options)
    return options
  }
  aggregate (path, ...args) {
    const { middlewares, options } = parseArgs(args)
    const config = this.getConfig(path, options)
    this.get(config.path, convert(paginate(config.pagination)), ...(middlewares || []), async ctx => {
      const { model, dimensions, metrics, defaults } = config
      const { query: input } = ctx.request
      const query = model.forge().query()
      ;(input.dimensions || defaults.dimensions).forEach(name => {
        const dimension = dimensions.find(dim => dim.name === name)
        query.column(dimension.column)
      })
      ;(input.metrics || defaults.metrics).forEach(name => {
        const metric = metrics.find(metric => metric.name === name)
        query[metric.aggregate](metric.column)
      })
      if (!_.isEmpty(input.filters) && config.filterable) {
        const filter = field => {
          if (input.filters[field]) {
            query.where({[field]: input.filters[field]})
          }
        }
        let filterable = config.filterable
        if (_.isArray(config.filterable)) {
          filterable = () => config.filterable.map(filter)
        }
        filterable({ filter, query, filters: input.filters })
      }
      if (config.searchable) {
        if (input.q) {
          query.where(function () {
            options.searchable.forEach((field, index) => {
              this[index ? 'orWhere' : 'where'](field, 'LIKE', `%${input.q}%`)
            })
          })
        }
      }
      query.groupBy(input.by || defaults.by)
      query.limit(ctx.pagination.limit).offset(ctx.pagination.offset)
      ctx.body = await query.select()
    })
  }
}

module.exports = AggregateRouter
