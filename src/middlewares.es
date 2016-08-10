import tld from 'tldjs'
import wildcard from 'wildcard'
import isIP from 'isipaddress'
import Router from 'koa-router'
import _ from 'lodash'

export const subdomain = function(wc, middleware){
  let dispatch = async (ctx, next) => {
    if (!isIP.test(ctx.hostname) && wildcard(wc, ctx.hostname)) {
      ctx.subdomain = tld.getSubdomain(ctx.hostname);
      await middleware(ctx, next);
    } else {
      await next();
    }
  }
  dispatch.subdomain = wc;
  dispatch.router = middleware.router;
  return dispatch;
}

export const json_error = function (options) {
  options = _.defaults(options, {
    emit: true
  });
  return async(ctx, next)=>{
    try {
      await next();
    } catch (e) {
      let status = e.status || e.statusCode || 500;
      if (e.name === 'ValidationError' && !e.status) {
        status = 422;
      }
      ctx.status = status;
      ctx.body = {
        status,
        name: e.name,
        message: e.message,
        type: e.type,
        stack: process.env.NODE_ENV == 'production' ? undefined : e.stack
      };
      if (options.emit) {
        ctx.app.emit('error', e, ctx);
      }
    }
  };
}
