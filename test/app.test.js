const { Koapi, router: { Router }, middlewares, logger } = require('../lib')
const request = require('supertest')
const internal = []
const { afterAll, describe, it, expect } = global

afterAll(() => internal.forEach(server => server.close()))

const setup = (config) => {
  let app = new Koapi()
  app.compress()
  config(app)
  let server = app.listen(null)
  internal.push(server)
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
  let { server } = setup(app => {
    app.use(middlewares.jsonError({emit: false}))
    app.use(async (ctx, next) => {
      try {
        await next()
      } catch (e) { throw e }
    })
    app.routers([
      (new Router()).get('/', async ctx => { ctx.body = 'Hello World' }).routes(),
      Router.define(router => router.get('/test', async ctx => { ctx.body = 'test' })),
      Router.define(router => router.get('/error', async ctx => { throw new Error('error') }))
    ])
  })
  it('should get 200 ok', () =>
    request(server)
      .get('/')
      .then(res => {
        expect(res.status).toBe(200)
        expect(res.text).toBe('Hello World')
      })
  )
  it('should get 500 ok', () => request(server)
                                .get('/error')
                                .then(res => {
                                  expect(res.status).toBe(500)
                                  expect(res.body.message).toBe('error')
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
  let { server } = setup(app => {
    app.routers([
      middlewares.subdomain('api.*', (new Router()).get('/', ctx => { ctx.body = 'api' }).routes()),
      (new Router()).get('/', ctx => { ctx.body = 'index' }).routes()
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
