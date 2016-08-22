import Router from 'koa-router'
import compose from 'koa-compose'
import Model from './model'
import paginate from 'koa-pagination'
import convert from 'koa-convert'
import _ from 'lodash'


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

export default class ResourceRouter extends Router {
  constructor(collection, options){
    options = _.defaults(options, {
      root: '',
      id: 'id',
    });
    super(options);
    this.options = options;
    this.collection = collection;
    if (!_.isFunction(collection)) {
      options.root = options.root || '/' + collection.tableName();
      this.collection = ctx => collection;
    }

    this.pattern = {
      root: options.root || '/',
      item: (options.root ? options.root : '') + '/:' + options.id
    }
  }

  create(){
    let {middlewares, options} = parse_args(arguments)
    let {collection, options:{id}, pattern} = this;
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
