const DataLoader = require('dataloader')
const { Koapi, middlewares, router, graphql } = require('../../lib')
const { get } = require('lodash')
const { connection, Comment, Post, Category } = require('./models')
const { schema } = require('./graphql')

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
    context: { loader: new graphql.Loader() },
    schema
  })))
  app.use(middlewares.routers([Posts, Aggregate, Categories]))
})
module.exports = { server, app, Category, Post, Comment }
