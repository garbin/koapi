import Bookshelf from 'bookshelf'
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
      M.prototype.initialize.call(this);
      this.validate = this.validate || this.constructor.fields;

      this.on('saving', this.validateDuplicates);
      this.on('destroying', this.destroyDependents);
    },
    destroyDependents(){
      return new Promise((resolve, reject)=>{
        if (this.constructor.dependents) {
          Promise.all(this.constructor.dependents.map((depend)=>{
            return new Promise((_resolve, _reject)=>{
              if (this[depend]().relatedData.type == 'belongsToMany') {
                this[depend]().detach().then(_resolve).catch(_reject);
              } else {
                this.load(depend).then(()=>{
                  this.related(depend).invokeThen('destroy').then(_resolve).catch(_reject);
                }).catch(_reject);
              }
            });
          })).then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
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

export let bookshelf;

export function initialize(knex_config) {
  if (!bookshelf) {
    bookshelf = Bookshelf(knex(knex_config))
                  .plugin('registry')
                  .plugin('virtuals')
                  .plugin('visibility')
                  .plugin('pagination')
                  .plugin(json_columns)
                  // .plugin(cascade_delete)
                  .plugin(soft_delete)
                  .plugin(mask)
                  .plugin(uuid)
                  .plugin(modelbase.pluggable)
                  .plugin(koapi_base_model_plugin)
  }
}

export default function () {
  if (!bookshelf) throw new Error('You should call initialize before');
  return bookshelf.Model.extend.apply(bookshelf.Model, arguments);
}
