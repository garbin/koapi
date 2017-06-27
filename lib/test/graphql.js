
const request = require('supertest')
const { isString, isFunction, omit } = require('lodash')
const { expect } = global

function assertPass (queryName, result, omits) {
  return graphql.assert.ok(({data}) => {
    const actually = omits ? omit(data[queryName], omits) : data[queryName]
    expect(actually).toEqual(result)
  })
}

function getArgs (defaultArgs, userArgs) {
  const args = Object.assign(defaultArgs, userArgs)
  const definedArgs = []
  const requireArgs = []
  Object.entries(args).forEach(([name, inputType]) => {
    definedArgs.push(`$${name}: ${inputType}`)
    requireArgs.push(`${name}: $${name}`)
  })
  return [definedArgs.join(','), requireArgs.join(',')]
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
      const created = await graphql.presets.create(requestInfo, Object.assign({
        type
      }, create))
      const id = created.body.data[`create${type}`].id
      await graphql.presets.update(requestInfo, Object.assign({}, update, {
        type,
        variables: Object.assign({ id }, update.variables)
      }))
      await graphql.presets.remove(requestInfo, {
        type,
        variables: { id }
      })
    },
    create (requestInfo, queryInfo, getAssert) {
      const { type, variables, args } = queryInfo
      const mutationName = `create${type}`
      const inputType = queryInfo.inputType ? `${queryInfo.inputType}!` : 'JSON!'
      const { input } = variables
      const fields = []
      for (const field in input) fields.push(field)
      const [ definedArgs, requireArgs ] = getArgs({ input: inputType }, args)
      const query = {
        query: `
          mutation Create(${definedArgs}) {
            ${mutationName}(${requireArgs}) {
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
      const { type, variables, args } = queryInfo
      const mutationName = `update${type}`
      const inputType = queryInfo.inputType ? `${queryInfo.inputType}!` : 'JSON!'
      const { input } = variables
      const fields = []
      for (const field in input) fields.push(field)
      const [ definedArgs, requireArgs ] = getArgs({
        input: inputType,
        id: `ID!`
      }, args)
      const query = {
        query: `
          mutation Update(${definedArgs}) {
            ${mutationName}(${requireArgs}) {
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
      const { type, variables, args } = queryInfo
      const mutationName = `remove${type}`
      const [ definedArgs, requireArgs ] = getArgs({
        id: `ID!`
      }, args)
      const query = {
        query: `
          mutation Remove(${definedArgs}) {
            ${mutationName}(${requireArgs})
          }
        `,
        variables
      }
      const assert = getAssert || assertPass(mutationName, true)
      return graphql.test(requestInfo, query, assert)
    }
  }
}
