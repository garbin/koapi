const _ = require('lodash')

module.exports = function (options) {
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
