const models = require('./models')
const { graphql: { presets, types, relay } } = require('../../lib')

const Comment = new types.Object({
  name: 'Comment',
  fields: presets.model({
    id: types.nonNull(types.ID),
    title: types.string(),
    content: types.string()
  })
})

const Post = new types.Object({
  name: 'Post',
  fields: presets.model({
    id: types.nonNull(types.ID),
    title: types.string(),
    content: types.string(),
    comments: types.list(Comment, {
      resolve: presets.batch.hasMany({ model: models.Comment })
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
    posts: types.list(Post, {
      async resolve () {
        const items = await models.Post.findAll()
        return items
      }
    }),
    fetch: presets.fetch({
      POST: {
        model: models.Post,
        type: Post
      }
    }),
    searchByHelper: presets.search({
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
      args: relay.connection.args(presets.connection.args()),
      resolve: relay.connection.resolve(presets.connection.resolve({
        model: models.Post,
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
        id: types.nonNull(types.Int)
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
  fields: Object.assign({
    test: types.bool({
      args: {
        id: types.nonNull(types.Int)
      },
      resolve: root => true
    }),
    createPost: presets.mutation.create(Post, {
      model: models.Post,
      fields: {
        title: types.string(),
        content: types.string(),
        test1: types.string(),
        test2: types.string()
      }
    }),
    updatePost: presets.mutation.update(Post, {
      model: models.Post
    }),
    removePost: presets.mutation.remove(Post, {
      model: models.Post
    })
  }, presets.mutation.cur(Comment, {
    model: models.Comment
  }))
})

const schema = new types.Schema({
  query: Query,
  mutation: Mutation
})
module.exports = { schema }
