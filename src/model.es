import bookshelf from 'bookshelf'
import bookshelf_joi_validator from 'bookshelf-joi-validator'
import _ from 'lodash';

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
    jsonFields:[],
    depends: [],
    initialize: function () {
      this.on('saving', this.validateDuplicates);
      this.on('destroying', this.destroyDepends);
    },
    parse: function (attrs) {
      if (!_.includes(['postgresql', 'pg'], Model.bookshelf.knex.client.config.client) && !_.isEmpty(this.jsonFields)) {
        this.jsonFields.forEach((f)=>{
          if (attrs[f]) attrs[f] = JSON.parse(attrs[f]);
        });
      }
      return attrs;
    },
    format: function (attrs) {
      this.jsonFields.forEach((f)=>{
        if (attrs[f]) attrs[f] = JSON.stringify(attrs[f]);
      });
      return attrs;
    },
    destroyDepends(){
      return new Promise((resolve, reject)=>{
        Promise.all(this.depends.map((depend)=>{
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

const Model = {
  bookshelf:null,
  init(knex_config) {
    if (!Model.bookshelf) {
      Model.bookshelf = bookshelf(require('knex')(knex_config))
        .plugin('registry')
        .plugin('virtuals')
        .plugin('visibility')
        .plugin(koapi_base_model_plugin)
        .plugin(bookshelf_joi_validator);
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
