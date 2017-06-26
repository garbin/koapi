
const request = require('supertest')
const { isString, isFunction, omit } = require('lodash')
const { expect } = global

function assertPass (queryName, result, omits) {
  return graphql.assert.ok(({data}) => {
    const actually = omits ? omit(data[queryName], omits) : data[queryName]
    expect(actually).toEqual(result)
  })
}

const graphql = module.exports = {
  test (requestInfo, getQuery, getAssert) {
    const {server, endpoint = '/graphql', headers = {}} = requestInfo
    const query = isFunction(getQuery) ? getQuery : () =>
      isString(getQuery) ? {query: getQuery} : getQuery
    const assert = isFunction(getAssert) ? getAssert : assertPass(getAssert)
    const req = request(server).post(endpoint)
    for (const name in headers) req.set(name, headers[name])
    return req.send(query()).then(res => {
      assert(res.body, res, { assertPass })
      return res
    })
  },
  assert: {
    ok (assert) {
      return (body, res, helpers) => {
        const {data, errors} = body
        expect(errors).toBe(undefined)
        expect(data).not.toBe(null)
        assert(body, res, helpers)
        expect(res.status).toBe(200)
      }
    },
    fail (assert) {
      return (body, res, helpers) => {
        const {errors} = body
        expect(errors).toBeInstanceOf(Array)
        assert(body, res, helpers)
      }
    }
  },
  presets: {
    async cur (requestInfo, queryInfo) {
      const { type, steps: { create, update } } = queryInfo
      const created = await graphql.presets.create(requestInfo, {
        type,
        inputType: create.inputType,
        variables: create.variables
      })
      const id = created.body.data[`create${type}`].id
      await graphql.presets.update(requestInfo, {
        type,
        inputType: update.inputType,
        variables: Object.assign({ id }, update.variables)
      })
      await graphql.presets.remove(requestInfo, {
        type,
        variables: { id }
      })
    },
    create (requestInfo, queryInfo, getAssert) {
      const { type, variables } = queryInfo
      const mutationName = `create${type}`
      const inputType = queryInfo.inputType || 'JSON'
      const { input } = variables
      const fields = []
      for (const field in input) fields.push(field)
      const query = {
        query: `
          mutation Create($input: ${inputType}!) {
            ${mutationName}(input: $input) {
              id
              ${fields.join('\n')}
            }
          }
        `,
        variables
      }
      const assert = getAssert || assertPass(mutationName, input, ['id'])
      return graphql.test(requestInfo, query, assert)
    },
    update (requestInfo, queryInfo, getAssert) {
      const { type, variables } = queryInfo
      const mutationName = `update${type}`
      const inputType = queryInfo.inputType || 'JSON'
      const { input } = variables
      const fields = []
      for (const field in input) fields.push(field)
      const query = {
        query: `
          mutation Update($input: ${inputType}!, $id: ID!) {
            ${mutationName}(input: $input, id: $id) {
              ${fields.join('\n')}
            }
          }
        `,
        variables
      }
      const assert = getAssert || assertPass(mutationName, input)
      return graphql.test(requestInfo, query, assert)
    },
    remove (requestInfo, queryInfo, getAssert) {
      const { type, variables } = queryInfo
      const mutationName = `remove${type}`
      const query = {
        query: `
          mutation Remove($id: ID!) {
            ${mutationName}(id: $id)
          }
        `,
        variables
      }
      const assert = getAssert || assertPass(mutationName, true)
      return graphql.test(requestInfo, query, assert)
    }
  }
}
