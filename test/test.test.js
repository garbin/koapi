import { server } from './lib/server'
import restful from '../src/test'

describe('RESTful API1', function () {
  const posts = restful(server, '/posts')
  const data = {
    title: 'abc',
    content: 'haha',
    tags: ['a', 'b'],
    test1: 'haha'
  }
  posts.create({ data })
  posts.update({
    data,
    patch: {
      title: '123'
    }
  })
  posts.read({ data })
  posts.destroy({ data })
})
