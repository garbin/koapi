const models = require('./models')
const { default: BookshelfType } = require('graphql-bookshelf')
const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLBoolean,
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull
} = require('graphql')

const base64 = {
  encode (str) {
    return new Buffer(`${str}`).toString('base64')
  },
  decode (str) {
    return new Buffer(`${str}`, 'base64').toString('ascii')
  }
}

const Post = new GraphQLObjectType(BookshelfType({
  name: 'Post',
  fields: model => ({
    id: model.attr({ type: new GraphQLNonNull(GraphQLInt) }),
    title: model.attr({ type: GraphQLString }),
    content: model.attr({ type: GraphQLString }),
    comments: {
      type: new GraphQLList(Comment),
      async resolve (model, args, { loaders: { Comments } }) {
        const comments = await Comments.load(model.id)
        return comments
      }
    }
  })
}))

const Comment = new GraphQLObjectType(BookshelfType({
  name: 'Comment',
  fields: model => ({
    id: model.attr({ type: new GraphQLNonNull(GraphQLInt) }),
    title: model.attr({ type: GraphQLString }),
    content: model.attr({ type: GraphQLString })
  })
}))
const PostsConnection = new GraphQLObjectType({
  name: 'PostsConnection',
  fields: _ => ({
    totalCount: { type: GraphQLInt },
    edges: { type: new GraphQLList(Edge) },
    pageInfo: { type: PageInfo }
  })
})

const Edge = new GraphQLObjectType({
  name: 'Edge',
  fields: _ => ({
    node: { type: Post },
    cursor: { type: GraphQLString, resolve: edge => new Buffer(`${edge.cursor}`).toString('base64') }
  })
})
const PageInfo = new GraphQLObjectType({
  name: 'PageInfo',
  fields: _ => ({
    startCursor: { type: GraphQLString, resolve: info => base64.encode(info.startCursor) },
    endCursor: { type: GraphQLString, resolve: info => base64.encode(info.endCursor) },
    hasNextPage: { type: GraphQLBoolean }
  })
})

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: _ => ({
    posts: {
      type: new GraphQLList(Post),
      async resolve () {
        const items = await models.Post.findAll()
        return items
      }
    },
    searchByOffset: {
      type: PostsConnection,
      args: {
        first: { type: GraphQLInt },
        after: { type: GraphQLString }
      },
      async resolve (root, {first = 10, after: afterString = 'MA=='}) {
        const after = base64.decode(afterString)
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
      }
    },
    searchByCursor: {
      type: PostsConnection,
      args: {
        first: { type: GraphQLInt },
        after: { type: GraphQLString }
      },
      async resolve (root, {first = 10, after: afterString = 'MA=='}) {
        const after = base64.decode(afterString)
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
      }
    },
    post: {
      type: Post,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) }
      },
      async resolve (root, {id}) {
        const item = await models.Post.findById(id)
        return item
      }
    }
  })
})

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: _ => ({
    test: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) }
      },
      resolve: root => true
    },
    removePost: {
      type: Post,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) }
      },
      async resolve (root, { id }) {
        const item = await models.Post.findById(id)
        return item
      }
    }
  })
})

const schema = new GraphQLSchema({
  query: Query,
  mutation: Mutation
})
module.exports = { schema }
