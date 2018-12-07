
const request = require('supertest')
const { last, isArray, isFunction, forIn } = require('lodash')
const { expect, test, afterAll, beforeEach } = global
const Promise = require('bluebird')
const context = {}


function assertSuccess (status, attrs = null) {
  return (res, strict = true) => {
    expect(res.status).toBe(status)
    if (attrs && strict) {
      forIn(attrs, (v, k) => {
        expect(res.body[k]).toEqual(v)
      })
    }
  }
}

function assertError () {
  return e => { throw e }
}

class ResourceTester {
  constructor (server, paths, options) {
    this.options = Object.assign({
      idAttribute: 'id',
      teardown: true
    }, options)
    this.server = server
    this.middlewares = []
    this.paths = !isArray(paths) ? [paths] : paths
    if (this.options.teardown) {
      afterAll(async () => {
        await Promise.promisify(this.server.close).call(this.server)
      })
    }
  }
  get testPath () { return this.paths.join('/:id') }
  use (...middlewares) {
    this.middlewares = this.middlewares.concat(middlewares)
    return this
  }
  _getPathWithContext(paths, index, items) {
    index = parseInt(index)
    let path = ''
    for (var i = 0; i <= index; i++) {
      if (i === index) {
        path += `${paths[index]}`
      } else {
        path += `${paths[i]}/${items[i][this.options.idAttribute]}`
      }
    }
    return path
  }
  setup (setup) {
    beforeEach(async () => {
      const utils = {
        create: async (nestedDatas, options = {}) => {
          nestedDatas = isArray(nestedDatas) ? nestedDatas : [nestedDatas]
          const { use = req => req } = options
          const items = []
          const responses = []
          let current
          for (const index in nestedDatas) {
            const data = !isFunction(nestedDatas[index])
              ? parent => nestedDatas[index]
              : nestedDatas[index]
            const req = this.applyMiddleware(use,
              request(this.server).post(this._getPathWithContext(this.paths, index, items))
            )
            const response = nestedDatas[index] ? req.send(data(current)) : req
            current = (await response).body
            items.push(current)
            responses.push(response)
          }
          return { items, responses }
        }
      }
      const contextSetup = isFunction(setup) ? setup : async ({create}) => {
        return await create(!isArray(setup) ? [setup] : setup)
      }
      Object.assign(context, await contextSetup(utils))
    })

    return this
  }
  applyMiddleware (middleware, req, data) {
    const middlewares = [ middleware ].concat(this.middlewares)
    return middlewares.reduce((req, middleware) => {
      middleware(req, data)
      return req
    }, req)
  }
  create (data = null, options = {}) {
    options = isFunction(options) ? {assert: options} : options
    const { assert = assertSuccess(201, data), assertCatch = assertError(), use = req => req } = options
    test(`POST ${this.testPath}`, async () => {
      const response = !data
        ? last(context.responses)
        : this.applyMiddleware(use, request(this.server).post(
          this._getPathWithContext(this.paths, this.paths.length - 1, context.items)
        ), data).send(data)
      await response.then(res => {
        assert(res, { success: assertSuccess(201, data) })
      }).catch(assertCatch)
    })
    return this
  }
  read (args) {
    const {list = [], item = []} = args || {}
    this.list(...list)
    this.item(...item)
    return this
  }
  list (data = null, options = {}) {
    options = isFunction(options) ? {assert: options} : options
    const {
      assert = assertSuccess(200),
      assertCatch = assertError(),
      use = req => req,
      prepare = true
    } = options
    test(`LIST ${this.testPath}`, async () => {
      let item
      if (prepare) {
        if (data) {
          const req = this.applyMiddleware(use, request(this.server).post(
            this._getPathWithContext(this.paths, this.paths.length - 1, context.items)
          ))
          if (isFunction(data)) {
            item = await data({req})
          } else {
            item = await req.send(data)
          }
        } else {
          item = last(context.items)
        }
      } else {
        item = data
      }
      const response = this.applyMiddleware(use, request(this.server).get(
        this._getPathWithContext(this.paths, this.paths.length - 1, context.items)
      ), item)
      await response.then(res => {
        assert(res, { success: assertSuccess(200) })
      }).catch(assertCatch)
    })
    return this
  }
  item (data = null, options = {}) {
    options = isFunction(options) ? {assert: options} : options
    const {
      assert = assertSuccess(200),
      assertCatch = assertError(),
      use = req => req,
      prepare = true
    } = options
    test(`GET ${this.testPath}/:id`, async () => {
      let item
      if (prepare) {
        if (data) {
          const req = this.applyMiddleware(use, request(this.server).post(
            this._getPathWithContext(this.paths, this.paths.length - 1, context.items)
          ))
          let res
          if (isFunction(data)) {
            res = await data({req})
          } else {
            res = await req.send(data)
          }
          item = res.body
        } else {
          item = last(context.items)
        }
      } else {
        item = data
      }
      const response = this.applyMiddleware(use, request(this.server).get(
        `${this._getPathWithContext(this.paths, this.paths.length - 1, context.items)}/${item[this.options.idAttribute]}`
      ), item)
      await response.then(res => {
        assert(res, { success: assertSuccess(200), item })
      }).catch(assertCatch)
    })
    return this
  }
  update (data = null, options = {}) {
    options = isFunction(options) ? {assert: options} : options
    const {
      assert = assertSuccess(202),
      assertCatch = assertError(),
      use = req => req,
      patch,
      prepare = true
    } = options
    test(`PATCH ${this.testPath}/:id`, async () => {
      let item
      if (prepare) {
        if (data) {
          const req = this.applyMiddleware(use, request(this.server).post(
            this._getPathWithContext(this.paths, this.paths.length - 1, context.items)
          ))
          let res
          if (isFunction(data)) {
            res = await data({req})
          } else {
            res = await req.send(data)
          }
          item = res.body
        } else {
          item = last(context.items)
        }
      } else {
        item = data
      }

      const response = this.applyMiddleware(use, request(this.server).patch(
        `${this._getPathWithContext(this.paths, this.paths.length - 1, context.items)}/${item[this.options.idAttribute]}`
      ), Object.assign({}, item, patch)).send(patch)
      await response.then(res => {
        assert(res, { success: assertSuccess(202, patch) })
      }).catch(assertCatch)
    })
    return this
  }
  destroy (data = null, options = {}) {
    options = isFunction(options) ? {assert: options} : options
    const {
      assert = assertSuccess(204),
      assertCatch = assertError(),
      use = req => req,
      prepare = true
    } = options
    test(`DELETE ${this.testPath}/:id`, async () => {
      let item
      if (prepare) {
        if (data) {
          const req = this.applyMiddleware(use, request(this.server).post(
            this._getPathWithContext(this.paths, this.paths.length - 1, context.items)
          ))
          let res
          if (isFunction(data)) {
            res = await data({req})
          } else {
            res = await req.send(data)
          }
          item = res.body
        } else {
          item = last(context.items)
        }
      } else {
        item = data
      }

      const response = this.applyMiddleware(use, request(this.server).del(
        `${this._getPathWithContext(this.paths, this.paths.length - 1, context.items)}/${item[this.options.idAttribute]}`
      ), item)
      await response.then(res => {
        assert(res, { success: assertSuccess(204) })
      }).catch(assertCatch)
    })
    return this
  }
  crud (options) {
    return this.create().read().update(null, options).destroy()
  }
}

module.exports = function restful (...args) {
  return new ResourceTester(...args)
}
