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
    return Buffer.from(`${str}`).toString('base64')
  },
  decode (str) {
    return Buffer.from(`${str}`, 'base64').toString('ascii')
  }
}

function genTypeFunc (Type) {
  return type => Object.assign({
    type: Type
  }, type)
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
  list: Type => type => Object.assign({
    type: new types.List(Type)
  }, type),
  nonNull: Type => type => Object.assign({
    type: new types.NonNull(Type)
  }, type),
  object: Type => type => Object.assign({
    type: new types.Object(Type)
  }, type),
  string: genTypeFunc(GraphQLString),
  int: genTypeFunc(GraphQLInt),
  boolean: genTypeFunc(GraphQLBoolean),
  bool: genTypeFunc(GraphQLBoolean),
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
            resolve: edge => base64.encode(edge.cursor)
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
