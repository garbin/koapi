const knexConfig = require('../knex/knexfile')
const DataLoader = require('dataloader')
const { Koapi, middlewares, model, router, graphql } = require('../../lib')
const Joi = require('joi')
const md5 = require('blueimp-md5')
const { get } = require('lodash')

const { connection } = model.connect(knexConfig.test)

class Category extends model.Base {
  get tableName () { return 'categories' }
  get hasTimestamps () { return false }
  posts () {
    return this.belongsToMany(Post, 'category2post').withPivot(['category_id'])
  }
  static get validator () {
    return {
      category_name: Joi.string().required()
    }
  }
}

class Comment extends model.Base {
  get tableName () { return 'comments' }
  get hasTimestamps () { return false }
  get unique () { return ['title'] }
  static get Type () {
    return graphql.type(`
      type Comment {
        id: Int!
        title: String
        content: String
      }
    `, {
      Comment: {
        id: model => model.id,
        title: model => model.get('title'),
        content: model => model.get('content')
      }
    })
  }
  static get validator () {
    return {
      title: Joi.string().min(1).required(),
      content: Joi.string(),
      user_id: Joi.number().integer(),
      post_id: Joi.number().integer()
    }
  }
}

class Post extends model.Base {
  static get validator () {
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
  static get Type () {
    // const CommentType = Comment.Type.type
    return graphql.type(`
      type Post {
        id: Int!
        title: String
        content: String
        comments: [Comment]
      }
      extend type Mutation {
        removePost(id: Int!): Post
      }
    `, {
      Post: {
        id: model => model.id,
        title: model => model.get('title'),
        content: model => model.get('content'),
        comments: async (model, args, { loaders: { Comments } }) => {
          const comments = await Comments.load(model.id)
          return comments
        }
      },
      Mutation: {
        async removePost (root, {id}) {
          const item = await Post.findById(id)
          return item
        }
      }
    })
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
  server.on('close', () => connection.destroy())
  return {app, server}
}

const {server, app} = setup(app => {
  class Posts extends router.Resource {
    get model () { return Post }
    setup () {
      this.children(Comments)
      this.use(async (ctx, next) => {
        if (!ctx.request.query.before) {
          return ctx.throw('before is required')
        }
        await next()
      })
      this.create(async (ctx, next) => {
        ctx.state.attributes = ctx.request.body
        ctx.state.attributes.title = 'Hehe'
        await next()
        ctx.body = ctx.body.toJSON()
        ctx.body.haha = 'yes'
      })
      this.read(async (ctx, next) => {
        if (get(ctx.request.query, 'filters.category_id')) {
          ctx.state.query = Post.collection().query(q => {
            return q.leftJoin('category2post', 'posts.id', 'category2post.post_id')
          })
        }
        await next()
      }, {
        list: {
          sortable: ['created_at'],
          // filterable: [ 'user_id', 'category_id' ],
          filterable: ({filter, query, filters}) => {
            filter('user_id')
            filter('category_id')
            if (filters.tag) {
              query.whereRaw('tags::jsonb @> ?', `"${filters.tag}"`)
            }
          },
          searchable: ['title', 'content']
        }
      })
      this.update()
      this.destroy()
    }
  }
  class Comments extends router.Resource {
    get model () { return Comment }
    collection (ctx) { return ctx.state.nested.post.comments() }
  }
  class Aggregate extends router.Aggregate {
    setup () {
      this.aggregate(Post, {
        filterable: ['test1'],
        searchable: ['title'],
        dimensions: [
          {
            column: connection.raw('created_at::date as created_date'),
            name: 'created_date'
          }
        ],
        metrics: [
          { name: 'total', aggregate: 'count', column: 'id as total' }
        ]
      })
    }
  }
  class Categories extends router.Resource {
    get model () { return Category }
  }
  app.use(graphql.middleware('/graphql', ctx => ({
    context: {
      loaders: {
        Comments: new DataLoader(postIds => Comment.collection()
          .query(q => q.whereIn('post_id', postIds)).fetch()
          .then(collection => postIds.map(id =>
            collection.filter(comment => comment.get('post_id') === id))
          )
        )
      }
    },
    schema: graphql.schema([graphql.type(`
      type RootQuery {
        posts: [Post]
        post(id: Int!): Post
      }
      type Mutation {
        test(id: Int!): Boolean
      }
      schema { query: RootQuery, mutation: Mutation }
    `, {
      RootQuery: {
        async posts () {
          const items = await Post.findAll()
          return items
        },
        async post (root, {id}) {
          const item = await Post.findById(id)
          return item
        }
      },
      Mutation: { test (root, { id }) { return false } }
    }), Post.Type, Comment.Type])
  })))
  app.use(middlewares.routers([Posts, Aggregate, Categories]))
})
module.exports = { server, app, Category, Post, Comment }
