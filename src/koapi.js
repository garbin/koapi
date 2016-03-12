import koa from 'koa';
import glob from 'glob';
import path from 'path';
import _ from 'lodash';
import Router from 'koa-router';
import logger from 'koa-logger';
import cors from 'koa-cors';
import throttle from 'koa-ratelimit';
import serve from 'koa-static';
import error from 'koa-json-error';
import compress from 'koa-compress';
import bodyparser from 'koa-bodyparser';
import bookshelf_joi_validator from 'bookshelf-joi-validator';

export {Router};

export var Bookshelf;

export default class Koapi {
  config = {}
  koa    = null

  constructor(){
    this.koa    = koa();
  }

  bookshelf(options){
    if (options) Bookshelf = require('bookshelf')(require('knex')(options))
                                .plugin('registry')
                                .plugin('virtuals')
                                .plugin('visibility')
                                .plugin(bookshelf_joi_validator);
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

  compress(options){
    if (options) this.koa.use(compress(options));

    return this;
  }

  routers(routers){
    if (_.isString(routers)) {
      glob.sync(routers).forEach((path)=>{
        let router = require(path).default;
        this.koa.use(router.routes());
      });
    } else {
      routers.forEach((router)=>{
        this.koa.use(router.routes());
      });
      this.routers = routers;
    }
  }

  listen(port, cb){
    cb = cb || function(){
      console.log("API Server now listening on port [" + port + "]");
    }.bind(this);
    this.koa.listen(port || 3000, cb);
  }

  run(config){
    if (_.isString(config)) config = require(config);

    config = _.defaults(config, {
      port: 3000,
      bodyparser:{
        extendTypes: {
          json: ['application/x-javascript', 'text/plain'] // will parse application/x-javascript type body as a JSON string
        }
      },
      debug :true,
      cors  :true,
      throttle: false,
      serve: false,
      compress: false,
      routers: [],
      knex: false,
    });

    this.koa.use(error());
    this.bodyparser(config.bodyparser);
    this.bookshelf(config.knex);
    this.cors(config.cors);
    this.debug(config.debug);
    this.throttle(config.throttle);
    this.serve(config.serve);
    this.compress(config.compress);
    this.routers(config.routers);
    this.listen(config.port);
  }
}

export function Model(){
  return Bookshelf.Model.extend.apply(Bookshelf.Model, Array.prototype.slice.apply(arguments));
};
