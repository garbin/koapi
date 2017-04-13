const knexConfig = require('../knex/knexfile')
const Raw = require('knex/lib/raw')
const { Koapi, middlewares, model, router } = require('../../lib')
const Joi = require('joi')
const md5 = require('blueimp-md5')
const _ = require('lodash')

const { connection } = model.connect(knexConfig.test)

class Category extends model.base() {
  get tableName () { return 'categories' }
  get hasTimestamps () { return false }
  posts () {
    return this.belongsToMany(Post, 'category2post').withPivot(['category_id'])
  }
}

class Comment extends model.base() {
  get tableName () { return 'comments' }
  get hasTimestamps () { return false }
  get unique () { return ['title'] }
  static get fields () {
    return {
      title: Joi.string().min(1).required(),
      content: Joi.string(),
      user_id: Joi.number().integer(),
      post_id: Joi.number().integer()
    }
  }
}

class Post extends model.base() {
  static get fields () {
    return Joi.object().keys({
      title: Joi.string().required(),
      content: Joi.string().required(),
      slug: Joi.string(),
      password: Joi.string(),
      user_id: Joi.number(),
      tags: Joi.array(),
      object: Joi.object(),
      array: Joi.array(),
      test1: Joi.string(),
      test2: Joi.string()
    }).or(['test1', 'test2'])
  }
  static formatters ({onlyChanged, always, json}) {
    return {
      password: onlyChanged(md5),
      tags: json(),
      object: json(),
      array: json()
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
  const app = new Koapi()
  app.use(middlewares.preset('restful'))
  config(app)
  const server = app.listen(null)
  return {app, server}
}

const {server, app} = setup(app => {
  const posts = router.define('resource', {
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
        list: {
          sortable: ['created_at'],
          filterable: [ 'user_id', 'category_id' ],
          searchable: ['title', 'content']
        }
      })
      router.update()
      router.destroy()
    }
  })
  const comments = router.define('resource', {
    collection: ctx => ctx.state.parents.post.comments(),
    name: 'comments',
    setup (router) {
      router.crud()
    }
  })
  const aggregate = router.define('aggregate', router => {
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
  app.on('close', () => connection.destroy())
  app.use(middlewares.routers([posts, aggregate]))
})
module.exports = { server, app, Category, Post, Comment }
