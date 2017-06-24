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
  const comments = router.resource(Comment, {
    collection: ctx => ctx.state.nested.post.comments()
  })
  const posts = router.resource(Post, router => {
    const before = async (ctx, next) => {
      if (!ctx.request.query.before) {
        return ctx.throw('before is required')
      }
      await next()
    }
    router.create(before, async (ctx, next) => {
      ctx.state.attributes = ctx.request.body
      ctx.state.attributes.title = 'Hehe'
      await next()
      ctx.body = ctx.body.toJSON()
      ctx.body.haha = 'yes'
    })
    router.read(before, async (ctx, next) => {
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
    router.update(before)
    router.destroy(before)
  }).children(comments)
  const aggregate = router.aggregate(router => {
    router.aggregate(Post, {
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
  })
  const categories = router.resource(Category)
  app.use(middlewares.graphql('/graphql', ctx => ({
    context: { loader: new graphql.Loader() },
    schema,
    formatErros: e => {
      console.error(e)
      return e
    }
  })))
  app.use(middlewares.routers([posts, aggregate, categories]))
})
module.exports = { server, app, Category, Post, Comment }
