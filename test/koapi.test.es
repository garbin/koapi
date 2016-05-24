import request from 'supertest-as-promised'
import Koapi, {Model, Router, middlewares} from '../src';

const setup = (config) => {
  let app = new Koapi();
  config(app);
  let server = app.listen(null);
  return {app, server};
}

describe('basic server', function(){
  let {server} = setup(app => app);
  it('should get 404 not found', function(done){
    request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect(404)
      .then(res => done(null))
      .catch(done);
  })
})

describe('use router', function(){
  let {server, app} = setup(app => {
    app.routers([
      (new Router).get('/', ctx => ctx.body = 'Hello World').routes(),
      (new Router).get('/test', ctx => ctx.body = 'test')
    ]);
  });
  it('should get 200 ok', function(done){
    request(server)
      .get('/')
      .expect(res => res.text.should.be.equal('Hello World'))
      .expect(200)
      .then(res => done(null))
      .catch(done);
  })
  it('should get 200 ok', function(done){
    request(server)
      .get('/test')
      .expect(res => res.text.should.be.equal('test'))
      .expect(200)
      .then(res => done(null))
      .catch(done);
  })
  it('should have _specs', function(done){
    request(server)
      .get('/_specs')
      .set('Accept', 'application/json')
      .expect(res => res.should.be.json())
      .expect(res => res.body.should.have.property('/'))
      .expect(200)
      .then(res => done(null))
      .catch(done);
  })
});

describe('subdomain middleware', function(){
  let {server, app} = setup(app => {
    app.routers([
      middlewares.subdomain('api.*', (new Router).get('/', ctx => ctx.body = 'api').routes()),
      (new Router).get('/', ctx => ctx.body = 'index').routes(),
    ]);
  });
  it('should get index', function(done){
    request(server)
      .get('/')
      .expect(res => res.text.should.be.equal('index'))
      .expect(200)
      .then(res => done(null))
      .catch(done);
  })
  it('should get api', function(done){
    request(server)
      .get('/')
      .set('Host', 'api.test.com')
      .expect(res => res.text.should.be.equal('api'))
      .expect(200)
      .then(res => done(null))
      .catch(done);
  });
  it('should have _specs', function(done){
    request(server)
      .get('/_specs')
      .set('Accept', 'application/json')
      .expect(res => res.should.be.json())
      .expect(res => res.body.should.have.property('://api.*/'))
      .expect(200)
      .then(res => done(null))
      .catch(done);
  })
});
