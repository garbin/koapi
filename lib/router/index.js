const Router = require('koa-router')
const _ = require('lodash')
const ResourceRouter = require('./resource')
const AggregateRouter = require('./aggregate')

Router.define = function (options) {
  let { setup } = options
  let rest = _.omit(options, ['setup'])
  if (_.isFunction(options)) {
    setup = options
    options = {}
  }
  options = rest || options
  setup = setup || (router => router)
  let router = new Router(options)
  setup(router)

  return router
}

module.exports = { default: Router, Router, ResourceRouter, AggregateRouter }
