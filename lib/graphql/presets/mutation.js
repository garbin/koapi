const types = require('../types')

function mutation (type, config) {
  const { model, collection, compose, options = {} } = config || {}
  const base = { model, collection, compose }
  return {
    [`create${type}`]: mutation.create(type, Object.assign({}, base, options.create)),
    [`update${type}`]: mutation.update(type, Object.assign({}, base, options.update)),
    [`remove${type}`]: mutation.remove(type, Object.assign({}, base, options.remove))
  }
}

mutation.create = function (type, options = {}) {
  const {
    collection = ctx => options.model.collection(),
    fields = null,
    input = null,
    args = {},
    saveOptions = {},
    compose = null
  } = options || {}
  const resolve = options.resolve || (async (root, { input }, ctx, info) => {
    const item = await collection(ctx, root).create(input, Object.assign({
      method: 'insert'
    }, saveOptions))
    return item
  })
  const InputObject = input ? types.nonNull(input) : (
    fields ? types.nonNull(new types.Input({
      name: `${type}Input`,
      fields
    })) : types.type(types.JSON)
  )
  return {
    type,
    args: Object.assign({ input: InputObject }, args),
    resolve: compose ? compose(resolve) : resolve
  }
}
mutation.update = function (type, options = {}) {
  const {
    collection = ctx => options.model.collection(),
    fields = null,
    input = null,
    args = {},
    saveOptions = {},
    compose = null
  } = options || {}
  const resolve = options.resolve || (async (root, { input, id }, ctx, info) => {
    const item = await collection(ctx, root).query(q => q.where({id})).fetchOne({require: true})
    await item.save(input, Object.assign({
      patch: true
    }, saveOptions))
    return item
  })
  const UpdateInput = input ? types.nonNull(input) : (
    fields ? types.nonNull(new types.Input({
      name: `${type}UpdateInput`,
      fields
    })) : types.type(types.JSON)
  )
  return {
    type,
    args: Object.assign({
      input: UpdateInput,
      id: types.nonNull(types.ID)
    }, args),
    resolve: compose ? compose(resolve) : resolve
  }
}
mutation.remove = function (type, options = {}) {
  const {
    collection = ctx => options.model.collection(),
    args = {},
    saveOptions = {},
    compose = null
  } = options || {}
  const resolve = options.resolve || (async (root, { id }, ctx, info) => {
    await collection(ctx, root).model.forge().where({id}).destroy(Object.assign({
      require: true
    }, saveOptions))
    return true
  })
  return {
    type: types.Boolean,
    args: Object.assign({
      id: types.nonNull(types.ID)
    }, args),
    resolve: compose ? compose(resolve) : resolve
  }
}

module.exports = mutation
