const Router = require('koa-router')
const { compact, isFunction, isEmpty, defaults } = require('lodash')

module.exports = class Base extends Router {
  parseArgs (oriArgs, optionDefaults = {}) {
    const args = Array.prototype.slice.call(oriArgs)
    const none = async (ctx, next) => { await next() }
    let options = args.pop()
    let middlewares = args
    middlewares = compact(middlewares)
    if (isFunction(options)) {
      middlewares = middlewares.concat(options)
      options = {}
    }
    middlewares = isEmpty(middlewares) ? [none] : middlewares
    options = defaults(options, optionDefaults)
    return {middlewares, options}
  }
  setup () {}
}
