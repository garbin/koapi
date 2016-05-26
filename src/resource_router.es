import Router from 'koa-router'
import Model from './model'
import paginate from 'koa-pagination'
import convert from 'koa-convert'
import _ from 'lodash'

export default class ResourceRouter extends Router {

  resource(collection, options = {}){
    options = _.defaults(options, {
      root:'',
      methods: ['list', 'get', 'post', 'put', 'patch', 'del'],
      sortable: [],
      searchable: [],
      filterable: [],
      pagination:undefined,
      id:'id',
      fetch: {},
      middleware:{
        list: null,
        get: null,
        post: null,
        patch: null,
        del: null
      },
      created: null,
      updated: null,
      deleted: null,
    });

    let default_middleware = async (ctx, next) => await next()
    let default_hook       = async (ctx) => Promise.resolve(true)

    if (!_.isFunction(collection)) {
      options.root = options.root || '/' + collection.tableName();
      let _collection = collection;
      collection = ctx => _collection;
    }

    let root = options.root || '/';
    let item = (options.root ? options.root : '') + '/:' + options.id;

    const update = async (ctx) => {
      ctx.resource = (await collection(ctx).query(q => q.where({[options.id]:ctx.params[options.id]})).fetch({required:true})).first();
      await ctx.resource.save(ctx.request.body, { patch: true });
      await (options.updated || default_hook)(ctx);
      ctx.body = ctx.resource;
      ctx.status = 202;
    }

    const methods = {
      list: () => {
        // get list
        this.get(root, convert(paginate(options.pagination)), options.middleware.list || default_middleware, async (ctx) => {
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
      },
      get: () => {
        // get item
        this.get(item, options.middleware.get || default_middleware, async (ctx) => {
          ctx.body = await collection(ctx)
                            .query(q => q.where({[options.id]:ctx.params[options.id]}))
                            .fetchOne(Object.assign({
                              required: true,
                            }, options.fetch));
        });
      },
      post: ()=>{
        // create
        this.post(root, options.middleware.post || default_middleware, async (ctx) => {
          ctx.resource = collection(ctx).model.forge();
          await ctx.resource.save(ctx.request.body);
          await (options.created || default_hook)(ctx)
          ctx.body = ctx.resource;
          ctx.status = 201;
        });
      },
      put: ()=>{
        this.put(item, options.middleware.patch || default_middleware, update);
      },
      patch: ()=>{
        this.patch(item, options.middleware.patch || default_middleware, update);
      },

      del: ()=>{
        // delete item
        this.del(item, options.middleware.del || default_middleware, async (ctx) => {
          ctx.resource = collection(ctx).model.forge({[options.id]:ctx.params[options.id]});
          await ctx.resource.destroy();
          await (options.deleted || default_hook)(ctx);
          ctx.status = 204;
        });
      }
    }

    options.methods.forEach(method => methods[method]() );

    return this;
  }
}
