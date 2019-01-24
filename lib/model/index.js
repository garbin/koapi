const Bookshelf = require('bookshelf')
const knex = require('knex')
const cascadeDelete = require('bookshelf-cascade-delete')
const softDelete = require('bookshelf-paranoia')
const mask = require('bookshelf-mask')
const modelBase = require('bookshelf-modelbase')
const uuid = require('bookshelf-uuid')
const validate = require('./validate')
const formatter = require('./formatter')
const patch = require('./patch')
const internal = {bookshelf: null, connection: null, config: null}
const getInternal = name => {
  module.exports.connect()
  return !name ? internal : internal[name]
}

module.exports = {
  config (db = null) {
    if (!internal.config) {
      internal.config = db || process.env.KOAPI_DB_CONFIG
    }
    return internal.config
  },
  connect (knexConfig) {
    if (!internal.connection) {
      const config = module.exports.config(knexConfig)
      if (!config) {
        throw new Error('You should call config before')
      }
      internal.connection = knexConfig instanceof knex.constructor
      ? knexConfig
      : knex(knexConfig)
    }
    if (!internal.bookshelf) {
      internal.bookshelf = Bookshelf(internal.connection)
      .plugin('registry')
      .plugin('virtuals')
      .plugin('visibility')
      .plugin('pagination')
      .plugin(modelBase.pluggable)
      .plugin(cascadeDelete)
      .plugin(softDelete)
      .plugin(mask)
      .plugin(uuid)
      .plugin(validate)
      .plugin(formatter)
      .plugin(patch)
    }
    return internal
  },
  base (knexConfig) {
    return getInternal('bookshelf').Model
  },
  get Base () {
    return module.exports.base()
  },
  getInternal
}
