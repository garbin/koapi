import chai from 'chai'
import _ from 'lodash'
import qs from 'qs'
import test from 'ava'
import {expect} from 'chai'
import chai_http from 'chai-http'

chai.use(chai_http);

export default (cb) => {
  return cb({ResourceTester, test, expect, request});
};

export const request = chai.request;
export {test, expect}

export const HttpTester = class  {
  request = null;
  promise = null;
  config = {
    title:'',
    expect: function(res){return res;},
    catch: function(e){ throw e; }
  };
  constructor(server) {
    this.request = request(server);
  }
  req(cb){
    this.promise = cb(this.request);
    return this;
  }
  title(title){
    this.config.title = title;
    return this;
  }
  catch(cth){
    this.config.catch = cth;
    return this;
  }
  expect(cb){
    this.config.expect = cb;
    return this;
  }
  test(cb){
    cb = cb || function(res){return res;};
    return test(this.config.title,t => this.promise.then(_.wrap(this.config.expect, (func, res)=>{
      func(res);
      cb(res);
      return res;
      // return cb(res);
    })).catch(this.config.catch))
  }
}

export const ResourceTester = class  {
  constructor(server, endpoint) {
    this.endpoint = endpoint;
    this.server   = server;
  }
  create(resource, reqcb = ch => ch){
    let tester = new HttpTester(this.server);
    tester.title(`POST ${this.endpoint}`);
    tester.req(req => {
      req = reqcb(req.post(this.endpoint).set('Accept', 'application/json'));
      return _.isFunction(resource) ? resource(req) : req.send(resource);
    });

    tester.expect(res => {
      expect(res).to.have.status(201)
    });

    return tester;
  }
  read(id, query = '', reqcb = ch => ch){
    if (_.isFunction(id)) {
      reqcb = id;
      id = null;
      query = '';
    } else if (_.isFunction(query)) {
      reqcb = query;
      query = '';
    }
    query = _.isString(query) ? query : qs.stringify(query);
    let path = this.endpoint + (id ? '/' + id : '') + (query ? '?' + query : '');
    let tester = new HttpTester(this.server);
    tester.title(`GET ${path}`);
    tester.req(req => reqcb(req.get(path).set('Accept', 'application/json')));
    tester.expect(res => {
      expect(res).to.have.status(200);
      if (!id) expect(res.body).to.be.an('array');
    });

    return tester;
  }
  update(id, data, query, reqcb = ch => ch){
    if (_.isFunction(query)) {
      reqcb = query;
      query = '';
    }
    let path = this.endpoint + (id ? '/' + id : '') + (query ? '?' + query : '');
    let tester = new HttpTester(this.server);
    tester.title(`PATCH ${path}`);
    tester.req(req => {
      req = reqcb(req.patch(path).set('Accept', 'application/json'));
      return _.isFunction(data) ? data(req) : req.send(data);
    });
    tester.expect(res => {
      expect(res).to.have.status(202);
      _.forIn(data, (v, k)=>{
        expect(res.body[k]).equals(v);
      });
    });

    return tester;
  }
  destroy(id, query, reqcb = ch => ch){
    if (_.isFunction(query)) {
      reqcb = query;
      query = '';
    }
    let path = this.endpoint + (id ? '/' + id : '') + (query ? '?' + query : '');
    let tester = new HttpTester(this.server);
    tester.title(`DELETE ${path}`);
    tester.req(req =>
      reqcb(req.del(path).set('Accept', 'application/json')));
    tester.expect(res => {
      expect(res).to.have.status(204)
    });

    return tester;
  }
}
