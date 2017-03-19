const { server } = require('./lib/server')
const { restful } = require('../lib/test')

describe('RESTful API', function () {
  const posts = restful(server, '/posts')
  const demo = {
    title: 'abc',
    content: 'haha',
    tags: ['a', 'b'],
    test1: 'haha'
  }
  posts.setup(demo).crud({patch: {title: '123'}})
})
