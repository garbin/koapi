const request = require('supertest')
const { isString, last, isArray, isFunction, forIn } = require('lodash')
const { expect, test, afterAll, beforeEach } = global
const Promise = require('bluebird')
const context = {}

const graphql = {
  query (title, requestInfo, getQuery, assertRes) {
    const query = isFunction(getQuery) ? getQuery : _ =>
      isString(getQuery) ? {query: getQuery} : getQuery
    const queryInfo = query()
    const assertSuccess = function ({data, error}, {res}) {
      expect(data).not.toBe(null)
      for (const k in assertRes) {
        expect(data[k]).toEqual(assertRes[k])
      }
      expect(res.status).toBe(200)
    }
    const assertFailed = function ({data, error}) {
      expect(error.length).not.toBe(0)
    }
    const assert = isFunction(assertRes) ? assertRes : assertSuccess
    test(title, async () => {
      const { server, endpoint = '/graphql', headers = _ => {} } = requestInfo
      const getHeaders = isFunction(headers) ? headers : _ => {}
      const req = request(server).post(endpoint)
      const reqHeaders = getHeaders()
      for (const name in reqHeaders) {
        req.set(name, reqHeaders[name])
      }
      const res = await req.send(queryInfo)
      assert(res.body, {res, assertSuccess, assertFailed})
    })
  },
  cud (title, requestInfo, getQuery, asserts) {
    const query = isFunction(getQuery) ? getQuery : _ => getQuery
    const queryInfo = query()
    const { name, variables = {}, update = {} } = queryInfo
    const { attributes } = variables
    const { attributes: updateAttrs } = update
    const createMutation = `create${name}`
    const updateMutation = `update${name}`
    const destroyMutation = `destroy${name}`
    const assertCreateSuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[createMutation]).not.toBe(null)
      for (const k in attributes) {
        expect(data[createMutation][k]).toEqual(attributes[k])
      }
      expect(res.status).toBe(200)
    }
    const assertUpdateSuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[updateMutation]).not.toBe(null)
      for (const k in updateAttrs) {
        expect(data[updateMutation][k]).toEqual(updateAttrs[k])
      }
      expect(res.status).toBe(200)
    }
    const assertDestroySuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[destroyMutation]).toBe(true)
      expect(res.status).toBe(200)
    }
    const {
      assertCreate = assertCreateSuccess,
      assertUpdate = assertUpdateSuccess,
      assertDestroy = assertDestroySuccess
    } = asserts || {}
    test(title, async () => {
      const { server, endpoint = '/graphql', headers = _ => {} } = requestInfo
      const getHeaders = isFunction(headers) ? headers : _ => {}
      const createReq = request(server).post(endpoint)
      const reqHeaders = getHeaders()
      for (const name in reqHeaders) {
        createReq.set(name, reqHeaders[name])
      }
      const createKeys = []
      for (const key in attributes) {
        createKeys.push(key)
      }
      const created = await createReq.send({
        query: `
          mutation Mutation($attributes: JSON!){
            ${createMutation}(attributes: $attributes) {
              id
              ${createKeys.join('\n')}
            }
          }
        `,
        variables
      })
      assertCreate(created.body, {res: created, assertSuccess: assertCreateSuccess})
      const updateReq = request(server).post(endpoint)
      for (const name in reqHeaders) {
        updateReq.set(name, reqHeaders[name])
      }
      const updateKeys = []
      for (const key in updateAttrs) {
        updateKeys.push(key)
      }
      const updated = await updateReq.send({
        query: `
          mutation Mutation($attributes: JSON!, $id: Int!){
            ${updateMutation}(attributes: $attributes, id: $id) {
              ${updateKeys.join('\n')}
            }
          }
        `,
        variables: {
          attributes: updateAttrs,
          id: created.body.data[createMutation].id
        }
      })
      assertUpdate(updated.body, {res: updated, assertSuccess: assertUpdateSuccess})
      const destroyReq = request(server).post(endpoint)
      for (const name in reqHeaders) {
        destroyReq.set(name, reqHeaders[name])
      }
      const deleted = await destroyReq.send({
        query: `
          mutation Mutation($id: Int!){
            ${destroyMutation}(id: $id)
          }
        `,
        variables: {
          id: created.body.data[createMutation].id
        }
      })
      assertDestroy(deleted.body, {res: deleted, assertSuccess: assertDestroySuccess})
    })
  },
  create (title, requestInfo, getQuery, assertRes) {
    const query = isFunction(getQuery) ? getQuery : _ => getQuery
    const queryInfo = query()
    const { mutation = `create${queryInfo.name}`, variables = {} } = queryInfo
    const { attributes } = variables
    const assertSuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[mutation]).not.toBe(null)
      for (const k in attributes) {
        expect(data[mutation][k]).toEqual(attributes[k])
      }
      expect(res.status).toBe(200)
    }
    const assertFailed = function ({data, error}) {
      expect(error.length).not.toBe(0)
    }
    const assert = isFunction(assertRes) ? assertRes : assertSuccess
    test(title, async () => {
      const { server, endpoint = '/graphql', headers = _ => {} } = requestInfo
      const getHeaders = isFunction(headers) ? headers : _ => {}
      const req = request(server).post(endpoint)
      const reqHeaders = getHeaders()
      for (const name in reqHeaders) {
        req.set(name, reqHeaders[name])
      }
      const keys = []
      for (const key in attributes) {
        keys.push(key)
      }
      const res = await req.send({
        query: `
          mutation Mutation($attributes: JSON!){
            ${mutation}(attributes: $attributes) {
              ${keys.join('\n')}
            }
          }
        `,
        variables
      })
      assert(res.body, {res, assertSuccess, assertFailed})
    })
  },
  update (title, requestInfo, getQuery, assertRes) {
    const query = isFunction(getQuery) ? getQuery : _ => getQuery
    const queryInfo = query()
    const { mutation = `update${queryInfo.name}`, variables = {} } = queryInfo
    const { attributes } = variables
    const assertSuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[mutation]).not.toBe(null)
      for (const k in attributes) {
        expect(data[mutation][k]).toEqual(attributes[k])
      }
      expect(res.status).toBe(200)
    }
    const assertFailed = function ({data, error}) {
      expect(error.length).not.toBe(0)
    }
    const assert = isFunction(assertRes) ? assertRes : assertSuccess
    test(title, async () => {
      const { server, endpoint = '/graphql', headers = _ => {} } = requestInfo
      const getHeaders = isFunction(headers) ? headers : _ => {}
      const req = request(server).post(endpoint)
      const reqHeaders = getHeaders()
      for (const name in reqHeaders) {
        req.set(name, reqHeaders[name])
      }
      const keys = []
      for (const key in attributes) {
        keys.push(key)
      }
      const res = await req.send({
        query: `
          mutation Mutation($attributes: JSON!, $id: Int!){
            ${mutation}(attributes: $attributes, id: $id) {
              ${keys.join('\n')}
            }
          }
        `,
        variables
      })
      assert(res.body, {res, assertSuccess, assertFailed})
    })
  },
  destroy (title, requestInfo, getQuery, assertRes) {
    const query = isFunction(getQuery) ? getQuery : _ => getQuery
    const queryInfo = query()
    const { mutation = `destroy${queryInfo.name}`, variables = {} } = queryInfo
    const assertSuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[mutation]).toBe(true)
      expect(res.status).toBe(200)
    }
    const assertFailed = function ({data, error}) {
      expect(error.length).not.toBe(0)
    }
    const assert = isFunction(assertRes) ? assertRes : assertSuccess
    test(title, async () => {
      const { server, endpoint = '/graphql', headers = _ => {} } = requestInfo
      const getHeaders = isFunction(headers) ? headers : _ => {}
      const req = request(server).post(endpoint)
      const reqHeaders = getHeaders()
      for (const name in reqHeaders) {
        req.set(name, reqHeaders[name])
      }
      const res = await req.send({
        query: `
          mutation Mutation($id: Int!){
            ${mutation}(id: $id)
          }
        `,
        variables
      })
      assert(res.body, {res, assertSuccess, assertFailed})
    })
  }
}

function getPathWithContext (paths, index, items) {
  index = parseInt(index)
  let path = ''
  for (var i = 0; i <= index; i++) {
    if (i === index) {
      path += `${paths[index]}`
    } else {
      path += `${paths[i]}/${items[i].id}`
    }
  }
  return path
}

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
    options = Object.assign({
      teardown: true
    }, options)
    this.server = server
    this.middlewares = []
    this.paths = !isArray(paths) ? [paths] : paths
    if (options.teardown) {
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
              request(this.server).post(getPathWithContext(this.paths, index, items))
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
          getPathWithContext(this.paths, this.paths.length - 1, context.items)
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
            getPathWithContext(this.paths, this.paths.length - 1, context.items)
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
        getPathWithContext(this.paths, this.paths.length - 1, context.items)
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
            getPathWithContext(this.paths, this.paths.length - 1, context.items)
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
        `${getPathWithContext(this.paths, this.paths.length - 1, context.items)}/${item.id}`
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
            getPathWithContext(this.paths, this.paths.length - 1, context.items)
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
        `${getPathWithContext(this.paths, this.paths.length - 1, context.items)}/${item.id}`
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
            getPathWithContext(this.paths, this.paths.length - 1, context.items)
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
        `${getPathWithContext(this.paths, this.paths.length - 1, context.items)}/${item.id}`
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

function restful (...args) {
  return new ResourceTester(...args)
}

graphql.mutation = graphql.cud
module.exports = {
  restful,
  graphql,
  request
}
