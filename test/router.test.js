const { server } = require('./lib/server')
const { restful, request } = require('../lib/test')
const { describe, test, expect } = global

describe('RESTful API', function () {
  const posts = restful(server, '/posts')
  const demo = {
    title: 'abc',
    content: 'haha',
    tags: ['c', 'd'],
    test1: 'haha'
  }
  test('aggregate', async () => {
    const res = await request(server).get('/aggregate/posts')
    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(Array)
  })

  test('aggregate filters', async () => {
    const res = await request(server).get('/aggregate/posts?filters[test1]=hehe&q=le')
    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(Array)
    expect(res.body[0].total).toBe('1')
  })

  test('aggregate filters', async () => {
    const res = await request(server).get('/aggregate/posts?filters[test1]=hehe&q=le')
    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(Array)
    expect(res.body[0].total).toBe('1')
  })
  posts.setup(req => req.query({before: 'before'}), demo)
  posts.create({
    before: (req, data) => req.query({before: data.id})
  })
  posts.list({
    before: (req, data) => req.query({before: data.id})
  })
  posts.item({
    before: (req, data) => req.query({before: data.id})
  })
  posts.update({
    before: (req, data) => req.query({before: data.id}),
    patch: {title: '123'}
  })
  posts.destroy({
    before: (req, data) => req.query({before: data.id})
  })
  test('search', async () => {
    const res = await request(server).get('/posts?before=abc&q=OnlyForSearch')
    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(Array)
    expect(res.body.length).toBe(1)
  })
  test('normal filter', async () => {
    const res = await request(server).get('/posts?before=abc&filters[user_id]=1000')
    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(Array)
    expect(res.body.length).toBe(0)
    const res1 = await request(server).get('/posts?before=abc&filters[user_id]=500')
    expect(res1.status).toBe(200)
    expect(res1.body).toBeInstanceOf(Array)
    expect(res1.body.length).toBe(1)
  })
  test('custom filter', async () => {
    const res = await request(server).get('/posts?before=abc&filters[tag]=A')
    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(Array)
    expect(res.body.length).toBe(1)
  })
})
