const compose = require('koa-compose')
const { middleware: paginate } = require('koa-pagination')
const convert = require('koa-convert')
const _ = require('lodash')
const pluralize = require('pluralize')
const Base = require('./base')

module.exports = class Resource extends Base {
  get model () {
    return this.options.model
  }
  get nameSpace () {
    return this.options.nameSpace || this.model.prototype.tableName
  }
  get name () { return this.options.name || pluralize.singular(this.nameSpace) }
  get idAttribute () { return this.options.idAttribute || this.model.prototype.idAttribute }
  get idType () { return this.options.idType || '\\d+' }
  get foreignId () { return this.options.foreignId || `${this.name}_id` }
  get listRoute () { return this.options.listRoute || `/${this.nameSpace}` }
  get itemRoute () { return this.options.itemRoute || `/${this.nameSpace}/:${this.idAttribute}` }
  constructor (options) {
    super(options)
    this.options = options
  }
  collection (ctx) {
    return this.options.collection ? this.options.collection(ctx) : this.model.collection()
  }

  create () {
    const { middlewares, options } = this.parseArgs(arguments)
    // create
    this.post(this.listRoute, compose(middlewares), async (ctx) => {
      const attributes = ctx.state.attributes || ctx.request.body
      ctx.state.resource = await this.collection(ctx).create(
        attributes,
          Object.assign({method: 'insert'}, options.save, ctx.state.options))
      ctx.body = ctx.state.resource
      ctx.status = 201
    })
    return this
  }

  list () {
    const { middlewares, options } = this.parseArgs(arguments, {
      joins: [],
      sortable: [],
      searchable: [],
      filterable: [],
      pagination: undefined,
      fetch: {}
    })
    this.get(this.listRoute, convert(paginate(options.pagination)), compose(middlewares),
      async (ctx) => {
        const query = ctx.state.query || this.collection(ctx)
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
    const { middlewares, options } = this.parseArgs(arguments, {
      fetch: {}
    })
    this.get(this.itemRoute, compose(middlewares), async (ctx) => {
      const query = ctx.state.query || this.collection(ctx)
      ctx.body = await query.query({
        where: {
          [this.idAttribute]: ctx.params[this.idAttribute]
        }}).fetchOne(Object.assign({ require: true }, options.fetch))
    })
    return this
  }

  read () {
    const { middlewares, options } = this.parseArgs(arguments, {
      list: {},
      item: {}
    })
    return this
      .list(...middlewares, options.list)
      .item(...middlewares, options.item)
  }
  update () {
    const { middlewares, options } = this.parseArgs(arguments)
    const update = async (ctx) => {
      const attributes = ctx.state.attributes || ctx.request.body
      const query = ctx.state.query || this.collection(ctx)
      ctx.state.resource = await query.query({
        where: {
          [this.idAttribute]: ctx.params[this.idAttribute]
        }}).fetchOne({require: true})
      await ctx.state.resource.save(
        attributes,
          Object.assign({ patch: true }, options.save, ctx.state.options))
      if (options.after) await options.after(ctx)
      ctx.body = ctx.state.resource
      ctx.status = 202
    }
    this.put(this.itemRoute, compose(middlewares), update)
    this.patch(this.itemRoute, compose(middlewares), update)

    return this
  }
  destroy () {
    const { middlewares, options } = this.parseArgs(arguments)
    this.methods.destroy = true

    this.del(this.itemRoute, compose(middlewares), async (ctx) => {
      const query = ctx.state.query || this.collection(ctx)
      ctx.state.resource = await query.query({
        where: {
          [this.idAttribute]: ctx.params[this.idAttribute]
        }}).fetchOne({require: true})
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
  setup () {
    this.crud()
  }
  children (...children) {
    this.use(
      `${this.listRoute}/:${this.foreignId}(${this.idType})`,
      async(ctx, next) => {
        ctx.state.nested = ctx.state.nested || {}
        ctx.state.nested[this.name] = await this.collection(ctx).query(q =>
          q.where({[this.idAttribute]: ctx.params[this.foreignId]})
        ).fetchOne({require: true})
        await next()
      },
      ...children.map(Child => Child instanceof Base
        ? Child.routes()
        : Child.prototype instanceof Base
          ? new Child().routes()
          : Child)
    )
    return this
  }
}
