const Bookshelf = require('bookshelf')
const _ = require('lodash')
const knex = require('knex')
const cascadeDelete = require('bookshelf-cascade-delete')
const softDelete = require('bookshelf-paranoia')
const mask = require('bookshelf-mask')
const jsonColumns = require('bookshelf-json-columns')
const uuid = require('bookshelf-uuid')
const Joi = require('joi')
const ulid = require('ulid')
const internal = {bookshelf: null, connection: null}

exports.default = exports.connect = function (knexConfig) {
  if (!internal.connection) {
    internal.connection = knexConfig instanceof knex.constructor
        ? knexConfig
        : knex(knexConfig)
  }
  if (!internal.bookshelf) {
    internal.bookshelf = Bookshelf(internal.connection).plugin('registry')
     .plugin('virtuals')
     .plugin('visibility')
     .plugin('pagination')
     .plugin(jsonColumns)
     .plugin(koapiBaseModel)
     .plugin(cascadeDelete)
     .plugin(softDelete)
     .plugin(mask)
     .plugin(uuid)
  }
  return internal
}

exports.base = function (knexConfig) {
  if (!internal.bookshelf) throw new Error('You should call initialize before')
  return internal.bookshelf.Model
}

exports.extend = function extend () {
  if (!internal.bookshelf) throw new Error('You should call initialize before')
  return internal.bookshelf.Model.extend.apply(internal.bookshelf.Model, arguments)
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
      this.validate = this.validate || this.constructor.fields
      if (this.validate) {
        let baseValidation = Joi.object().keys({
          // id might be number or string, for optimization
          id: Joi.any().optional(),
          created_at: Joi.date().optional(),
          updated_at: Joi.date().optional()
        })
        this.validate = baseValidation.concat(this.validate.isJoi ? this.validate : Joi.object().keys(this.validate))
        this.on('saving', this.validateBeforeSave)
      }

      if (this.ulid) this.defaults = _.merge({ [this.idAttribute]: ulid() }, _.result(this, 'defaults'))

      this._format = {}
      _.forIn(this.constructor.format, (formatter, field) => {
        if (formatter.formatter && formatter.parser) {
          this._format[field] = formatter
        } else if (typeof formatter === 'function') {
          this._format[field] = {
            formatter,
            parser: a => a
          }
        }
      })

      this.on('saving', this.validateDuplicates)
      M.prototype.initialize.call(this)
    },

    format (attrs) {
      if (super.format) attrs = super.format(attrs)
      return _.reduce(attrs, (formatted, value, field) => {
        formatted[field] = value
        if (_.get(this, `_format.${field}.formatter`) && this.hasChanged(field)) {
          formatted[field] = this._format[field].formatter(value)
        }
        return formatted
      }, {})
    },

    parse (attrs) {
      if (super.parse) attrs = super.parse(attrs)
      return _.reduce(attrs, (parsed, value, field) => {
        parsed[field] = value
        if (_.get(this, `_format.${field}.parser`)) {
          parsed[field] = this._format[field].parser(value)
        }
        return parsed
      }, {})
    },

    async validateBeforeSave (model, attrs, options) {
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
  }, {
    /** ==============from bookshelf-modelbase============== **/
    /** https://github.com/bsiddiqui/bookshelf-modelbase **/
    /**
    * Select a collection based on a query
    * @param {Object} [query]
    * @param {Object} [options] Options used of model.fetchAll
    * @return {Promise(bookshelf.Collection)} Bookshelf Collection of Models
    */
    findAll (filter, options) {
      return this.forge().where(Object.assign({}, filter)).fetchAll(options)
    },

    /**
    * Find a model based on it's ID
    * @param {String} id The model's ID
    * @param {Object} [options] Options used of model.fetch
    * @return {Promise(bookshelf.Model)}
    */
    findById (id, options) {
      return this.findOne({ [this.prototype.idAttribute]: id }, options)
    },

    /**
    * Select a model based on a query
    * @param {Object} [query]
    * @param {Object} [options] Options for model.fetch
    * @param {Boolean} [options.require=false]
    * @return {Promise(bookshelf.Model)}
    */
    findOne (query, options) {
      options = Object.assign({ require: true }, options)
      return this.forge(query).fetch(options)
    },

    /**
    * Insert a model based on data
    * @param {Object} data
    * @param {Object} [options] Options for model.save
    * @return {Promise(bookshelf.Model)}
    */
    create (data, options) {
      return this.forge()
      .save(data, options)
    },

    /**
    * Update a model based on data
    * @param {Object} data
    * @param {Object} options Options for model.fetch and model.save
    * @param {String|Integer} options.id The id of the model to update
    * @param {Boolean} [options.patch=true]
    * @param {Boolean} [options.require=true]
    * @return {Promise(bookshelf.Model)}
    */
    update (data, options) {
      options = Object.assign({ patch: true, require: true }, options)
      return this.forge({ [this.prototype.idAttribute]: options.id }).fetch(options)
      .then(function (model) {
        return model ? model.save(data, options) : undefined
      })
    },

    /**
    * Destroy a model by id
    * @param {Object} options
    * @param {String|Integer} options.id The id of the model to destroy
    * @param {Boolean} [options.require=false]
    * @return {Promise(bookshelf.Model)} empty model
    */
    destroy (options) {
      options = Object.assign({ require: true }, options)
      return this.forge({ [this.prototype.idAttribute]: options.id })
      .destroy(options)
    },

    /**
    * Select a model based on data and insert if not found
    * @param {Object} data
    * @param {Object} [options] Options for model.fetch and model.save
    * @param {Object} [options.defaults] Defaults to apply to a create
    * @return {Promise(bookshelf.Model)} single Model
    */
    findOrCreate (data, options) {
      return this.findOne(data, Object.assign(options, { require: false }))
      .bind(this)
      .then(function (model) {
        var defaults = options && options.defaults
        return model || this.create(Object.assign(defaults, data), options)
      })
    },

    /**
    * Select a model based on data and update if found, insert if not found
    * @param {Object} selectData Data for select
    * @param {Object} updateData Data for update
    * @param {Object} [options] Options for model.save
    */
    upsert (selectData, updateData, options) {
      return this.findOne(selectData, Object.assign(options, { require: false }))
      .bind(this)
      .then(function (model) {
        return model
        ? model.save(updateData, Object.assign({ patch: true }, options))
        : this.create(Object.assign(selectData, updateData), options)
      })
    }
  })
}
