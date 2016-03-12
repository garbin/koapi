import koa from 'koa';
import glob from 'glob';
import Router from 'koa-router';
import path from 'path';
import logger from 'koa-logger';
import cors from 'koa-cors';
import throttle from 'koa-ratelimit';
import serve from 'koa-static';
import error from 'koa-json-error';
import compress from 'koa-compress';

export {Router};

export let Database = {
  knex: null,
  bookshelf: null,
};


export default class Koapi {
  config = {}
  koa    = null
  routers = []
  constructor(config){
    this.config = config;
    this.koa    = koa();
    this.koa.use(error());
  }

  database(options){
    Database.knex = require('knex')(options.knex);
    Database.bookshelf = require('bookshelf')(Database.knex);
  }

  debug(){
    this.koa.use(logger());
    return this;
  }

  cors(){
    this.koa.use(cors());

    return this;
  }

  throttle(options){
    this.koa.use(throttle(options));

    return this;
  }

  serve(){
    this.koa.use(serve.apply(this, Array.prototype.slice.apply(arguments)));

    return this;
  }

  compress(options){
    this.koa.use(compress(options));

    return this;
  }

  router(routers){
    glob.sync(routers || path.resolve('./app/routers/**/*')).forEach((path)=>{
      let router = require(path).default;
      this.routers.push(router);
      this.koa.use(router.routes());
    });
  }

  listen(port, cb){
    cb = cb || function(){
      console.log("API Server now listening on port [" + port + "]");
    }.bind(this);
    this.koa.listen(port || 3000, cb);
  }
}

export function Model(){
  return Database.bookshelf.Model.extend.apply(Database.bookshelf.Model, Array.prototype.slice.apply(arguments));
};
