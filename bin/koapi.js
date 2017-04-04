#!/usr/bin/env node
const cwd = process.cwd()
const pkg = require(`${cwd}/package`)
const commands = require(`${cwd}/${pkg.koapi.commands.path}`)
process.argv = !process.argv[2] ? process.argv.concat(pkg.koapi.commands.default || []) : process.argv
require('../lib').cli(commands)
