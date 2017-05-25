const { server } = require('./lib/server')
const { request } = require('../lib/test')
const Promise = require('bluebird')
const { describe, test, afterAll, expect } = global

afterAll(async () => {
  await Promise.promisify(server.close).call(server)
})

describe('GraphQL', () => {
  test('posts', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query RootQuery {
          posts {
            id
            title
            content
          }
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.posts).toBeInstanceOf(Array)
  })
  test('nested', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query RootQuery {
          posts {
            id
            title
            content
            commentList: comments {
              id
              title
              content
            }
          }
        }
    `})
    console.log(response.body)
    expect(response.status).toBe(200)
    expect(response.body.data.posts).toBeInstanceOf(Array)
  })
  test('post', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query RootQuery {
          post(id: 1) {
            id
            title
            content
          }
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.post.id).toBe(1)
  })
  test('mutation', async () => {
    const response = await request(server).post('/graphql').send({query: `
        mutation {
          test(id: 110)
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.test).toBe(null)
  })
  test('mutation remove', async () => {
    const response = await request(server).post('/graphql').send({query: `
        mutation {
          removePost(id: 1) {
            id
            title
            content
          }
        }
    `})
    console.log(response.body)
    expect(response.status).toBe(200)
    expect(response.body.data.removePost.id).toBe(1)
  })
  test('combine query', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query RootQuery {
          posts {
            id
            title
            content
          }
          post(id: 1) {
            id
            title
            content
          }
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.posts).toBeInstanceOf(Array)
    expect(response.body.data.post.id).toBe(1)
  })
})
