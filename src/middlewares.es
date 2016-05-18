import tld from 'tldjs'
import wildcard from 'wildcard'
import isIP from 'isipaddress'
import Router from 'koa-router'
import _ from 'lodash'

export const subdomain = function(wc, middleware, index = 0){
  let dispatch = async (ctx, next) => {
    if (!isIP.test(ctx.hostname) && wildcard(wc, ctx.hostname)) {
      ctx.subdomain = tld.getSubdomain(ctx.hostname);
      await middleware(ctx, next);
    } else {
      await next();
    }
  }
  dispatch.index = index;
  if (middleware.router instanceof Router) {
    dispatch.router = middleware.router
    dispatch.router.subdomain = wc;
  }
  return dispatch;
}
