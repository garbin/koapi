import Router from 'koa-router'
import Model from './model'
import paginate from 'koa-pagination'
import convert from 'koa-convert'
import _ from 'lodash'
const debug = require('debug')('koapi');

export default class ResourceRouter extends Router {
  resource(collection, options = {}){
    options = _.defaults(options, {
      root:null,
      allow: ['list', 'get', 'post', 'put', 'patch', 'del'],
      pagination:undefined,
      id:'id',
      fetch: {},
    });
    if (!_.isFunction(collection)) {
      options.root = options.root || '/' + collection.tableName();
      let _collection = collection;
      collection = ctx => _collection;
    }
    let root = options.root;
    let item = root + '/:' + options.id;

    // get list
    this.get(root, convert(paginate(options.pagination)), async (ctx) => {
      let resources = await collection(ctx).fetchPage(Object.assign({}, ctx.pagination, options.fetch));
      ctx.body = resources.models;
      ctx.length = resources.pagination.rowCount;
    });

    // get item
    this.get(item, async (ctx) => {
      let id = ctx.params[options.id];
      ctx.body = await collection(ctx)
                            .query(q => q.where({id}))
                            .fetchOne(Object.assign({
                              required: true,
                            }, options.fetch));
    });

    // create
    this.post(root, async (ctx) => {
      let resource = collection(ctx).model.forge();
      await resource.save(ctx.request.body);
      ctx.body = resource;
      ctx.status = 201;
    });

    const update = async (ctx) => {
      let id = ctx.params[options.id];
      let resource = (await collection(ctx).query(q => q.where({id})).fetch({required:true})).first();
      await resource.save(ctx.request.body, { patch: true });
      ctx.body = resource;
      ctx.status = 202;
    }

    // put/patch item
    this.put(item, update);
    this.patch(item, update);

    // delete item
    this.del(item, async (ctx) => {
      let id = ctx.params[options.id];
      let resource = collection(ctx).model.forge({id});
      await resource.destroy();
      ctx.status = 204;
    });
  }
}
