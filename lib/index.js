const Koa = require('koa')
const Koapi = require('./koapi')
const model = require('./model')
const router = require('./router')
const { logger, winston } = require('./logger')
const middlewares = require('./middlewares')
module.exports = {
  Koapi,
  model,
  router,
  middlewares,
  logger,
  external: { Koa, winston }
}
