const Router = require('koa-router')
const compose = require('koa-compose')
const { middleware: paginate } = require('koa-pagination')
const convert = require('koa-convert')
const _ = require('lodash')
const pluralize = require('pluralize')

const parseArgs = exports.parseArgs = function (oriArgs, optionDefaults = {}) {
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

class ResourceRouter extends Router {
  get methods () {
    return {create: false, read: false, update: false, destroy: false}
  }

  static define (options) {
    if (options instanceof Function) {
      options = { model: options }
    }
    const { model, setup = router => router.crud() } = options
    const router = new this(model, _.omit(options, ['model', 'setup']))
    setup(router)
    return router
  }
  constructor (model, options) {
    super(options)
    this.options = Object.assign({
      id: model.prototype.idAttribute,
      collection: ctx => model.collection(),
      name: model.prototype.tableName,
      fields: model.fields,
      idType: '\\d+',
      title: '',
      description: ''
    }, options)
    this.options.singularName = pluralize.singular(this.options.name)
    this.options = Object.assign({
      foreignId: `${this.options.singularName}_id`,
      listRoute: `/${this.options.name}`,
      itemRoute: `/${this.options.name}/:${this.options.id}`
    }, this.options)
  }

  create () {
    const {middlewares, options} = parseArgs(arguments)
    const {collection, listRoute} = this.options
    this.methods.create = true
    // create
    this.post(listRoute, compose(middlewares), async (ctx) => {
      let attributes = ctx.state.attributes || ctx.request.body
      ctx.state.resource = await collection(ctx).create(
        attributes,
          Object.assign({}, options.save, ctx.state.options))
      ctx.body = ctx.state.resource
      ctx.status = 201
    })
    return this
  }

  list () {
    const {middlewares, options} = parseArgs(arguments, {
      joins: [],
      sortable: [],
      searchable: [],
      filterable: [],
      pagination: undefined,
      fetch: {}
    })
    const {collection, listRoute} = this.options
    this.methods.read = true
    this.get(listRoute, convert(paginate(options.pagination)), compose(middlewares),
      async (ctx) => {
        const query = ctx.state.query || collection(ctx)
        const { filters, q: keywords, sort: orderBy = _.first(options.sortable) } = ctx.request.query
        query.query(q => {
          if (query.relatedData) {
            const foreignKey = query.relatedData.key('foreignKey')
            const parentId = query.relatedData.parentId
            q.where({ [foreignKey]: parentId })
          }
          if (!_.isEmpty(filters) && options.filterable) {
            const filter = field => {
              if (filters[field]) {
                q.where({[field]: filters[field]})
              }
            }
            let filterable = options.filterable
            if (_.isArray(options.filterable)) {
              filterable = () => options.filterable.map(filter)
            }
            filterable({ filter, query: q, filters })
          }
          if (keywords && options.searchable) {
            q.where(function () {
              const like = ['pg', 'postgres'].includes(q.client.config.client)
              ? 'ILIKE' : 'LIKE'
              options.searchable.forEach((field, index) => {
                this[index ? 'orWhere' : 'where'](field, like, `%${keywords}%`)
              })
            })
          }
        })
        if (options.sortable) {
          if (_.includes(options.sortable, _.trimStart(orderBy, '-'))) {
            query.orderBy(orderBy, orderBy[0] === '-' ? 'DESC' : 'ASC')
          }
        }
        ctx.resources = await query.fetchPage(Object.assign({}, ctx.pagination, options.fetch))
        ctx.body = ctx.resources.models
        ctx.pagination.length = ctx.resources.pagination.rowCount
      }
    )
    return this
  }
  item () {
    const { middlewares, options } = parseArgs(arguments, {
      fetch: {}
    })
    const { collection, id, itemRoute } = this.options
    this.methods.read = true
    this.get(itemRoute, compose(middlewares), async (ctx) => {
      const query = ctx.state.query || collection(ctx)
      ctx.body = await query.query({where: {[id]: ctx.params[id]}}).fetchOne(
        Object.assign({
          require: true
        }, options.fetch))
    })
    return this
  }

  read () {
    const {middlewares, options} = parseArgs(arguments, {
      list: {},
      item: {}
    })
    return this
      .list(...middlewares, options.list)
      .item(...middlewares, options.item)
  }
  update () {
    const { middlewares, options } = parseArgs(arguments)
    const { collection, id, itemRoute } = this.options
    this.methods.update = true
    const update = async (ctx) => {
      const attributes = ctx.state.attributes || ctx.request.body
      const query = ctx.state.query || collection(ctx)
      ctx.state.resource = await query.query({where: {[id]: ctx.params[id]}}).fetchOne({require: true})
      await ctx.state.resource.save(
        attributes,
          Object.assign({ patch: true }, options.save, ctx.state.options))
      if (options.after) await options.after(ctx)
      ctx.body = ctx.state.resource
      ctx.status = 202
    }
    this.put(itemRoute, compose(middlewares), update)
    this.patch(itemRoute, compose(middlewares), update)

    return this
  }
  destroy () {
    const { middlewares, options } = parseArgs(arguments)
    const { collection, itemRoute, id } = this.options
    this.methods.destroy = true

    this.del(itemRoute, compose(middlewares), async (ctx) => {
      const query = ctx.state.query || collection(ctx)
      ctx.state.resource = await query.query({where: {[id]: ctx.params[id]}}).fetchOne({require: true})
      ctx.state.deleted = ctx.state.resource.toJSON()
      await ctx.state.resource.destroy(Object.assign({}, options.destroy, ctx.state.options))
      if (options.after) await options.after(ctx)
      ctx.status = 204
    })
    return this
  }
  crud () {
    return this.create().read().update().destroy()
  }
  children (...children) {
    const { foreignId, listRoute, idType, singularName, collection } = this.options
    this.use(
      `${listRoute}/:${foreignId}(${idType})`,
      async(ctx, next) => {
        ctx.state.nested = ctx.state.nested || {}
        ctx.state.nested[singularName] = await collection(ctx).query(q =>
          q.where({[this.options.id]: ctx.params[foreignId]})
        ).fetchOne({require: true})
        await next()
      },
      ...children.map(child => child.routes())
    )
    return this
  }
}

module.exports = ResourceRouter
