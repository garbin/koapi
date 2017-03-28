const Koa = require('koa')
const _ = require('lodash')
const Router = require('koa-router')
const koaLogger = require('koa-logger')
const cors = require('kcors')
const throttle = require('koa-ratelimit')
const serve = require('koa-static')
const compress = require('koa-compress')
const convert = require('koa-convert')
const morgan = require('koa-morgan')
const helmet = require('koa-helmet')
const logger = require('./logger')
const fs = require('fs')
const koaqs = require('koa-qs')
const bodyParser = require('koa-body')
const os = require('os')

module.exports = class Koapi {
  constructor () {
    this.koa = koaqs(new Koa())
    this.config = {}
    this.server = null
    this.listeners = { teardown: e => logger.info('server stopped') }
    this.koa.on('error', e => logger.error(e))
  }

  bodyparser (options) {
    options = Object.assign({
      multipart: true,
      formidable: { uploadDir: os.tmpdir() }
    }, options)
    this.koa.use(bodyParser(options))
  }

  debug (on) {
    if (on) this.koa.use(koaLogger())
    return this
  }

  cors (options) {
    if (options) this.koa.use(cors(options))
    return this
  }

  throttle (options) {
    if (options) this.koa.use(convert(throttle(options)))
    return this
  }

  serve (config) {
    if (config) this.koa.use(serve(config.root, config.options))
    return this
  }

  accesslog (config) {
    let stream = (_.isString(config.path)
                    ? fs.createWriteStream(config.path, {flags: 'a'})
                      : null) || config.stream || process.stdout
    let format = config.format || 'combined'
    let options = config.options || {}
    this.koa.use(morgan(format, Object.assign({ stream }, options)))
  }

  compress (options) {
    if (options) this.koa.use(compress(options))

    return this
  }

  helmet (config) {
    if (config) {
      this.koa.use(helmet(config))
    }
    return this
  }

  use (middlewares) {
    if (!_.isArray(middlewares)) {
      middlewares = Array.prototype.slice.call(arguments)
    }

    middlewares.forEach(middleware => {
      this.koa.use(middleware)
    })

    return this
  }

  routers (routers) {
    var _routers = []
    routers.forEach(router => {
      let _router = router instanceof Router ? router.routes() : router
      _routers.push(_router)
      this.koa.use(_router)
    })

    // show api specs
    this.routers = _routers
    let _specs = new Router()
    _specs.get('/_specs', async (ctx, next) => {
      let specs = {}
      _routers.forEach(router => {
        router.router.stack.forEach(item => {
          if (item.methods.length > 0) {
            if (item.methods.length > 0) {
              specs[router.subdomain ? '://' + router.subdomain + item.path : item.path] =
                            _.uniq((specs[item.path] || []).concat(item.methods))
            }
          }
        })
      })
      ctx.body = specs
    })
    this.koa.use(_specs.routes())
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
    this.server.on('close', this.listeners.teardown)
    return this.server
  }

  teardown (listener) {
    this.listeners.teardown = listener
  }

  setup (config) {
    config = _.defaults(config, {
      port: 3000,
      bodyparser: {},
      accesslog: {
        stream: process.stdout,
        path: null,
        format: 'combined',
        options: {}
      },
      middlewares: {before: [], after: []},
      cors: true,
      throttle: false,
      serve: false,
      compress: false,
      json_error: null,
      helmet: null,
      routers: []
    })
    this.accesslog(config.accesslog)
    this.bodyparser(config.bodyparser)
    this.cors(config.cors)
    this.debug(process.env.DEBUG)
    this.throttle(config.throttle)
    this.compress(config.compress)
    this.helmet(config.helmet)
    this.use(config.middlewares.before)
    this.routers(config.routers)
    this.use(config.middlewares.after)
    this.serve(config.serve)
    this.config = config

    return this
  }
}
