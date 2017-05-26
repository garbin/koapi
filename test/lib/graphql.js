const models = require('./models')
const { graphql: { types, model } } = require('../../lib')

async function getCommentsByPostId (postIds) {
  const comments = await models.Comment.query(q => q.whereIn('post_id', postIds)).fetchAll()
  return comments
}
const Post = new types.Object(model({
  name: 'Post',
  fields: model => ({
    id: model.attr({ type: new types.NonNull(types.Int) }),
    title: model.attr({ type: types.String }),
    content: model.attr({ type: types.String }),
    comments: {
      type: new types.List(Comment),
      async resolve (model, args, { loader }) {
        const items = await loader.acquire('post-comments', getCommentsByPostId).load(model.id)
        return items
      }
    }
  })
}))

const Comment = new types.Object(model({
  name: 'Comment',
  fields: model => ({
    id: model.attr(types.nonNull(types.Int)),
    title: model.attr(types.string()),
    content: model.attr(types.string())
  })
}))

const PostsConnection = types.connection.define(Post)
const SearchType = new types.Enum({
  name: 'SearchType',
  values: {
    POST: { value: models.Post }
  }
})

const Query = new types.Object({
  name: 'Query',
  fields: _ => ({
    posts: {
      type: new types.List(Post),
      async resolve () {
        const items = await models.Post.findAll()
        return items
      }
    },
    search: {
      type: PostsConnection,
      args: types.connection.args({
        type: { type: SearchType }
      }),
      resolve: types.connection.resolve(async (root, { first = 10, after, type }) => {
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
      args: types.connection.args({
        type: { type: SearchType }
      }),
      resolve: types.connection.resolve(async (root, { first = 10, after }) => {
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
      args: types.connection.args(),
      resolve: types.connection.resolve(async (root, {first = 10, after}) => {
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
        id: { type: new types.NonNull(types.Int) }
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
    test: types.boolean({
      args: {
        id: types.nonNull(types.Int)
      },
      resolve: root => true
    }),
    removePost: {
      type: Post,
      args: {
        id: types.nonNull(types.Int)
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
