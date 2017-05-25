const mount = require('koa-mount')
const { graphqlKoa } = require('graphql-server-koa')
module.exports = function (endpoint, options) {
  return mount(endpoint, async ctx => {
    try {
      await graphqlKoa(options)(ctx)
    } catch (e) {
      console.log(e, '============')
    }
  })
}
