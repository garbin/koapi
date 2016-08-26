import Router from 'koa-router'
import compose from 'koa-compose'
import Model from './model'
import Collection from 'bookshelf/lib/collection'
import paginate from 'koa-pagination'
import convert from 'koa-convert'
import joi_to_json_schema from 'joi-to-json-schema'
import jsf from 'json-schema-faker'
import Joi from 'joi'
import _ from 'lodash'

Router.define = function (options) {
  let {setup, ...rest} = options;
  if (_.isFunction(options)) {
    setup = options;
    options = {};
  }
  options = rest || options;
  setup = setup || (router => router)
  let router = new Router(options);
  setup(router);

  return router;
}

function parse_args(ori_args, option_defaults = {}) {
  let args = Array.prototype.slice.call(ori_args);
  let none = async (ctx, next) => await next();
  let options = args.pop();
  let middlewares = args;
  middlewares = _.compact(middlewares);
  if (_.isFunction(options)) {
    middlewares = middlewares.concat(options);
    options = {};
  }
  middlewares = _.isEmpty(middlewares) ? [none] : middlewares ;
  options = _.defaults(options, option_defaults);

  return {middlewares, options};
}


export class ResourceRouter extends Router {
  methods = {create:false, read:false, update: false, destroy: false}

  static define(options){
    let {collection, setup, ...rest} = options;
    if (options instanceof Function || options instanceof Collection) {
      collection = options;
      options = undefined;
    }
    options = rest || options;
    setup = setup || (router => router.crud())
    let router = new this(collection, options);
    setup(router);
    return router;
  }
  constructor(collection, options){
    options = _.defaults(options, {
      root: '',
      id: '',
      name: '',
    });
    super(options);
    this.collection = collection;
    if (!_.isFunction(collection)) {
      options.name = options.name || collection.tableName();
      options.model= options.model || collection.model;
      options.id   = options.id || options.model.prototype.idAttribute;
      this.collection = ctx => collection;
    }
    options.fields = options.fields || (options.model ? options.model.fields : undefined);
    options.root = options.root || '/' + options.name;
    options.title = options.title || options.name;
    options.description = options.description || options.title;
    options.id = options.id || 'id';
    this.options = options;

    this.pattern = {
      root: options.root || '/',
      item: (options.root ? options.root : '') + '/:' + options.id
    }
  }

  schema(){
    let { options:{ model, fields, id, title, description } } = this;
    if (!fields) {
      throw new Error('fields can not be empty');
    }

    let base_joi = Object.assign({
      [id]: Joi.number().integer().min(1),
    }, model.prototype.hasTimestamps ? {
      created_at: Joi.date(),
      updated_at: Joi.date()
    } : {});

    let request_item = Joi.object(_.omit(fields, _.keys(base_joi))).label(title).description(description);
    let response_item = Joi.object(Object.assign({}, base_joi, _.mapValues(fields, v => v.required()))).label(title).description(description);
    function _schema(request, response) {
      let request_schema = request ? joi_to_json_schema(request) : {};
      let response_schema = response ? joi_to_json_schema(response) : {};
      return {
        schema:{
          request: request_schema,
          response: response_schema
        },
        example:{
          request: !_.isEmpty(request_schema) ? jsf(request_schema) : {},
          response: !_.isEmpty(response_schema) ? jsf(response_schema) : {}
        }
      }
    }
    let result = {};
    _.forIn(this.methods, (v, k) => {
      if (v) {
        let schema;
        switch (k) {
          case 'create':
            schema = _schema(request_item, response_item);
          break;
          case 'read':
            result['list'] = _schema(null, Joi.array().items(response_item));
            result['read'] = _schema(null, response_item);
          break;
          case 'update':
            let req = Joi.object(_.omit(_.mapValues(fields, v => v.optional()), _.keys(base_joi))).label(title).description(description);
            schema = _schema(req, response_item);
            break;
          case 'destroy':
            schema = _schema(null, null);
          break;
        }
        if (schema) {
          result[k] = schema;
        }
      }
    });

    return result;
  }

  create(){
    let {middlewares, options} = parse_args(arguments)
    let {collection, options:{id}, pattern} = this;
    this.methods.create = true;
    // create
    this.post(pattern.root, compose(middlewares), async (ctx) => {
      let attributes = ctx.state.attributes || ctx.request.body;
      if (collection(ctx).relatedData) {
        ctx.state.resource = await collection(ctx).create(attributes);
      } else {
        ctx.state.resource = collection(ctx).model.forge();
        await ctx.state.resource.save(attributes);
      }
      ctx.body = ctx.state.resource;
      ctx.status = 201;
    });
    return this;
  }
  read(){
    let {middlewares, options} = parse_args(arguments, {
      sortable: [],
      searchable: [],
      filterable: [],
      pagination:undefined,
      fetch: {},
      fetchItem: {},
    });
    let {collection, options:{id}, pattern} = this;
    this.methods.read = true;
    // read list
    this.get(pattern.root, convert(paginate(options.pagination)), compose(middlewares), async (ctx) => {
      // console.log(collection(ctx).relatedData);
      let query = collection(ctx).model.forge();
      if (collection(ctx).relatedData) {
        query = query.where({[collection(ctx).relatedData.key('foreignKey')]:collection(ctx).relatedData.parentId})
      }
      if (options.sortable) {
        let order_by = _.get(ctx, 'request.query.sort', _.first(options.sortable));
        if (_.includes(options.sortable, _.trimStart(order_by, '-'))) {
          query = query.orderBy(order_by);
        }
      }
      if (options.filterable) {
        let filters = _.get(ctx, 'request.query.filters');
        _.mapKeys(filters, (v, k) => {
          query = query.query(q => q.where(k, '=', v));
        });
      }
      if (options.searchable) {
        let keywords = _.get(ctx, 'request.query.q');
        if (keywords) {
          query = query.query(q => {
            q = q.where(function(){
              options.searchable.forEach((field, index) => {
                this[index ? 'orWhere' : 'where'](field, 'LIKE', '%' + keywords + '%');
              });
            });

            return q;
          });
        }
      }
      let resources = await query.fetchPage(Object.assign({}, ctx.pagination, options.fetch));

      ctx.body = resources.models;
      ctx.pagination.length = resources.pagination.rowCount;
    });
    // read item
    this.get(pattern.item, compose(middlewares) || none, async (ctx) => {
      ctx.body = await collection(ctx)
      .query(q => q.where({[id]:ctx.params[id]}))
      .fetchOne(Object.assign({
        required: true,
      }, options.fetchItem));
    });
    return this;
  }
  update(){
    let {middlewares, options} = parse_args(arguments);
    let {collection, options:{id}, pattern} = this;
    this.methods.update = true;
    const update = async (ctx) => {
      let attributes = ctx.state.attributes || ctx.request.body;
      ctx.state.resource = (await collection(ctx).query(q => q.where({[id]:ctx.params[id]})).fetch({required:true})).first();
      await ctx.state.resource.save(attributes, { patch: true });
      if (options.after)  await options.after(ctx);
      ctx.body = ctx.state.resource;
      ctx.status = 202;
    }
    this.put(pattern.item, compose(middlewares), update);
    this.patch(pattern.item, compose(middlewares), update);

    return this;
  }
  destroy(){
    let {middlewares, options} = parse_args(arguments)
    let {collection, pattern, options:{id}} = this;
    this.methods.destroy = true;

    this.del(pattern.item, compose(middlewares), async (ctx) => {
      ctx.state.resource = await collection(ctx).query(q => q.where({[id]:ctx.params[id]})).fetchOne({require:true});
      ctx.state.deleted  = ctx.state.resource.toJSON();
      // ctx.state.resource = await collection(ctx).model.forge().where({[id]:ctx.params[id]});

      // ctx.state.resource = collection(ctx).model.forge({[id]:ctx.params[id]});
      await ctx.state.resource.destroy();
      if (options.after) await options.after(ctx);
      ctx.status = 204;
    });
    return this;
  }
  crud(){
    return this.create().read().update().destroy();
  }
}

export {Router};
