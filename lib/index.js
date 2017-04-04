const Koapi = require('./koapi')
const model = require('./model')
const router = require('./router')
const logger = require('./logger')
const middlewares = require('./middlewares')
const Koa = require('koa')
const winston = require('winston')
const config = require('./config')

function cli (commands = [], defaults = '') {
  process.argv = !process.argv[2] ? process.argv.concat(defaults || []) : process.argv
  const yargs = require('yargs').strict()
  yargs.usage('$0 <cmd> [args]')
  // commands
  for (let command of commands) {
    yargs.command(command.command, command.describe, command.builder || {}, argv => {
      const result = command.handler(argv)
      if (result instanceof Promise) {
        result.then(r => process.exit()).catch(e => {
          // throw e
          console.error(e)
          process.exit(1)
        })
      }
    })
  }
  yargs.fail((msg, err, yargs) => {
    if (err) throw err
    console.error('Error:')
    console.error(msg)
    console.error('You should be doing', yargs.help())
    process.exit(1)
  }).help().argv
}

module.exports = {
  default: Koapi,
  Koapi,
  cli,
  config,
  model,
  router,
  middlewares,
  logger,
  external: { Koa, winston }
}
