const { server } = require('./lib/server')
const { graphql } = require('../lib/test')
const Promise = require('bluebird')
const { describe, afterAll, expect } = global

const graphqlRequest = {
  server,
  endpoint: '/graphql'
}

afterAll(async () => {
  await Promise.promisify(server.close).call(server)
})

describe('GraphQL', () => {
  graphql.query('posts', graphqlRequest, `
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
  graphql.query('searchByType', graphqlRequest, `
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
  `, ({data}) => {
    expect(data.search.edges).toBeInstanceOf(Array)
    expect(data.search.pageInfo.hasNextPage).toBe(true)
    expect(data.search.edges[0].cursor).not.toBe(null)
    expect(data.search.edges[0].node).not.toBe(null)
  })
  graphql.query('searchByHelper', graphqlRequest, `
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
  `, ({data}) => {
    expect(data.searchByHelper.edges).toBeInstanceOf(Array)
    expect(data.searchByHelper.pageInfo.hasNextPage).toBe(true)
    expect(data.searchByHelper.edges[0].cursor).not.toBe(null)
    expect(data.searchByHelper.edges[0].node).not.toBe(null)
  })
  graphql.query('searchByOffset', graphqlRequest, `
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
  `, ({data}) => {
    expect(data.searchByOffset.edges).toBeInstanceOf(Array)
    expect(data.searchByOffset.pageInfo.hasNextPage).toBe(true)
    expect(data.searchByOffset.edges[0].cursor).not.toBe(null)
    expect(data.searchByOffset.edges[0].node).not.toBe(null)
  })
  graphql.query('searchByOffset None', graphqlRequest, `
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
  `, ({data}) => {
    expect(data.searchByOffset.edges).toBeInstanceOf(Array)
    expect(data.searchByOffset.edges.length).toBe(0)
    expect(data.searchByOffset.totalCount).toBe(0)
  })
  graphql.query('searchByCursor', graphqlRequest, `
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
  `, ({data}) => {
    expect(data.searchByCursor.edges).toBeInstanceOf(Array)
    expect(data.searchByCursor.pageInfo.hasNextPage).toBe(true)
    expect(data.searchByCursor.edges[0].cursor).not.toBe(null)
    expect(data.searchByCursor.edges[0].node).not.toBe(null)
  })
  graphql.query('nested', graphqlRequest, `
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
  `, ({data}) => {
    expect(data.posts).toBeInstanceOf(Array)
    expect(data.posts[0].commentList).toBeInstanceOf(Array)
  })
  graphql.query('post', graphqlRequest, `
    query Query {
      post(id: 1) {
        id
        title
        content
      }
    }
  `, ({data}) => {
    expect(data.post.id).toBe(1)
  })
  graphql.query('mutation test', graphqlRequest, `
    mutation {
      test(id: 110)
    }
  `, ({data}) => {
    expect(data.test).toBe(true)
  })
  graphql.query('mutation compose', graphqlRequest, `
    mutation {
      compose {
        attr1
        attr2
      }
    }
  `, ({data}) => {
    expect(data.compose.attr1).toBe('1')
    expect(data.compose.attr2).toBe('2')
  })
  graphql.query('mutation with args', graphqlRequest, `
    mutation {
      compose(id: "Haha") {
        attr1
        attr2
      }
    }
  `, ({data}) => {
    expect(data.compose).toBe(null)
  })
  graphql.create('create comment', graphqlRequest, {
    name: 'Comment',
    variables: {
      attributes: { title: 'comment title', content: 'comment content' }
    }
  })
  // graphql.create('create post', graphqlRequest, {
  //   name: 'Post',
  //   variables: {
  //     attributes: { test1: 'Hehe', title: 'post title', content: 'post content' }
  //   }
  // })
  graphql.mutation('Mutation', graphqlRequest, {
    name: 'Post',
    variables: {
      attributes: { test1: 'Hehe', title: 'post title', content: 'post content' }
    },
    update: {
      attributes: { title: 'edited' }
    }
  })
  // graphql.update('update post', graphqlRequest, {
  //   name: 'Post',
  //   variables: {
  //     attributes: { title: 'post title 1' },
  //     id: 1
  //   }
  // })
  // graphql.destroy('destroy post', graphqlRequest, {
  //   name: 'Post',
  //   variables: {
  //     id: 2
  //   }
  // })
  graphql.query('combine query', graphqlRequest, `
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
  `, ({data}) => {
    expect(data.posts).toBeInstanceOf(Array)
    expect(data.post.id).toBe(1)
  })
})
