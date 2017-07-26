const mount = require('koa-mount')
const compose = require('koa-compose')
const { graphqlKoa } = require('apollo-server-koa')

module.exports = function (endpoint, ...middlewares) {
  const options = middlewares.pop()
  return mount(endpoint, compose(
    [ ...middlewares, graphqlKoa(options) ]
  ))
}
