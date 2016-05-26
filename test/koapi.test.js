import request from 'supertest-as-promised'
import Koapi, {Model, Router, middlewares} from '../src';
import {describe} from 'ava-spec'

const setup = (config) => {
  let app = new Koapi();
  config(app);
  let server = app.listen(null);
  return {app, server};
}

describe('basic server', it => {
  let {server} = setup(app => app);
  it('should get 404 not found', t => request(server).get('/').set('Accept', 'application/json').expect(404))
})

describe('use router', it => {
  let {server, app} = setup(app => {
    app.routers([
      (new Router).get('/', ctx => ctx.body = 'Hello World').routes(),
      (new Router).get('/test', ctx => ctx.body = 'test')
    ]);
  });
  it('should get 200 ok', t => request(server)
                                .get('/')
                                .expect(res => res.text.should.be.equal('Hello World'))
                                .expect(200))
  it('should get 200 ok', t => request(server)
                                .get('/test')
                                .expect(res => res.text.should.be.equal('test'))
                                .expect(200))
  it('should have _specs', t => request(server)
                                  .get('/_specs')
                                  .set('Accept', 'application/json')
                                  .expect(res => res.should.be.json())
                                  .expect(res => res.body.should.have.property('/'))
                                  .expect(200))
});

describe('subdomain middleware', it => {
  let {server, app} = setup(app => {
    app.routers([
      middlewares.subdomain('api.*', (new Router).get('/', ctx => ctx.body = 'api').routes()),
      (new Router).get('/', ctx => ctx.body = 'index').routes(),
    ]);
  });
  it('should get index', t => request(server)
                                .get('/')
                                .expect(res => res.text.should.be.equal('index'))
                                .expect(200))
  it('should get api', t => request(server)
                              .get('/')
                              .set('Host', 'api.test.com')
                              .expect(res => res.text.should.be.equal('api'))
                              .expect(200));
  it('should have _specs', t => request(server)
                                  .get('/_specs')
                                  .set('Accept', 'application/json')
                                  .expect(res => res.should.be.json())
                                  .expect(res => res.body.should.have.property('://api.*/'))
                                  .expect(200))
});
