import koa from 'koa';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import _ from 'lodash';
import Router from 'koa-router';
import logger from 'koa-logger';
import accesslog from 'koa-accesslog';
import cors from 'koa-cors';
import throttle from 'koa-ratelimit';
import serve from 'koa-static';
import error from 'koa-json-error';
import compress from 'koa-compress';
import compose from 'koa-compose';
import bodyparser from 'koa-better-body';
import bunyan from 'bunyan';
import bunyan_logger from 'koa-bunyan-logger';
import bookshelf_joi_validator from 'bookshelf-joi-validator';
import formidable from 'koa-formidable';


export {Router};

export default class Koapi {
  config = {}
  koa    = null

  constructor(){
    this.koa    = koa();
  }

  bodyparser(options){
    if (options) this.koa.use(bodyparser(options));
  }

  debug(on){
    if (on) this.koa.use(logger());

    return this;
  }

  cors(on){
    if (on) this.koa.use(cors());

    return this;
  }

  throttle(options){
    if (options) this.koa.use(throttle(options));

    return this;
  }

  serve(config){
    if (config) this.koa.use(serve(config.root, config.options));

    return this;
  }

  accesslog(config){
    var {options, request} = (config || {});
    this.koa.use(bunyan_logger(options ? bunyan.createLogger(options): null));
    this.koa.use(bunyan_logger.requestLogger(request));

    return this;
  }

  compress(options){
    if (options) this.koa.use(compress(options));

    return this;
  }
  use(middlewares){
    if (!_.isArray(middlewares)) {
      middlewares = Array.prototype.slice.call(arguments);
    }
    this.koa.use(compose(middlewares));

    return this;
  }

  routers(routers){
    var _routers = [];
    routers.forEach((router)=>{
      _routers.push(router);
      this.koa.use(router.routes());
    });

    // show api specs
    this.routers = _routers;
    let _specs = new Router();
    _specs.get('/_specs', function *() {
      let specs = {};
      _routers.forEach(router => {
        router.stack.forEach(item => {
          if (item.methods.length > 0) {
            if (item.methods.length > 0) {
              specs[item.path] = _.uniq((specs[item.path] || []).concat(item.methods));
            }
          }
        });
      });
      this.body = specs;
    });
    this.koa.use(_specs.routes());
  }

  listen(port, cb){
    cb = cb || function(){
      port && console.log("API Server now listening on port [" + port + "]");
    }.bind(this);
    return this.koa.listen(port || 3000, cb);
  }

  setup(config){
    config = _.defaults(config, {
      port: 3000,
      bodyparser:{
        extendTypes: {
          json: ['application/x-javascript', 'text/plain'], // will parse application/x-javascript type body as a JSON string
        },
        multipart: true,
        formidable: {
          multiples: true
        }
      },
      error: [{stream:process.stderr}],
      accesslog: {
        options:{
          name:"access",
          streams: [{
            stream: process.stdout
          }],
        },
        request:{},
      },
      middlewares:[],
      debug :true,
      cors  :true,
      throttle: false,
      serve: false,
      compress: false,
      routers: [],
      knex: false,
    });
    this.koa.use(error());
    this.accesslog(config.accesslog);
    this.bodyparser(config.bodyparser);
    this.cors(config.cors);
    this.debug(config.debug);
    this.throttle(config.throttle);
    this.serve(config.serve);
    this.compress(config.compress);
    this.use(config.middlewares);
    this.routers(config.routers);
    this.error(config.error);

    return this;
  }

  error(streams){
    streams = streams || [{stream:process.stderr}];
    var logger = bunyan.createLogger({
      name:'error',
      streams:streams,
    });

    this.koa.on('error', err => {
      logger.error(err);
    });
  }

  run(config, cb){
    if (_.isString(config)) config = require(config);
    this.setup(config);

    return this.listen(config.port, cb);
  }
}

export const Model = {
  bookshelf:null,
  init(knex_config) {
    if (!Model.bookshelf) {
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
            this.on('destorying', this.destroyDepends);
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
            if (!_.includes(['postgresql', 'pg'], Model.bookshelf.knex.client.config.client) && !_.isEmpty(this.jsonFields)) {
              this.jsonFields.forEach((f)=>{
                if (attrs[f]) attrs[f] = JSON.stringify(attrs[f]);
              });
            }
            return attrs;
          },
          destroyDepends(){
            return new Promise((resolve, reject)=>{
              Promise.all(this.depends.map((depend)=>{
                return new Promise((_resolve, _reject)=>{
                  this.load(depend).then(()=>{
                    this.related(depend).invokeThen('destroy').then(_resolve).catch(_reject);
                  }).catch(_reject);
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
      Model.bookshelf = require('bookshelf')(require('knex')(knex_config))
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
