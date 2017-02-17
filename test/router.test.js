import { server } from './lib/server'
import restful from '../src/test'

describe('RESTful API', function () {
  const posts = restful(server, '/posts')
  const demo = {
    title: 'abc',
    content: 'haha',
    tags: ['a', 'b'],
    test1: 'haha'
  }
  // posts.setup(demo).create().update({patch: {title: '123'}}).read().destroy()
  posts.setup(demo).crud({patch: {title: '123'}})
  // posts.crud(demo)
})
