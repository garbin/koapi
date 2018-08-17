const winston = require('winston')
const moment = require('moment')
const format = winston.format

const logger = winston.createLogger({
  format: format.combine(format.timestamp(), format.prettyPrint()),
  transports: [new winston.transports.Console()]
})

module.exports = logger
