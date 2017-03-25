const tld = require('tldjs')
const wildcard = require('wildcard')
const isIP = require('isipaddress')

module.exports = function (wc, middleware) {
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
