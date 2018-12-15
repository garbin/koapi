const { server } = require('./lib/server')
const { graphql } = require('../lib/test')
const Promise = require('bluebird')
const { describe, test, afterAll, expect } = global

const request = { server }

afterAll(async () => {
  await Promise.promisify(server.close).call(server)
})

describe('GraphQL#Query', () => {
  test('query posts', async () => {
    await graphql.test(request, `
      query Query {
        posts {
          id
          title
          content
        }
      }
    `, ({data}, res) => {
      expect(data.posts).toBeInstanceOf(Array)
    })
  })
  test('query fetch', async () => {
    await graphql.test(request, `
      query Query {
        fetch(id: 1, type: POST) {
          ... on Post {
            id
          }
        }
      }
    `, ({data, errors}, res) => {
      expect(errors).toBe(undefined)
      expect(data.fetch.id).toBe('1')
    })
  })
  test('query searchByType', async () => {
    await graphql.test(request, `
      query Query {
        search(first: 1, type: POST) {
          total
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
    `, ({data, errors}, res) => {
      expect(errors).toBe(undefined)
      expect(data.search.edges).toBeInstanceOf(Array)
      expect(data.search.pageInfo.hasNextPage).toBe(true)
      expect(data.search.edges[0].cursor).not.toBe(null)
      expect(data.search.edges[0].node).not.toBe(null)
    })
  })
  test('query searchByHelper', async () => {
    await graphql.test(request, `
      query Query {
        searchByHelper(first: 1, type: POST) {
          total
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
      `, ({data, errors}) => {
        expect(errors).toBe(undefined)
        expect(data).not.toBe(null)
        expect(data.searchByHelper.edges).toBeInstanceOf(Array)
        expect(data.searchByHelper.pageInfo.hasNextPage).toBe(true)
        expect(data.searchByHelper.edges[0].cursor).not.toBe(null)
        expect(data.searchByHelper.edges[0].node).not.toBe(null)
      })
  })
  test('query searchByOffset', async () => {
    await graphql.test(request, `
      query Query {
        searchByOffset(first: 1) {
          total
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
      `, ({data, errors}) => {
        expect(errors).toBe(undefined)
        expect(data.searchByOffset.edges).toBeInstanceOf(Array)
        expect(data.searchByOffset.pageInfo.hasNextPage).toBe(true)
        expect(data.searchByOffset.edges[0].cursor).not.toBe(null)
        expect(data.searchByOffset.edges[0].node).not.toBe(null)
      })
  })
  test('query searchByOffset None', async () => {
    await graphql.test(request, `
      query Query {
        searchByOffset(keyword: "Notexists", filterBy:{tag: "1"}) {
          total
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
      `, ({data, errors}) => {
        expect(errors).toBe(undefined)
        expect(data.searchByOffset.edges).toBeInstanceOf(Array)
        expect(data.searchByOffset.edges.length).toBe(0)
        expect(data.searchByOffset.total).toBe(0)
      })
  })
  test('query searchByCursor', async () => {
    await graphql.test(request, `
      query Query {
        searchByCursor(first: 1) {
          total
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
      `, ({data, errors}) => {
        expect(errors).toBe(undefined)
        expect(data.searchByCursor.edges).toBeInstanceOf(Array)
        expect(data.searchByCursor.pageInfo.hasNextPage).toBe(true)
        expect(data.searchByCursor.edges[0].cursor).not.toBe(null)
        expect(data.searchByCursor.edges[0].node).not.toBe(null)
      })
  })
  test('query nested', async () => {
    await graphql.test(request, `
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
      `, ({data, errors}) => {
        expect(errors).toBe(undefined)
        expect(data.posts).toBeInstanceOf(Array)
        expect(data.posts[0].commentList).toBeInstanceOf(Array)
        expect(data.posts[0].commentList[0]).not.toBe(undefined)
      })
  })
  test(`query post`, async () => {
    await graphql.test(request, `
      query Query {
        post(id: 1) {
          id
          title
          content
        }
      }
      `, ({data, errors}) => {
        expect(errors).toBe(undefined)
        expect(data.post.id).toBe('1')
      })
  })
})

describe('GraphQL#Mutation', () => {
  test('mutation test', async () => {
    await graphql.test(request, `
      mutation {
        test(id: 110)
      }
      `, ({data}) => {
        expect(data.test).toBe(true)
      })
  })
  test('mutation Post cur', async () => {
    await graphql.presets.mutation(request, {
      type: 'Post',
      create: {
        inputType: 'PostInput',
        variables: {
          input: {
            test1: 'haha',
            title: 'title',
            content: 'content'
          }
        }
      },
      update: {
        variables: {
          input: {
            content: 'edited'
          }
        }
      }
    })
  })
  test('mutation create', async () => {
    await graphql.presets.create(request, {
      type: 'Comment',
      variables: {
        input: {
          title: 'post title',
          content: 'post content'
        }
      }
    })
  })
  test('mutation update', async () => {
    await graphql.presets.update(request, {
      type: 'Comment',
      variables: {
        input: {
          title: 'edited'
        },
        id: 1
      }
    })
  })
})
