import Koapi, {Router, middlewares} from '../src'
import request from 'supertest'

const setup = (config) => {
  let app = new Koapi()
  app.compress()
  config(app)
  let server = app.listen(null)
  return {app, server}
}

describe('basic', () => {
  const {server} = setup(app => app)
  it('server should get 404 not found', () => {
    const res = request(server).get('/').set('Accept', 'application/json').then(res => expect(res.status).toBe(404))
    return res
  })
})

describe('advanced', () => {
  let {server, app} = setup(app => {
    app.routers([
      (new Router()).get('/', ctx => ctx.body = 'Hello World').routes(),
      Router.define(router => router.get('/test', ctx => ctx.body = 'test'))
    ])
  })
  it('should get 200 ok', () => request(server)
                                .get('/')
                                .then(res => {
                                  expect(res.status).toBe(200)
                                  expect(res.text).toBe('Hello World')
                                }))
  it('should get 200 ok', () => request(server)
                                .get('/test')
                                .then(res => {
                                  expect(res.status).toBe(200)
                                  expect(res.text).toBe('test')
                                }))
  it('should have _specs', () => request(server)
                                  .get('/_specs')
                                  .set('Accept', 'application/json')
                                  .then(res => {
                                    expect(res.status).toBe(200)
                                  }))
})

describe('haha', () => {
  let {server, app} = setup(app => {
    app.routers([
      middlewares.subdomain('api.*', (new Router()).get('/', ctx => ctx.body = 'api').routes()),
      (new Router()).get('/', ctx => ctx.body = 'index').routes()
    ])
  })

  it('subdomain should get index', () => request(server)
                                .get('/')
                                .then(res => {
                                  expect(res.text).toBe('index')
                                  expect(res.status).toBe(200)
                                }))
  it('subdomain should get api', () => request(server)
                              .get('/')
                              .set('Host', 'api.test.com')
                              .then(res => {
                                expect(res.status).toBe(200)
                                expect(res.text).toBe('api')
                              }))
  it('subdomain should have _specs', () => request(server)
                                  .get('/_specs')
                                  .set('Accept', 'application/json')
                                  .then(res => {
                                    expect(res.status).toBe(200)
                                  }))
})
