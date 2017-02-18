import Bookshelf from 'bookshelf'
import _ from 'lodash';
import knex from 'knex'
import cascade_delete from 'bookshelf-cascade-delete'
import soft_delete from 'bookshelf-paranoia'
import mask from 'bookshelf-mask'
import uuid from 'bookshelf-uuid'
import Joi from 'joi'
import ulid from 'ulid'

export let bookshelf;

export function initialize(knex_config) {
  if (!bookshelf) {
    bookshelf = Bookshelf(
      knex_config instanceof knex.constructor ?
      knex_config :
      knex(knex_config)
    ).plugin('registry')
     .plugin('virtuals')
     .plugin('visibility')
     .plugin('pagination')
     .plugin(cascade_delete)
     .plugin(soft_delete)
     .plugin(mask)
     .plugin(uuid)
     .plugin(koapi_base_model_plugin)
  }
}

export default function extend() {
  if (!bookshelf) throw new Error('You should call initialize before');
  return bookshelf.Model.extend.apply(bookshelf.Model, arguments);
}

function koapi_base_model_plugin (bookshelf) {
  var M = bookshelf.Model;
  var DuplicateError = function (err) {
    this.status = 409;
    this.name = 'DuplicateError';
    this.message = err.toString();
    this.err = err;
  };
  DuplicateError.prototype = Error.prototype;
  bookshelf.Model = M.extend({
    initialize: function () {
      M.prototype.initialize.call(this)
      this.validate = this.validate || this.constructor.fields

      if (this.ulid) this.defaults = _.merge({ [this.idAttribute]: ulid() }, _.result(this, 'defaults'))


      if (this.validate) {
        let baseValidation = Joi.object().keys({
          // id might be number or string, for optimization
          id: Joi.any().optional(),
          created_at: Joi.date().optional(),
          updated_at: Joi.date().optional()
        });

        this.validate = baseValidation.concat(this.validate.isJoi ? this.validate : Joi.object().keys(this.validate));
        this.on('saving', this.validateBeforeSave)
      }

      this._format = {};
      _.forIn(this.constructor.format, (v, k)=>{
        switch (v) {
          case 'json':
            this._format[k] = {
              formatter: JSON.stringify,
              parser: v => typeof v === 'string' ? JSON.parse(v) : v
            };
            break;
          default:
            if (v.formatter && v.parser) {
              this._format[k] = v;
            } else if (typeof v === 'function') {
              this._format[k] = {
                formatter: v,
                parser: a => a,
              }
            }
        }
      });


      this.on('saving', this.validateDuplicates);
    },

    format(attrs){
      if (super.format)  attrs = super.format(attrs);
      return _.reduce(attrs, (formatted, v, k) => {
        formatted[k] = v;
        if (_.get(this, `_format.${k}.formatter`)) {
          formatted[k] = this._format[k].formatter(v);
        }
        return formatted;
      }, {});
    },

    parse(attrs){
      if(super.parse) attrs = super.parse(attrs);
      return _.reduce(attrs, (parsed, v, k) => {
        parsed[k] = v;
        if (_.get(this, `_format.${k}.parser`)) {
          parsed[k] = this._format[k].parser(v);
        }
        return parsed;
      }, {});
    },
    async validateBeforeSave(model, attrs, options) {
      let validation;
      // model is not new or update method explicitly set
      if ((model && !model.isNew() && options.method !== 'insert') || (options && (options.method === 'update' || options.patch === true))) {
        let schemaKeys = this.validate._inner.children.map(child => child.key);
        let presentKeys = Object.keys(attrs)
        let optionalKeys = _.difference(schemaKeys, presentKeys)
        let base_attrs = this.validate._inner.dependencies.reduce((_tmp, dep)=>{
          dep.peers.forEach(peer => _tmp[peer] = model.get(peer) ? model.get(peer) : undefined);
          return _tmp;
        }, {});
        // only validate the keys that are being updated
        validation = Joi.validate(Object.assign(base_attrs || {}, attrs), this.validate.optionalKeys(optionalKeys))
      } else {
        validation = Joi.validate(this.attributes, this.validate)
      }

      if (validation.error) {
        validation.error.tableName = this.tableName

        throw validation.error
      } else {
        this.set(validation.value);
        return validation.value
      }
    },
    async validateDuplicates(model, attrs, options) {
      if (this.unique && !_.isEmpty(_.pick(this.changed, this.unique))) {
        let exists = await this.constructor.where(_.pick(this.changed, this.unique)).fetch();
        if (exists) {
          throw new DuplicateError('Duplicate');
        }
      }
    }
  }, {
    /**==============from bookshelf-modelbase==============**/
    /*** https://github.com/bsiddiqui/bookshelf-modelbase ***/
    /**
    * Select a collection based on a query
    * @param {Object} [query]
    * @param {Object} [options] Options used of model.fetchAll
    * @return {Promise(bookshelf.Collection)} Bookshelf Collection of Models
    */
    findAll(filter, options) {
      return this.forge().where(Object.assign({}, filter)).fetchAll(options)
    },

    /**
    * Find a model based on it's ID
    * @param {String} id The model's ID
    * @param {Object} [options] Options used of model.fetch
    * @return {Promise(bookshelf.Model)}
    */
    findById(id, options) {
      return this.findOne({ [this.prototype.idAttribute]: id }, options)
    },

    /**
    * Select a model based on a query
    * @param {Object} [query]
    * @param {Object} [options] Options for model.fetch
    * @param {Boolean} [options.require=false]
    * @return {Promise(bookshelf.Model)}
    */
    findOne(query, options) {
      options = Object.assign({ require: true }, options)
      return this.forge(query).fetch(options)
    },

    /**
    * Insert a model based on data
    * @param {Object} data
    * @param {Object} [options] Options for model.save
    * @return {Promise(bookshelf.Model)}
    */
    create(data, options) {
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
    update(data, options) {
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
    destroy(options) {
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
    findOrCreate(data, options) {
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
    upsert(selectData, updateData, options) {
      return this.findOne(selectData, Object.assign(options, { require: false }))
      .bind(this)
      .then(function (model) {
        return model
        ? model.save(updateData, Object.assign({ patch: true }, options))
        : this.create(Object.assign(selectData, updateData), options)
      })
    }
  });
};
