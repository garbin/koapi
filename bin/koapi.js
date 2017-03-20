#!/usr/bin/env node
const cwd = process.cwd()
const pkg = require(`${cwd}/package`)
process.argv = !process.argv[2] ? process.argv.concat(pkg.koapi.commands.default || []) : process.argv
const commands = require(`${cwd}/${pkg.koapi.commands.path}`)
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

function koapi () {
  yargs.fail((msg, err, yargs) => {
    if (err) throw err
    console.error('Error:')
    console.error(msg)
    console.error('You should be doing', yargs.help())
    process.exit(1)
  }).help().argv
}

if (require.main === module) {
  koapi()
} else {
  module.exports = koapi
}
