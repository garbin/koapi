
const request = require('supertest')
const { isString, isFunction } = require('lodash')
const { expect, test } = global

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
      const getHeaders = isFunction(headers) ? headers : _ => headers
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
    const { name, variables = {}, update = {}, inputType = `${queryInfo.name}Input` } = queryInfo
    const { input } = variables
    const { input: updateAttrs } = update
    const createMutation = `create${name}`
    const updateMutation = `update${name}`
    const destroyMutation = `remove${name}`
    const assertCreateSuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[createMutation]).not.toBe(null)
      for (const k in input) {
        expect(data[createMutation][k]).toEqual(input[k])
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
      for (const key in input) {
        createKeys.push(key)
      }
      const created = await createReq.send({
        query: `
          mutation Mutation($input: ${inputType}!){
            ${createMutation}(input: $input) {
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
          mutation Mutation($input: JSON!, $id: ID!){
            ${updateMutation}(input: $input, id: $id) {
              ${updateKeys.join('\n')}
            }
          }
        `,
        variables: {
          input: updateAttrs,
          id: created.body.data[createMutation].id
        }
      })
      assertUpdate(updated.body, {res: updated, assertSuccess: assertUpdateSuccess})
      const destroyReq = request(server).post(endpoint)
      for (const name in reqHeaders) {
        destroyReq.set(name, reqHeaders[name])
      }
      const removed = await destroyReq.send({
        query: `
          mutation Mutation($id: ID!){
            ${destroyMutation}(id: $id)
          }
        `,
        variables: {
          id: created.body.data[createMutation].id
        }
      })
      assertDestroy(removed.body, {res: removed, assertSuccess: assertDestroySuccess})
    })
  },
  create (title, requestInfo, getQuery, assertRes) {
    const query = isFunction(getQuery) ? getQuery : _ => getQuery
    const queryInfo = query()
    const { mutation = `create${queryInfo.name}`, inputType = `${queryInfo.name}Input`, variables = {} } = queryInfo
    const { input } = variables
    const assertSuccess = function ({data, errors}, {res}) {
      expect(errors).toBe(undefined)
      expect(data).not.toBe(undefined)
      expect(data).not.toBe(null)
      expect(data[mutation]).not.toBe(null)
      for (const k in input) {
        expect(data[mutation][k]).toEqual(input[k])
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
      for (const key in input) {
        keys.push(key)
      }
      const res = await req.send({
        query: `
          mutation Mutation($input: ${inputType}!){
            ${mutation}(input: $input) {
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

graphql.mutation = graphql.cud
module.exports = graphql
