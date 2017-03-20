const Koapi = require('./koapi')
const model = require('./model')
const router = require('./router')
const logger = require('./logger')
const middlewares = require('./middlewares')
const Koa = require('koa')
const winston = require('winston')

module.exports = {
  Koapi,
  model,
  router,
  middlewares,
  logger,
  external: { Koa, winston }
}
