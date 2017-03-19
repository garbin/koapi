const tld = require('tldjs')
const wildcard = require('wildcard')
const isIP = require('isipaddress')
const _ = require('lodash')

exports.subdomain = function (wc, middleware) {
  let dispatch = async (ctx, next) => {
    if (!isIP.test(ctx.hostname) && wildcard(wc, ctx.hostname)) {
      ctx.subdomain = tld.getSubdomain(ctx.hostname)
      await middleware(ctx, next)
    } else {
      await next()
    }
  }
  dispatch.subdomain = wc
  dispatch.router = middleware.router
  return dispatch
}

exports.jsonError = function (options) {
  options = _.defaults(options, {
    emit: true
  })
  return async (ctx, next) => {
    try {
      await next()
    } catch (e) {
      let status = e.status || e.statusCode || 500
      if (e.name === 'ValidationError' && !e.status) {
        status = 422
      }
      ctx.status = status
      ctx.body = {
        status,
        name: e.name,
        message: e.message,
        type: e.type,
        stack: process.env.NODE_ENV === 'production' ? undefined : e.stack
      }
      if (options.emit) {
        ctx.app.emit('error', e, ctx)
      }
    }
  }
}
