const convert = require('koa-convert')
const subdomain = require('./subdomain')
const jsonError = require('./json_error')
const Router = require('koa-router')
const fs = require('fs')
const koaLogger = require('koa-logger')
const cors = require('kcors')
const throttle = require('koa-ratelimit')
const serve = require('koa-static')
const compress = require('koa-compress')
const morgan = require('koa-morgan')
const helmet = require('koa-helmet')
const bodyParser = require('koa-body')
const compose = require('koa-compose')
const os = require('os')
const _ = require('lodash')

const middlewares = module.exports = Object.assign({
  compose,
  preset (...args) {
    const presets = {
      restful: [
        { name: 'jsonError' },
        { name: 'bodyparser' },
        {
          name: 'accesslog',
          options: {
            stream: process.stdout,
            path: null,
            format: 'combined',
            options: {}
          }
        },
        { name: 'cors', options: { exposeHeaders: ['Content-Range'] } }
      ]
    }
    const [ preset = 'restful', config = {} ] = args.length <= 1
      ? [ 'restful', ...args ]
      : args
    return compose(presets[preset].map(item => {
      const options = Object.assign({}, item.options, config[item.name])
      return middlewares[item.name](options)
    }))
  },
  routers (routers) {
    return compose(routers.map(Item =>
      Item instanceof Router
        ? Item.routes()
        : Item.prototype instanceof Router
          ? new Item().routes()
          : Item
    ))
  },
  bodyparser (options) {
    options = Object.assign({
      multipart: true,
      formidable: { uploadDir: os.tmpdir() }
    }, options)
    return bodyParser(options)
  },
  debug (options) { return koaLogger(options) },
  cors (options) { return cors(options) },
  throttle (options) { return convert(throttle(options)) },
  serve (...options) { return serve(...options) },
  accesslog (config) {
    const { format = 'combined', path, options = {}, stream = process.stdout } = config
    return morgan(format, Object.assign({
      stream: _.isString(path)
        ? fs.createWriteStream(path, {flags: 'a'})
        : stream
    }, options))
  },
  compress (options) { return compress(options) },
  helmet (options) { return helmet(options) },
  subdomain,
  jsonError
})
