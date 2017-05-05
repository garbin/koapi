const { server } = require('./lib/server')
const { restful } = require('../lib/test')
const { describe } = global

describe('RESTful API', function () {
  const categories = restful(server, '/categories')
  const demo = {
    category_name: 'Haha'
  }
  categories.setup(null, demo).crud({
    patch: {category_name: '123'}
  })
})
