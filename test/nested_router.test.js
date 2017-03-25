const { server } = require('./lib/server')
const { restful } = require('../lib/test')
const { describe } = global

describe('RESTful API', function () {
  const comments = restful(server, '/posts/1/comments')
  const comment = {
    title: 'abc',
    content: 'haha',
    user_id: 1
  }
  comments.setup(comment).crud({patch: {title: '321'}})
})
