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
    });

    if (!_.isFunction(collection)) {
      options.root = options.root || '/' + collection.tableName();
      let _collection = collection;
      collection = ctx => _collection;
    }

    let root = options.root || '/';
    let item = (options.root ? options.root : '') + '/:' + options.id;

    const update = async (ctx) => {
      let id = ctx.params[options.id];
      let resource = (await collection(ctx).query(q => q.where({id})).fetch({required:true})).first();
      await resource.save(ctx.request.body, { patch: true });
      ctx.body = resource;
      ctx.status = 202;
    }

    const methods = {
      list: () => {
        // get list
        this.get(root, convert(paginate(options.pagination)), async (ctx) => {
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
        this.get(item, async (ctx) => {
          let id = ctx.params[options.id];
          ctx.body = await collection(ctx)
          .query(q => q.where({id}))
          .fetchOne(Object.assign({
            required: true,
          }, options.fetch));
        });
      },
      post: ()=>{
        // create
        this.post(root, async (ctx) => {
          let resource = collection(ctx).model.forge();
          await resource.save(ctx.request.body);
          ctx.body = resource;
          ctx.status = 201;
        });
      },
      put: ()=>{
        this.put(item, update);
      },
      patch: ()=>{
        this.patch(item, update);
      },

      del: ()=>{
        // delete item
        this.del(item, async (ctx) => {
          let id = ctx.params[options.id];
          let resource = collection(ctx).model.forge({id});
          await resource.destroy();
          ctx.status = 204;
        });
      }
    }

    options.methods.forEach(method => methods[method]() );

    return this;
  }
}
