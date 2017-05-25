const { makeExecutableSchema } = require('graphql-tools')
module.exports = (types, options) => makeExecutableSchema(
  Object.assign({}, {
    typeDefs: types.map(item => item.type),
    resolvers: Object.assign({}, ...types.map(item => item.resolver))
  }, options)
)
