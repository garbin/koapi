const models = require('./models')
const { graphql: { helper, types, relay } } = require('../../lib')

const Comment = new types.Object({
  name: 'Comment',
  fields: types.model({
    id: types.nonNull(types.Int)(),
    title: types.string(),
    content: types.string()
  })
})

const Post = new types.Object({
  name: 'Post',
  fields: types.model({
    id: types.nonNull(types.Int)(),
    title: types.string(),
    content: types.string(),
    comments: types.list(Comment)({
      resolve: helper.batchLoad({ model: models.Comment })
    }),
    test1: types.string(),
    created_at: types.datetime(),
    updated_at: types.datetime()
  })
})

const PostsConnection = relay.connection.create(Post)

const SearchType = new types.Enum({
  name: 'SearchType',
  values: {
    POST: { value: models.Post }
  }
})

const Query = new types.Object({
  name: 'Query',
  fields: _ => ({
    posts: types.list(Post)({
      async resolve () {
        const items = await models.Post.findAll()
        return items
      }
    }),
    searchByHelper: helper.search({
      POST: {
        model: models.Post,
        type: Post
      }
    }, { name: 'Helper' }),
    search: {
      type: PostsConnection,
      args: relay.connection.args({
        type: { type: SearchType }
      }),
      resolve: relay.connection.resolve(async (root, { first = 10, after, type }) => {
        const result = await type.forge().fetchPage({
          limit: first,
          offset: after
        })
        return relay.connection.result(result.models, {
          total: result.pagination.rowCount,
          after,
          first
        })
      })
    },
    searchByOffset: {
      type: PostsConnection,
      args: relay.connection.args(helper.connection.args()),
      resolve: relay.connection.resolve(helper.connection.resolve({
        collection: ctx => models.Post.collection(),
        searchable: ['title'],
        filterable: ({filter, query, filterBy}) => {
          filter('user_id')
          filter('category_id')
          if (filterBy.tag) {
            query.whereRaw('tags::jsonb @> ?', `"${filterBy.tag}"`)
          }
        },
        sortable: ['created_at']
      }))
    },
    searchByCursor: {
      type: PostsConnection,
      args: relay.connection.args(),
      resolve: relay.connection.resolve(async (root, {first = 10, after}) => {
        const result = await models.Post.forge().where('id', '>', after).fetchPage({ limit: first })
        return relay.connection.result(result.models, {
          total: result.pagination.rowCount,
          first,
          after
        }, {
          node: ({node}) => node.id,
          start: ({nodes}) => models.Post.collection(nodes).first().id,
          end: ({nodes}) => models.Post.collection(nodes).last().id,
          hasNext: ({nodes, first}) => !(result.models.length < first)
        })
      })
    },
    post: {
      type: Post,
      args: {
        id: types.nonNull(types.Int)()
      },
      async resolve (root, {id}) {
        const item = await models.Post.findById(id)
        return item
      }
    }
  })
})

const Mutation = new types.Object({
  name: 'Mutation',
  fields: _ => (Object.assign({
    test: types.bool({
      args: {
        id: types.nonNull(types.Int)()
      },
      resolve: root => true
    }),
    compose: types.object({
      name: 'ComposeMutation',
      fields: {
        attr1: types.string(),
        attr2: types.string()
      }
    })({
      args: {
        id: types.string()
      },
      resolve: helper.resolve(
        (root, { id }, ctx, info, value = {}) => {
          if (id) { throw new Error('Error') }
          value.attr1 = '1'
          return value
        },
        (root, { id }, ctx, info, value = {}) => {
          value.attr2 = '2'
          return value
        }
      )
    }),
    createPost: helper.create({
      model: models.Post,
      type: Post
    }),
    updatePost: helper.update({
      model: models.Post,
      type: Post
    }),
    destroyPost: helper.destroy({
      model: models.Post,
      type: Post
    })
  }, helper.mutation({
    model: models.Comment,
    type: Comment
  })))
})

const schema = new types.Schema({
  query: Query,
  mutation: Mutation
})
module.exports = { schema }
