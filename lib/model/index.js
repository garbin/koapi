const Bookshelf = require('bookshelf')
const knex = require('knex')
const cascadeDelete = require('bookshelf-cascade-delete')
const softDelete = require('bookshelf-paranoia')
const mask = require('bookshelf-mask')
const modelBase = require('bookshelf-modelbase')
const uuid = require('bookshelf-uuid')
const validate = require('./validate')
const formatter = require('./formatter')
const internal = {bookshelf: null, connection: null}

exports.default = exports.connect = function (knexConfig) {
  if (!internal.connection) {
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
  }
  return internal
}

const getInternal = exports.getInternal = function (name = null) {
  if (!internal.bookshelf) throw new Error('You should call initialize before')
  return name === null ? internal : internal[name]
}

exports.base = function (knexConfig) {
  return getInternal('bookshelf').Model
}
