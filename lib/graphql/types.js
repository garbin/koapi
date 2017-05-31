const { base64 } = require('../utils')
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
const GraphQLJSON = require('graphql-type-json')

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
  JSON: GraphQLJSON,
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
  type: Type => type => Object.assign({type: Type}, type),
  list: Type => type => Object.assign({
    type: new types.List(Type)
  }, type),
  nonNull: Type => type => Object.assign({
    type: new types.NonNull(Type)
  }, type),
  object: Type => type => Object.assign({
    type: new types.Object(Type)
  }, type),
  json: genTypeFunc(GraphQLJSON),
  string: genTypeFunc(GraphQLString),
  int: genTypeFunc(GraphQLInt),
  boolean: genTypeFunc(GraphQLBoolean),
  bool: genTypeFunc(GraphQLBoolean)
}

module.exports = types
