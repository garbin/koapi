module.exports = {
  resolve (...resolvers) {
    return async (...args) => {
      let value
      for (const resolver of resolvers) {
        value = await resolver(...args, value)
      }
      return value
    }
  }
}
