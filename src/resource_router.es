import Router from 'koa-router'
import Model from './model'
import paginate from 'koa-pagination'
import convert from 'koa-convert'
import _ from 'lodash'

const none = async (ctx, next) => await next();

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
      let _collection = collection;
      this.collection = ctx => _collection;
    }

    this.pattern = {
      root: options.root || '/',
      item: (options.root ? options.root : '') + '/:' + options.id
    }
  }

  create(options, middleware){
    options = _.defaults(options, {
      after: null,
    });
    let {collection, options:{id}, pattern} = this;
    // create
    this.post(pattern.root, middleware || none, async (ctx) => {
      ctx.resource = collection(ctx).model.forge();
      await ctx.resource.save(ctx.request.body);
      if (options.after) {
        await options.after(ctx);
      }
      ctx.body = ctx.resource;
      ctx.status = 201;
    });
    return this;
  }
  read(options, middleware){
    options = _.defaults(options, {
      sortable: [],
      searchable: [],
      filterable: [],
      pagination:undefined,
      fetch: {},
      fetchItem: {},
    });
    let {collection, options:{id}, pattern} = this;
    // read list
    this.get(pattern.root, convert(paginate(options.pagination)), middleware || none, async (ctx) => {
      let query = collection(ctx).model.forge();
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
    this.get(pattern.item, middleware || none, async (ctx) => {
      ctx.body = await collection(ctx)
      .query(q => q.where({[id]:ctx.params[id]}))
      .fetchOne(Object.assign({
        required: true,
      }, options.fetchItem));
    });
    return this;
  }
  update(options, middleware){
    options = _.defaults(options, {
      after: null,
    });
    let {collection, options:{id}, pattern} = this;
    const update = async (ctx) => {
      ctx.resource = (await collection(ctx).query(q => q.where({[id]:ctx.params[id]})).fetch({required:true})).first();
      await ctx.resource.save(ctx.request.body, { patch: true });
      if (options.after)  await options.after(ctx);
      ctx.body = ctx.resource;
      ctx.status = 202;
    }
    this.put(pattern.item, middleware || none, update);
    this.patch(pattern.item, middleware || none, update);

    return this;
  }
  dele(options, middleware){
    let {collection, pattern, options:{id}} = this;
    options = _.defaults(options, {
      after: null,
    });
    this.del(pattern.item, middleware || none, async (ctx) => {
      ctx.resource = collection(ctx).model.forge({[id]:ctx.params[id]});
      await ctx.resource.destroy();
      if (options.after) await options.after(ctx);
      ctx.status = 204;
    });
    return this;
  }
  crud(){
    return this.create().read().update().dele();
  }
}
