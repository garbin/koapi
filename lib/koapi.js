const Koa = require('koa')
const _ = require('lodash')
const logger = require('./logger')
const koaqs = require('koa-qs')

module.exports = class Koapi {
  constructor () {
    this.koa = koaqs(new Koa())
    this.config = {}
    this.server = null
    this.koa.on('error', e => logger.error(e))
  }

  use (...args) {
    this.koa.use(...args)
    return this
  }

  listen (port, cb) {
    if (_.isFunction(port)) {
      cb = port
      port = this.config.port || 0
    } else {
      port = port || this.config.port || 0
      cb = cb || function () {}
    }
    this.server = this.koa.listen(port, cb)
    return this.server
  }
}
