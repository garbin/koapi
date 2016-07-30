import chai from 'chai'
import _ from 'lodash'
import qs from 'qs'
import test from 'ava'
import {expect} from 'chai'

chai.use(require('chai-http'));

export const request = chai.request;
export {test, expect}
export const suite = (cb) => {
  return cb({ResourceTester, test, expect, request});
};

export const HttpTester = class  {
  request = null;
  promise = null;
  config = {
    title:'',
    expect: function(){}
  };
  expects = function(){};
  constructor(server) {
    this.request = request(server);
  }
  req(cb){
    this.promise = cb(this.request);
    return this;
  }
  title(title){
    this.config.title = title;
  }
  expect(cb){
    this.config.expect = cb;
  }
  test(cb){
    cb = cb || function(res){return res;};
    return test(this.config.title,t => this.promise.then(_.wrap(this.config.expect, (func, res)=>{
      func(res);
      cb(res);
      return res;
      // return cb(res);
    })))
  }
}

export const ResourceTester = class  {
  constructor(server, endpoint) {
    this.endpoint = endpoint;
    this.server   = server;
  }
  create(resource){
    let tester = new HttpTester(this.server);
    tester.title(`POST ${this.endpoint}`);
    tester.req(req => req.post(this.endpoint)
    .set('Accept', 'application/json')
    .send(resource));
    tester.expect(res => {
      expect(res).to.have.status(201)
    });

    return tester;
  }
  read(id, query = ''){
    query = _.isString(query) ? query : qs.stringify(query);
    let path = this.endpoint + (id ? '/' + id : '') + (query ? '?' + query : '');
    let tester = new HttpTester(this.server);
    tester.title(`GET ${path}`);
    tester.req(req => req.get(path).set('Accept', 'application/json'));
    tester.expect(res => {
      expect(res).to.have.status(200);
      if (!id) expect(res.body).to.be.an('array');
    });

    return tester;
  }
  update(id, data, query){
    let path = this.endpoint + (id ? '/' + id : '') + (query ? '?' + query : '');
    let tester = new HttpTester(this.server);
    tester.title(`PATCH ${path}`);
    tester.req(req => req.patch(path).set('Accept', 'application/json').send(data));
    tester.expect(res => {
      expect(res).to.have.status(202);
      _.forIn(data, (v, k)=>{
        expect(res.body[k]).equals(v);
      });
    });

    return tester;
  }
  destroy(id, query){
    let path = this.endpoint + (id ? '/' + id : '') + (query ? '?' + query : '');
    let tester = new HttpTester(this.server);
    tester.title(`DELETE ${path}`);
    tester.req(req => req.del(path).set('Accept', 'application/json'));
    tester.expect(res => {
      expect(res).to.have.status(204)
    });

    return tester;
  }
}
