const Router = require('koa-router')
const compose = require('koa-compose')
const { default: Collection } = require('bookshelf/lib/collection')
const { middleware: paginate } = require('koa-pagination')
const convert = require('koa-convert')
const _ = require('lodash')
const pluralize = require('pluralize')

const parseArgs = exports.parseArgs = function (oriArgs, optionDefaults = {}) {
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

class ResourceRouter extends Router {
  get methods () {
    return {create: false, read: false, update: false, destroy: false}
  }

  static define (options) {
    let {collection, setup} = options
    let rest = _.omit(options, ['collection', 'setup'])
    if (options instanceof Function || options instanceof Collection) {
      collection = options
      options = undefined
    }
    options = rest || options
    setup = setup || (router => router.crud())
    let router = new this(collection, options)
    setup(router)
    return router
  }
  constructor (collection, options) {
    options = _.defaults(options, {
      root: '',
      id: '',
      name: ''
    })
    super(options)
    this.collection = collection
    if (!_.isFunction(collection)) {
      options.model = options.model || collection.model
      options.id = options.id || options.model.prototype.idAttribute
      this.collection = ctx => collection
    }
    options.idType = options.idType || '\\d+'
    options.name = options.name || options.model.prototype.tableName
    options.singular_name = pluralize.singular(options.name)
    options.foreignId = `${options.singular_name}_id`
    options.fields = options.fields || (options.model ? options.model.fields : undefined)
    options.root = options.root || '/' + options.name
    options.title = options.title || options.name
    options.description = options.description || options.title
    options.id = options.id || 'id'
    this.options = options

    this.pattern = {
      root: options.root || '/',
      item: (options.root ? options.root : '') + '/:' + options.id
    }
  }

  create () {
    let {middlewares, options} = parseArgs(arguments)
    let {collection, pattern} = this
    this.methods.create = true
    // create
    this.post(pattern.root, compose(middlewares), async (ctx) => {
      let attributes = ctx.state.attributes || ctx.request.body
      if (collection(ctx).relatedData) {
        ctx.state.resource = await collection(ctx).create(attributes)
      } else {
        ctx.state.resource = collection(ctx).model.forge()
        await ctx.state.resource.save(attributes, Object.assign({}, options.save || {}))
      }
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
    const {collection, pattern} = this
    this.methods.read = true
    this.get(pattern.root, convert(paginate(options.pagination)), compose(middlewares),
      async (ctx) => {
        let query = ctx.state.query || collection(ctx).model.forge()
        if (collection(ctx).relatedData) {
          query = query.where({[collection(ctx).relatedData.key('foreignKey')]: collection(ctx).relatedData.parentId})
        }
        if (options.joins) {
          options.joins.forEach(relation => query.join(relation))
        }
        if (options.sortable) {
          let orderBy = _.get(ctx, 'request.query.sort', _.first(options.sortable))
          if (_.includes(options.sortable, _.trimStart(orderBy, '-'))) {
            query = query.orderBy(orderBy, orderBy[0] === '-' ? 'DESC' : 'ASC')
          }
        }
        if (options.filterable) {
          let filters = options.filterable.map(filter => {
            return _.isString(filter) ? (query, filters) => {
              if (filters[filter] === undefined) {
                return query
              }
              return query.query(qb => {
                if (_.isArray(filters[filter])) {
                  return qb.whereIn(filter, filters[filter])
                } else {
                  return qb.where(filter, '=', filters[filter])
                }
              })
            } : filter
          })
          filters.forEach(filter => {
            try {
              let _filters = ctx.request.query.filters || {}
              if (_.isString(_filters)) {
                _filters = JSON.parse(_filters)
              }
              query = filter(query, _filters)
            } catch (e) {}
          })
        }
        if (options.searchable) {
          let keywords = _.get(ctx, 'request.query.q')
          if (keywords) {
            query = query.query(q => {
              q = q.where(function () {
                const like = ['pg', 'postgres'].includes(q.client.config.client)
                ? 'ILIKE' : 'LIKE'
                options.searchable.forEach((field, index) => {
                  this[index ? 'orWhere' : 'where'](field, like, '%' + keywords + '%')
                })
              })
              return q
            })
          }
        }
        let resources = await query.fetchPage(Object.assign({}, ctx.pagination, options.fetch))
        ctx.body = resources.models
        ctx.pagination.length = resources.pagination.rowCount
      }
    )
    return this
  }
  item () {
    const {middlewares, options} = parseArgs(arguments, {
      fetch: {}
    })
    const {collection, options: {id}, pattern} = this
    this.methods.read = true
    this.get(pattern.item, compose(middlewares), async (ctx) => {
      ctx.body = await collection(ctx)
      .query(q => q.where({[id]: ctx.params[id]}))
      .fetchOne(Object.assign({
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
    let {middlewares, options} = parseArgs(arguments)
    let {collection, options: {id}, pattern} = this
    this.methods.update = true
    const update = async (ctx) => {
      let attributes = ctx.state.attributes || ctx.request.body
      ctx.state.resource = await collection(ctx)
        .query(q => q.where({[id]: ctx.params[id]}))
        .fetchOne({require: true})
      await ctx.state.resource.save(attributes, Object.assign({ patch: true }, options.save || {}))
      if (options.after) await options.after(ctx)
      ctx.body = ctx.state.resource
      ctx.status = 202
    }
    this.put(pattern.item, compose(middlewares), update)
    this.patch(pattern.item, compose(middlewares), update)

    return this
  }
  destroy () {
    let {middlewares, options} = parseArgs(arguments)
    let {collection, pattern, options: {id}} = this
    this.methods.destroy = true

    this.del(pattern.item, compose(middlewares), async (ctx) => {
      ctx.state.resource = await collection(ctx).query(q => q.where({[id]: ctx.params[id]})).fetchOne({require: true})
      ctx.state.deleted = ctx.state.resource.toJSON()

      await ctx.state.resource.destroy(Object.assign({}, options.destroy || {}))
      if (options.after) await options.after(ctx)
      ctx.status = 204
    })
    return this
  }
  crud () {
    return this.create().read().update().destroy()
  }
  children (...children) {
    const { foreignId, idType, singular_name } = this.options
    this.use(
      `${this.pattern.root}/:${foreignId}(${idType})`,
      async(ctx, next) => {
        ctx.state.parents = ctx.state.parents || {}
        ctx.state.parents[singular_name] = await this.collection(ctx)
        .query(q => q.where({[this.options.id]: ctx.params[foreignId]}))
        .fetchOne({require: true})
        await next()
      },
      ...children.map(child => child.routes())
    )
    return this
  }
}

module.exports = ResourceRouter
