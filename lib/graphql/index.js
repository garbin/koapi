const middleware = require('./middleware')
const types = require('./types')
const { default: model } = require('graphql-bookshelf')
const Loader = require('./loader')
module.exports = { types, middleware, model, Loader }
