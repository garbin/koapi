import Koapi, {Model, Router, middlewares} from '../src';
import suite from '../src/test'

const setup = (config) => {
  let app = new Koapi();
  app.compress();
  config(app);
  let server = app.listen(null);
  return {app, server};
}


suite(({test, expect, request}) => {
  let {server} = setup(app => app);
  test('basic server should get 404 not found', t => {
      return request(server).get('/')
                            .set('Accept', 'application/json')
                            .then(res => {})
                            .catch(res => expect(res).to.have.status(404));
    }
  )
});


suite(({test, expect, request}) => {
  let {server, app} = setup(app => {
    app.routers([
      (new Router).get('/', ctx => ctx.body = 'Hello World').routes(),
      Router.define(router => router.get('/test', ctx => ctx.body = 'test'))
    ]);
  });
  test('should get 200 ok', t => request(server)
                                .get('/')
                                .then(res => {
                                  expect(res).to.have.status(200);
                                  expect(res.text).equals('Hello World')
                                }))
  test('should get 200 ok', t => request(server)
                                .get('/test')
                                .then(res => {
                                  expect(res).to.have.status(200);
                                  expect(res.text).equals('test')
                                }))
  test('should have _specs', t => request(server)
                                  .get('/_specs')
                                  .set('Accept', 'application/json')
                                  .then(res => {
                                    expect(res).to.be.json;
                                    expect(res).to.have.status(200);
                                  }))
});

suite(({test, request, expect}) => {
  let {server, app} = setup(app => {
    app.routers([
      middlewares.subdomain('api.*', (new Router).get('/', ctx => ctx.body = 'api').routes()),
      (new Router).get('/', ctx => ctx.body = 'index').routes(),
    ]);
  });

  test('subdomain should get index', t => request(server)
                                .get('/')
                                .then(res => {
                                  expect(res.text).equals('index');
                                  expect(res).to.have.status(200);
                                }))
  test('subdomain should get api', t => request(server)
                              .get('/')
                              .set('Host', 'api.test.com')
                              .then(res => {
                                expect(res).to.have.status(200);
                                expect(res.text).equals('api');
                              }));
  test('subdomain should have _specs', t => request(server)
                                  .get('/_specs')
                                  .set('Accept', 'application/json')
                                  .then(res => {
                                    expect(res).to.be.json;
                                    expect(res).to.have.status(200);
                                  }));
});
