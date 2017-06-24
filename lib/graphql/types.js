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
const {
  GraphQLDate,
  GraphQLTime,
  GraphQLDateTime
} = require('graphql-iso-date')

function genTypeFunc (type) {
  return config => Object.assign({ type }, config)
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
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
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
  type: (type, config) => Object.assign({type}, config),
  list: (type, config) => Object.assign({
    type: new types.List(type)
  }, config),
  nonNull: (type, config) => Object.assign({
    type: new types.NonNull(type)
  }, config),
  object: (type, config) => Object.assign({
    type: new types.Object(type)
  }, config),
  json: genTypeFunc(GraphQLJSON),
  id: genTypeFunc(GraphQLID),
  date: genTypeFunc(GraphQLDate),
  time: genTypeFunc(GraphQLTime),
  datetime: genTypeFunc(GraphQLDateTime),
  float: genTypeFunc(GraphQLFloat),
  string: genTypeFunc(GraphQLString),
  int: genTypeFunc(GraphQLInt),
  boolean: genTypeFunc(GraphQLBoolean),
  bool: genTypeFunc(GraphQLBoolean)
}

module.exports = types
