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
import compose from 'koa-compose';
import bodyparser from 'koa-better-body';
import bunyan from 'bunyan';
import bunyan_logger from 'koa-bunyan-logger';
import bookshelf_joi_validator from 'bookshelf-joi-validator';
import formidable from 'koa-formidable';

var Bookshelf;


export {Router, Bookshelf};


// export Verb = {
//   post: function (path, handler, validate) {
//     return {
//       method: 'POST',
//       path: path,
//       handler: handler,
//       validate: validate,
//     };
//   }
// };

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
    if (on) {
      this.koa.use(logger());
      if (_.get(on, 'request')) {
        let bunyan_opts = _.get(on, 'request.logger');
        let bunyan_instance = bunyan_opts ? bunyan.createLogger(bunyan_opts) : null;
        this.koa.use(bunyan_logger(bunyan_instance));
        this.koa.use(bunyan_logger.requestLogger(_.get(on, 'request.options')));
      }
    }

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
  use(middleware){
    if (middleware) {
      if (_.isString(middleware)) {
        var middlewares = require(middleware);
        this.koa.use(_.isArray(middlewares) ? compose(middlewares) : middlewares);
      } else {
        Array.prototype.slice.call(arguments).forEach((middleware)=>{
          this.koa.use(middleware);
        });
      }
    }

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
    this.use(config.middlewares);
    this.routers(config.routers);

    return this;
  }

  run(config, cb){
    if (_.isString(config)) config = require(config);
    this.setup(config);

    return this.listen(config.port, cb);
  }
}

export function Model(a, b){
  return Bookshelf.Model.extend(a, b);
};
