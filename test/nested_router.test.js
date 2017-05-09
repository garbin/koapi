const { server } = require('./lib/server')
const { restful } = require('../lib/test')
const { describe } = global

describe('RESTful API', function () {
  const comments = restful(server, '/posts', '/comments')
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
