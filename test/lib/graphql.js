const models = require('./models')
const { graphql: { helper, types, relay } } = require('../../lib')

function getCommentsByPostId (postIds) {
  return models.Comment.query(q => q.whereIn('post_id', postIds))
    .fetchAll()
    .then(comments => postIds.map(id =>
      comments.filter(comment => comment.get('post_id') === id))
    )
}
const Post = new types.Object(helper.model({
  name: 'Post',
  fields: model => ({
    id: model.attr(types.nonNull(types.Int)()),
    title: model.attr(types.string()),
    content: model.attr(types.string()),
    comments: types.list(Comment)({
      async resolve (model, args, { loader }) {
        const items = await loader.acquire('Post', getCommentsByPostId).load(model.id)
        return items
      }
    })
  })
}))

const Comment = new types.Object(helper.model({
  name: 'Comment',
  fields: model => ({
    id: model.attr(types.nonNull(types.Int)()),
    title: model.attr(types.string()),
    content: model.attr(types.string())
  })
}))

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
        const hasNextPage = after < result.pagination.rowCount - first
        return {
          totalCount: result.pagination.rowCount,
          edges: result.models.map((node, index) => ({node, cursor: after + index})),
          pageInfo: {
            startCursor: after,
            endCursor: after + first,
            hasNextPage
          }
        }
      })
    },
    searchByOffset: {
      type: PostsConnection,
      args: relay.connection.args({
        type: { type: SearchType }
      }),
      resolve: relay.connection.resolve(async (root, { first = 10, after }) => {
        const result = await models.Post.forge().fetchPage({
          limit: first,
          offset: after
        })
        const hasNextPage = after < result.pagination.rowCount - first
        return {
          totalCount: result.pagination.rowCount,
          edges: result.models.map((node, index) => ({node, cursor: after + index})),
          pageInfo: {
            startCursor: after,
            endCursor: after + first,
            hasNextPage
          }
        }
      })
    },
    searchByCursor: {
      type: PostsConnection,
      args: relay.connection.args(),
      resolve: relay.connection.resolve(async (root, {first = 10, after}) => {
        const result = await models.Post.forge().where('id', '>', after).fetchPage({ limit: first })
        const hasNextPage = !(result.models.length < first)
        return {
          totalCount: result.pagination.rowCount,
          edges: result.models.map((node, index) => ({node, cursor: node.id})),
          pageInfo: {
            startCursor: models.Post.collection(result.models).first().id,
            endCursor: models.Post.collection(result.models).last().id,
            hasNextPage
          }
        }
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
  fields: _ => ({
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
    removePost: {
      type: Post,
      args: {
        id: types.nonNull(types.Int)()
      },
      async resolve (root, { id }) {
        const item = await models.Post.findById(id)
        return item
      }
    }
  })
})

const schema = new types.Schema({
  query: Query,
  mutation: Mutation
})
module.exports = { schema }
