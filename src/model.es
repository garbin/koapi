import bookshelf from 'bookshelf'
import modelbase from 'bookshelf-modelbase'
import _ from 'lodash';
import knex from 'knex'
import json_columns from 'bookshelf-json-columns'
import cascade_delete from 'bookshelf-cascade-delete'
import soft_delete from 'bookshelf-paranoia'
import mask from 'bookshelf-mask'
import uuid from 'bookshelf-uuid'


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
      this.on('saving', this.validateDuplicates);
    },
    validateDuplicates: function (model, attrs, options) {
      return new Promise((resolve, reject)=>{
        if (this.unique && !_.isEmpty(_.pick(this.changed, this.unique))) {
          this.constructor.where(_.pick(this.changed, this.unique)).fetch().then((exists)=>{
            if (exists) {
              reject(new DuplicateError('Duplicate'));
            } else {
              resolve();
            }
          }).catch(reject);
        } else {
          resolve();
        }
      });
    }
  });
};

const Model = {
  bookshelf:null,
  init(knex_config) {
    if (!Model.bookshelf) {
      Model.bookshelf = bookshelf(knex(knex_config))
        .plugin('registry')
        .plugin('virtuals')
        .plugin('visibility')
        .plugin('pagination')
        .plugin(json_columns)
        .plugin(cascade_delete)
        .plugin(soft_delete)
        .plugin(mask)
        .plugin(uuid)
        .plugin(koapi_base_model_plugin)
        .plugin(modelbase.pluggable);
    }
  },
  extend(protos, statics){
    if (!Model.bookshelf) {
      throw new Error('You should call Model.init before');
    }
    return Model.bookshelf.Model.extend(protos, statics);
  }
};

export default Model;
