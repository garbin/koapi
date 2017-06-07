const Router = require('koa-router')
const Base = require('./base')
const Resource = require('./resource')
const Aggregate = require('./aggregate')
const { isFunction } = require('lodash')

function define (options) {
  if (isFunction(options)) {
    options = { setup: options }
  }
  const { setup } = options
  const router = new Base(options)
  setup(router)
  return router
}

function resource (model, options = {}) {
  if (isFunction(options)) {
    options = { setup: options }
  }
  const { setup = router => router.crud() } = options
  const router = new Resource(Object.assign({ model }, options))
  setup(router)
  return router
}

function aggregate (options) {
  if (isFunction(options)) {
    options = { setup: options }
  }
  const { setup } = options
  const router = new Aggregate(options)
  setup(router)
  return router
}

module.exports = {
  default: Base,
  define,
  resource,
  aggregate,
  Router,
  Base,
  Resource,
  Aggregate
}
