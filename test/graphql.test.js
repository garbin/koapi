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
  test('searchByHelper', async () => {
    const response = await request(server).post('/graphql').send({query: `
        query Query {
          searchByHelper(first: 1, type: POST) {
            totalCount
            edges {
              node {
                ... on Post {
                  id
                  title
                  comments {
                    id
                    title
                  }
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
    expect(response.body.data.searchByHelper.edges).toBeInstanceOf(Array)
    expect(response.body.data.searchByHelper.pageInfo.hasNextPage).toBe(true)
    expect(response.body.data.searchByHelper.edges[0].cursor).not.toBe(null)
    expect(response.body.data.searchByHelper.edges[0].node).not.toBe(null)
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
    const searchNone = await request(server).post('/graphql').send({query: `
        query Query {
          searchByOffset(keyword: "Notexists") {
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
    expect(searchNone.status).toBe(200)
    expect(searchNone.body.data.searchByOffset.edges).toBeInstanceOf(Array)
    expect(searchNone.body.data.searchByOffset.edges.length).toBe(0)
    expect(searchNone.body.data.searchByOffset.totalCount).toBe(0)
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
    expect(response.body.data.posts[0].commentList).toBeInstanceOf(Array)
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
  test('mutation test', async () => {
    const response = await request(server).post('/graphql').send({query: `
        mutation {
          test(id: 110)
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.test).toBe(true)
  })
  test('mutation compose', async () => {
    const response = await request(server).post('/graphql').send({query: `
        mutation {
          compose {
            attr1
            attr2
          }
        }
    `})
    expect(response.status).toBe(200)
    expect(response.body.data.compose.attr1).toBe('1')
    expect(response.body.data.compose.attr2).toBe('2')
    const error = await request(server).post('/graphql').send({query: `
        mutation {
          compose(id: "Haha") {
            attr1
            attr2
          }
        }
    `})
    expect(error.status).toBe(200)
    expect(error.body.data.compose).toBe(null)
  })
  test('create comment', async () => {
    const res = await request(server).post('/graphql').send({query: `
        mutation {
          createComment(attributes: { title: "comment title", content: "comment content" }) {
            id
            title
            content
          }
        }
    `})
    expect(res.status).toBe(200)
    expect(typeof res.body.data.createComment.id).toBe('number')
    expect(res.body.data.createComment.title).toBe('comment title')
  })
  test('mutation create', async () => {
    const res = await request(server).post('/graphql').send({query: `
        mutation {
          createPost(attributes: { test1: "Hehe", title: "post title", content: "post content" }) {
            id
            title
            content
          }
        }
    `})
    expect(res.status).toBe(200)
    expect(typeof res.body.data.createPost.id).toBe('number')
    expect(res.body.data.createPost.title).toBe('post title')
  })
  test('mutation update', async () => {
    const res = await request(server).post('/graphql').send({query: `
        mutation {
          updatePost(attributes: { title: "post title 1" }, id: 1) {
            id
            title
            content
          }
        }
    `})
    expect(res.status).toBe(200)
    expect(res.body.data.updatePost.title).toBe('post title 1')
  })
  test('mutation destroy', async () => {
    const res = await request(server).post('/graphql').send({query: `
        mutation {
          destroyPost(id: 2)
        }
    `})
    expect(res.status).toBe(200)
    expect(res.body.data.destroyPost).toBe(true)
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
