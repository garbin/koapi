const winston = require('winston')
const moment = require('moment')

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp () {
        return moment().format()
      },
      formatter (options) {
        return `${options.timestamp()} [${options.level.toUpperCase()}] ${options.message !== undefined
          ? options.message : ''} ${options.meta &&
             Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : ''}`
      }
    })
  ]
})

module.exports = { log: logger, winston }
