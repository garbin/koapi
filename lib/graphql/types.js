const {
  GraphQLSchema,
  GraphQLInt,
  GraphQLString,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLEnumType,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLScalarType,
  GraphQLUnionType
} = require('graphql')
const base64 = {
  encode (str) {
    return new Buffer(`${str}`).toString('base64')
  },
  decode (str) {
    return new Buffer(`${str}`, 'base64').toString('ascii')
  }
}

const types = {
  Schema: GraphQLSchema,
  Int: GraphQLInt,
  String: GraphQLString,
  Object: GraphQLObjectType,
  Enum: GraphQLEnumType,
  List: GraphQLList,
  NonNull: GraphQLNonNull,
  Boolean: GraphQLBoolean,
  Float: GraphQLFloat,
  ID: GraphQLID,
  Input: GraphQLInputObjectType,
  Interface: GraphQLInterfaceType,
  Scalar: GraphQLScalarType,
  Union: GraphQLUnionType,
  PageInfo: new GraphQLObjectType({
    name: 'PageInfo',
    fields: _ => ({
      startCursor: types.string({
        resolve: info => base64.encode(info.startCursor)
      }),
      endCursor: types.string({
        resolve: info => base64.encode(info.endCursor)
      }),
      hasNextPage: { type: GraphQLBoolean }
    })
  }),
  string: type => Object.assign({
    type: types.String
  }, type),
  int: type => Object.assign({
    type: types.Int
  }, type),
  nonNull: (Type, options) => Object.assign({
    type: new types.NonNull(Type)
  }, options),
  boolean: type => Object.assign({
    type: types.Boolean
  }, type),
  connection: {
    args: args => Object.assign({
      first: types.int(),
      last: types.int(),
      after: types.string(),
      before: types.string()
    }, args),
    define: Node => {
      const Edge = new types.Object({
        name: `${Node}Edge`,
        fields: _ => ({
          node: { type: Node },
          cursor: types.string({
            resolve: edge => new Buffer(`${edge.cursor}`).toString('base64')
          })
        })
      })
      return new types.Object({
        name: `${Node}Connection`,
        fields: _ => ({
          totalCount: { type: GraphQLInt },
          edges: { type: new GraphQLList(Edge) },
          pageInfo: { type: types.PageInfo }
        })
      })
    },
    resolve: resolver => {
      return async (root, args, ctx, info) => {
        args.after = base64.decode(args.after || 'MA==')
        args.before = base64.decode(args.before || 'MA==')
        const data = await resolver(root, args, ctx, info)
        return data
      }
    }
  }
}

module.exports = types
