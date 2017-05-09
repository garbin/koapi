const { server } = require('./lib/server')
const { restful } = require('../lib/test')
const { describe } = global

describe('RESTful API1', function () {
  const posts = restful(server, '/posts')
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
