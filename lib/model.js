const Bookshelf = require('bookshelf')
const _ = require('lodash')
const knex = require('knex')
const cascadeDelete = require('bookshelf-cascade-delete')
const softDelete = require('bookshelf-paranoia')
const mask = require('bookshelf-mask')
const uuid = require('bookshelf-uuid')
const modelBase = require('bookshelf-modelbase')
const Joi = require('joi')
const ulid = require('ulid')

let bookshelf

exports.initialize = function initialize (knexConfig) {
  if (!bookshelf) {
    bookshelf = Bookshelf(
      knexConfig instanceof knex.constructor
        ? knexConfig
        : knex(knexConfig)
    ).plugin('registry')
     .plugin('virtuals')
     .plugin('visibility')
     .plugin('pagination')
     .plugin(koapiBaseModel)
     .plugin(modelBase.pluggable)
     .plugin(cascadeDelete)
     .plugin(softDelete)
     .plugin(mask)
     .plugin(uuid)
  }
}

exports.Model = function (knexConfig) {
  if (!bookshelf) throw new Error('You should call initialize before')
  return bookshelf.Model
}

exports.extend = function extend () {
  if (!exports.bookshelf) throw new Error('You should call initialize before')
  return exports.bookshelf.Model.extend.apply(exports.bookshelf.Model, arguments)
}

function koapiBaseModel (bs) {
  var M = bs.Model
  var DuplicateError = function (err) {
    this.status = 409
    this.name = 'DuplicateError'
    this.message = err.toString()
    this.err = err
  }
  DuplicateError.prototype = Error.prototype
  bs.Model = M.extend({
    initialize: function () {
      M.prototype.initialize.call(this)
      this.validate = this.validate || this.constructor.fields

      if (this.ulid) this.defaults = _.merge({ [this.idAttribute]: ulid() }, _.result(this, 'defaults'))

      this._format = {}
      _.forIn(this.constructor.format, (v, k) => {
        switch (v) {
          case 'json':
            this._format[k] = {
              formatter: JSON.stringify,
              parser: v => typeof v === 'string' ? JSON.parse(v) : v
            }
            break
          default:
            if (v.formatter && v.parser) {
              this._format[k] = v
            } else if (typeof v === 'function') {
              this._format[k] = {
                formatter: v,
                parser: a => a
              }
            }
        }
      })

      this.on('saving', this.validateDuplicates)
    },

    format (attrs) {
      if (super.format) attrs = super.format(attrs)
      return _.reduce(attrs, (formatted, v, k) => {
        formatted[k] = v
        if (_.get(this, `_format.${k}.formatter`) && this.hasChanged(k)) {
          formatted[k] = this._format[k].formatter(v)
        }
        return formatted
      }, {})
    },

    parse (attrs) {
      if (super.parse) attrs = super.parse(attrs)
      return _.reduce(attrs, (parsed, v, k) => {
        parsed[k] = v
        if (_.get(this, `_format.${k}.parser`)) {
          parsed[k] = this._format[k].parser(v)
        }
        return parsed
      }, {})
    },
    async validateSave (model, attrs, options) {
      let validation
      // model is not new or update method explicitly set
      if ((model && !model.isNew() && options.method !== 'insert') || (options && (options.method === 'update' || options.patch === true))) {
        let schemaKeys = this.validate._inner.children.map(child => child.key)
        let presentKeys = Object.keys(attrs)
        let optionalKeys = _.difference(schemaKeys, presentKeys)
        let baseAttrs = this.validate._inner.dependencies.reduce((_tmp, dep) => {
          dep.peers.forEach(peer => { _tmp[peer] = model.get(peer) ? model.get(peer) : undefined })
          return _tmp
        }, {})
        // only validate the keys that are being updated
        validation = Joi.validate(Object.assign(baseAttrs || {}, attrs), this.validate.optionalKeys(optionalKeys))
      } else {
        validation = Joi.validate(this.attributes, this.validate)
      }

      if (validation.error) {
        validation.error.tableName = this.tableName

        throw validation.error
      } else {
        this.set(validation.value)
        return validation.value
      }
    },
    async validateDuplicates (model, attrs, options) {
      if (this.unique && !_.isEmpty(_.pick(this.changed, this.unique))) {
        let exists = await this.constructor.where(_.pick(this.changed, this.unique)).fetch()
        if (exists) {
          throw new DuplicateError('Duplicate')
        }
      }
    }
  })
}
