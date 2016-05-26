import Koa from 'koa'
import _ from 'lodash'
import Router from 'koa-router'
import logger from 'koa-logger'
import accesslog from 'koa-accesslog'
import cors from 'koa-cors'
import throttle from 'koa-ratelimit'
import serve from 'koa-static'
import error from 'koa-json-error'
import compress from 'koa-compress'
import bodyparser from 'koa-better-body'
import bunyan from 'bunyan'
import bunyan_logger from 'koa-bunyan-logger'
import convert from 'koa-convert'
import morgan from 'koa-morgan'
import fs from 'fs'

export default class Koapi {
  config = {}
  koa    = null

  constructor(){
    this.koa    = require('koa-qs')(new Koa());
  }

  bodyparser(options){
    if (options) this.koa.use(convert(bodyparser(options)));
  }

  debug(on){
    if (on) this.koa.use(convert(logger()));

    return this;
  }

  cors(options) {
    if (options) this.koa.use(convert(cors(options)));

    return this;
  }

  throttle(options){
    if (options) this.koa.use(convert(throttle(options)));

    return this;
  }

  serve(config){
    if (config) this.koa.use(convert(serve(config.root, config.options)));

    return this;
  }

  accesslog(config){
    let stream = (_.isString(config.path) ?
                    fs.createWriteStream(config.path, {flags:'a'})
                      : null) || config.stream || process.stdout;
    let format = config.format || 'combined';
    let options = config.options || {};
    this.koa.use(morgan(format, Object.assign({ stream }, options)));
  }

  errorlog(config){
    let stream = (_.isString(config.path) ?
                    fs.createWriteStream(config.path, {flags:'a'})
                      : null) || config.stream || process.stderr;
    let name = config.name || 'koapi-error';
    var logger = bunyan.createLogger({ name, streams:[{stream}] });

    this.koa.on('error', err =>  logger.error(err) );
  }

  compress(options){
    if (options) this.koa.use(convert(compress(options)));

    return this;
  }

  use(middlewares){
    if (!_.isArray(middlewares)) {
      middlewares = Array.prototype.slice.call(arguments);
    }

    middlewares.forEach(middleware => {
      this.koa.use(middleware);
    });

    return this;
  }

  routers(routers){
    var _routers = [];
    routers.forEach(router => {
      let _router = router instanceof Router ? router.routes() : router
      _routers.push(_router);
      this.koa.use(_router);
    });

    // show api specs
    this.routers = _routers;
    let _specs = new Router();
    _specs.get('/_specs', async (ctx, next) => {
      let specs = {};
      _routers.forEach(router => {
        router.router.stack.forEach(item => {
          if (item.methods.length > 0) {
            if (item.methods.length > 0) {
              specs[router.subdomain ?
                      '://' + router.subdomain + item.path
                        : item.path] =
                            _.uniq((specs[item.path] || []).concat(item.methods));
            }
          }
        });
      });
      ctx.body = specs;
    });
    this.koa.use(_specs.routes());
  }

  listen(port, cb){
    cb = cb || function(){
      port && console.log("API Server now listening on port [" + port + "]");
    }.bind(this);
    return this.koa.listen(port, cb);
  }

  setup(config){
    config = _.defaults(config, {
      port: 3000,
      bodyparser:{
        extendTypes: {
          json: ['application/x-javascript', 'text/plain'], // will parse application/x-javascript type body as a JSON string
        },
        multipart: true,
        fieldsKey: false,
        filesKey: false,
        formidable: {
          multiples: true
        }
      },
      accesslog:{
        stream: process.stdout,
        path: null,
        format: 'combined',
        options: {},
      },
      errorlog:{
        stream: process.stderr,
        path: null,
      },
      middlewares:{before:[], after:[]},
      debug :false,
      cors  :true,
      throttle: false,
      serve: false,
      compress: false,
      routers: [],
      knex: false,
    });
    this.koa.use(convert(error()));
    this.accesslog(config.accesslog);
    this.errorlog(config.errorlog);
    this.bodyparser(config.bodyparser);
    this.cors(config.cors);
    this.debug(config.debug);
    this.throttle(config.throttle);
    this.compress(config.compress);
    this.use(config.middlewares.before);
    this.routers(config.routers);
    this.use(config.middlewares.after);
    this.serve(config.serve);

    return this;
  }


  run(config, cb){
    if (_.isString(config)) config = require(config);
    this.setup(config);

    return this.listen(config.port, cb);
  }
}
