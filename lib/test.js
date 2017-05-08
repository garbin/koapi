const request = require('supertest')
const _ = require('lodash')
const { expect, test, afterAll, beforeEach } = global
const Promise = require('bluebird')

class ResourceTester {
  constructor (server, ...paths) {
    this.server = server
    this.paths = paths
    this.middlewares = []
    this.teardowns = [
      async () => {
        await Promise.promisify(this.server.close).call(this.server)
      }
    ]
    const self = this
    beforeEach(function () {
      this.resources = {
        promises: [],
        result: [],
        current: null
      }
      this.path = (withId = false) => {
        const path = self.paths.reduce((path, item, index) => {
          const resource = this.resources.result[index]
          if (index + 1 === self.paths.length) {
            if (withId) {
              path += `${item}/${resource.body.id}`
            } else {
              path += item
            }
          } else {
            path += `${item}/${resource.body.id}`
          }
          return path
        }, '')
        return path
      }
    })
    afterAll(async () => {
      await Promise.all(this.teardowns.map(td => td()))
    })
  }
  get pathPattern () {
    return this.paths.join('/:id')
  }
  teardown (...down) {
    this.teardowns.push(...down)
    return this
  }
  setup (middleware, ...datas) {
    const self = this
    middleware = middleware || (req => req)
    beforeEach(async function () {
      for (const index in datas) {
        const body = _.isFunction(datas[index]) ? datas[index] : () => datas[index]
        const data = body(this.resources.result[index - 1] || {})
        let path = ''
        for (let i = 0; i < index; i++) {
          path += `${self.paths[i]}/${this.resources.result[i].body.id}`
        }
        path += self.paths[index]
        const resource = self.req(middleware(request(self.server).post(path)))
        if (data) resource.send(data)
        this.resources.promises.push(resource)
        this.resources.result.push(await resource)
      }
      this.resources.current = _.last(this.resources.promises)
    })

    return this
  }
  use (...middlewares) {
    if (middlewares) {
      this.middlewares = middlewares
    }
    return this
  }
  req (req) {
    this.middlewares.forEach(middleware => middleware(req))
    return req
  }
  options (options = {}) {
    let before, assert, data, patch, errorAssert, target, assertOverride
    if (_.isFunction(options)) {
      assert = options
    } else {
      before = options.before
      assert = options.assert
      errorAssert = options.errorAssert
      data = options.data
      patch = options.patch
      target = options.target
      assertOverride = options.assertOverride
    }
    before = before || (req => req)
    assert = assert || (res => res)
    errorAssert = errorAssert || (err => { throw err })

    return { before, assert, data, patch, errorAssert, target, assertOverride }
  }
  create (options) {
    const {before, assert, data, errorAssert} = this.options(options)
    const self = this
    const basic = res => {
      expect(res.status).toBe(201)
      return res
    }
    test(`POST ${this.pathPattern}`, async function () {
      let res
      if (this.resources.current) {
        res = this.resources.current
      } else {
        res = self.req(before(request(self.server).post(this.path()), data))
        if (data) res.send(data)
      }
      await res.then(basic).then(assert).catch(errorAssert)
    })
    return this
  }
  update (options) {
    const {before, assert, data, patch, errorAssert, assertOverride} = this.options(options)
    const self = this
    const basic = res => {
      expect(res.status).toBe(202)
      if (!assertOverride) {
        _.forIn(patch, (v, k) => expect(res.body[k]).toBe(v))
      }
      return res
    }
    test(`PATCH ${this.pathPattern}/:id`, async function () {
      let res
      if (this.resources.current) {
        res = this.resources.current
      } else {
        res = self.req(before(request(self.server).post(this.path())))
        if (data) res.send(data)
      }
      const origin = await res
      const ures = self.req(before(request(self.server).patch(`${this.path()}/${origin.body.id}`), origin.body))
      if (patch) ures.send(patch)
      await ures.then(basic).then(assert).catch(errorAssert)
    })
    return this
  }
  list (options) {
    const {before, assert, data, errorAssert} = this.options(options)
    const self = this
    const basic = res => {
      expect(res.status).toBe(200)
      return res
    }
    test(`GET ${this.pathPattern}`, async function () {
      let context = {}
      if (data || this.resources.current) {
        context = await (this.resources.current || self.req(before(request(self.server).post(this.path()).send(data), data)))
      }
      await self.req(before(request(self.server).get(this.path()), context.body)).then(basic).then(res => {
        expect(res.body).toBeInstanceOf(Array)
        return res
      }).then(assert).catch(errorAssert)
    })
    return this
  }
  item (options) {
    const {before, assert, data, target, errorAssert, assertOverride} = this.options(options)
    const self = this
    const basic = res => {
      expect(res.status).toBe(200)
      return res
    }
    test(`GET ${this.pathPattern}/:id`, async function () {
      let origin
      if (!target) {
        const res = this.resources.current || self.req(before(request(self.server).post(this.path()).send(data), data))
        origin = (await res).body
      } else {
        origin = target
      }
      await self.req(before(request(self.server).get(`${this.path()}/${origin.id}`), origin)).then(basic).then(res => {
        if (!assertOverride) {
          expect(res.body.id).toBe(origin.id)
        }
        return res
      }).then(assert).catch(errorAssert)
    })
    return this
  }
  read (options = {}) {
    const {list, item} = options
    return this.list(list).item(item)
  }
  destroy (options) {
    const {before, assert, data, errorAssert} = this.options(options)
    const self = this
    const basic = res => {
      expect(res.status).toBe(204)
      return res
    }
    test(`DELETE ${this.pathPattern}/:id`, async function () {
      let res
      if (this.resources.current) {
        res = this.resources.current
      } else {
        res = self.req(before(request(self.server).post(this.path())))
        if (data) res.send(data)
      }
      const origin = await res
      await self.req(before(request(self.server).del(`${this.path()}/${origin.body.id}`), origin.body)).then(basic).then(assert).catch(errorAssert)
    })
    return this
  }
  crud (options) {
    return this.create(options).read(options).update(options).destroy(options)
  }
}

function restful (server, ...paths) {
  return new ResourceTester(server, ...paths)
}

module.exports = {
  default: restful,
  restful,
  ResourceTester,
  request
}
