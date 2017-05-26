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
        query Query {
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
  test('searchByType', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query Query {
          search(first: 1, type: POST) {
            totalCount
            edges {
              node {
                id
                title
                comments {
                  id
                  title
                }
              }
              cursor
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.search.edges).toBeInstanceOf(Array)
    expect(response.body.data.search.pageInfo.hasNextPage).toBe(true)
    expect(response.body.data.search.edges[0].cursor).not.toBe(null)
    expect(response.body.data.search.edges[0].node).not.toBe(null)
  })
  test('searchByOffset', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query Query {
          searchByOffset(first: 1) {
            totalCount
            edges {
              node {
                id
                title
                comments {
                  id
                  title
                }
              }
              cursor
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.searchByOffset.edges).toBeInstanceOf(Array)
    expect(response.body.data.searchByOffset.pageInfo.hasNextPage).toBe(true)
    expect(response.body.data.searchByOffset.edges[0].cursor).not.toBe(null)
    expect(response.body.data.searchByOffset.edges[0].node).not.toBe(null)
  })
  test('searchByCursor', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query Query {
          searchByCursor(first: 1) {
            totalCount
            edges {
              node {
                id
                title
                comments {
                  id
                  title
                }
              }
              cursor
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
    `})
    console.log(JSON.stringify(response.body, true, 2))
    expect(response.status).toBe(200)
    expect(response.body.data.searchByCursor.edges).toBeInstanceOf(Array)
    expect(response.body.data.searchByCursor.pageInfo.hasNextPage).toBe(true)
    expect(response.body.data.searchByCursor.edges[0].cursor).not.toBe(null)
    expect(response.body.data.searchByCursor.edges[0].node).not.toBe(null)
  })
  test('nested', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query Query {
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
    expect(response.status).toBe(200)
    expect(response.body.data.posts).toBeInstanceOf(Array)
  })
  test('post', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query Query {
          post(id: 1) {
            id
            title
            content
          }
        }
    `})
    expect(response.body.data.post.id).toBe(1)
    expect(response.status).toBe(200)
  })
  test('mutation', async () => {
    const response = await request(server).post('/graphql').send({query: `
        mutation {
          test(id: 110)
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.test).toBe(true)
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
    expect(response.status).toBe(200)
    expect(response.body.data.removePost.id).toBe(1)
  })
  test('combine query', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query Query {
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
