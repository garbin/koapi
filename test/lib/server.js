const knexConfig = require('../knex/knexfile')
const Raw = require('knex/lib/raw')
const { Koapi, middlewares, model, router: { ResourceRouter, AggregateRouter } } = require('../../lib')
const Joi = require('joi')
const md5 = require('blueimp-md5')
const _ = require('lodash')

const { connection } = model.connect(knexConfig.test)

const Category = class extends model.base() {
  get tableName () { return 'categories' }
  get hasTimestamps () { return false }
  posts () {
    return this.belongsToMany(Post, 'category2post').withPivot(['category_id'])
  }
}

const Comment = class extends model.base() {
  get tableName () { return 'comments' }
  get hasTimestamps () { return false }
  get unique () { return ['title'] }
}

const Post = class extends model.base() {
  static get fields () {
    return Joi.object().keys({
      title: Joi.string().required(),
      content: Joi.string().required(),
      tags: Joi.array(),
      array: Joi.array(),
      object: Joi.object(),
      test1: Joi.string(),
      test2: Joi.string()
    }).or(['test1', 'test2'])
  }
  static get jsonColumns () {
    return ['array', 'object', 'tags']
  }
  static get format () {
    return {
      test1: md5
    }
  }
  static get dependents () {
    return ['comments']
  }
  get tableName () { return 'posts' }
  get hasTimestamps () { return true }
  comments () {
    return this.hasMany(Comment)
  }
  categories () {
    return this.belongsToMany(Category, 'category2post')
  }
}

const setup = (config) => {
  let app = new Koapi()
  app.use(middlewares.jsonError())
  app.compress()
  config(app)
  let server = app.listen(null)
  return {app, server}
}

const {server, app} = setup(app => {
  const posts = ResourceRouter.define({
    collection: Post.collection(),
    setup (router) {
      router.create(async (ctx, next) => {
        ctx.state.attributes = ctx.request.body
        ctx.state.attributes.title = 'Hehe'
        await next()
        ctx.body = ctx.body.toJSON()
        ctx.body.haha = 'yes'
      })
      router.read(async (ctx, next) => {
        if (_.get(ctx.request.query, 'filters.category_id')) {
          ctx.state.query = Post.forge().query(qb => qb.leftJoin('category2post', 'posts.id', 'category2post.post_id'))
        }
        await next()
      }, {
        sortable: ['created_at'],
        filterable: [ 'user_id', 'category_id' ],
        searchable: ['title', 'content']
      })
      router.update()
      router.destroy()
    }
  })
  const comments = ResourceRouter.define({
    collection: ctx => ctx.state.parents.post.comments(),
    name: 'comments',
    setup (router) {
      router.crud()
    }
  })
  const aggregate = AggregateRouter.define(router => {
    router.aggregate(Post.collection(), {
      filterable: ['test1'],
      searchable: ['title'],
      dimensions: [
        {
          column: new Raw().set('created_at::date as created_date'),
          name: 'created_date'
        }
      ],
      metrics: [
        { name: 'total', aggregate: 'count', column: 'id as total' }
      ]
    })
  })
  posts.children(comments)
  app.bodyparser()
  app.routers([ posts, aggregate ])
})
server.on('close', function () {
  connection.destroy()
})
module.exports = { server, app, Category, Post, Comment }
