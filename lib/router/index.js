const Router = require('koa-router')
const Base = require('./base')
const Resource = require('./resource')
const Aggregate = require('./aggregate')

module.exports = {
  default: Base,
  Router,
  Base,
  Resource,
  Aggregate
}
