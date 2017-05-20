const { server } = require('./lib/server')
const { restful, request } = require('../lib/test')
const Promise = require('bluebird')
const { describe, test, afterAll, expect } = global

afterAll(async () => {
  await Promise.promisify(server.close).call(server)
})

describe('RESTful API 1', function () {
  const posts = restful(server, '/posts', {teardown: false})
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

describe('RESTful API 2', function () {
  const comments = restful(server, '/posts', '/comments', {teardown: false})
  comments.setup(req => req.query({before: 'abc'}), {
    title: 'abc',
    content: 'haha',
    tags: ['a', 'b'],
    test1: 'haha'
  }, {
    title: 'abc',
    content: 'haha',
    user_id: 1
  })
  comments.crud({patch: {title: '321'}})
})

describe('RESTful API base', function () {
  const posts = restful(server, '/posts', {teardown: false})
  const data = {
    title: 'abc',
    content: 'haha',
    tags: ['a', 'b'],
    test1: 'haha'
  }
  posts.create({
    before (req) {
      return req.query({before: 'abc'})
    },
    data
  })
  posts.update({
    before: req => req.query({before: 'abc'}),
    data,
    patch: {
      title: '123'
    }
  })
  posts.read({list: {
    before: req => req.query({before: 'abc'}),
    data
  },
    item: {
      before: req => req.query({before: 'abc'}),
      data
    }
  })
  posts.destroy({
    before: req => req.query({before: 'abc'}),
    data
  })
})

describe('RESTful API category', function () {
  const categories = restful(server, '/categories', {teardown: false})
  const demo = {
    category_name: 'Haha'
  }
  categories.setup(null, demo).crud({
    patch: {category_name: '123'}
  })
})
