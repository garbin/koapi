module.exports = fields => {
  for (let attr in fields) {
    fields[attr].resolve = fields[attr].resolve || (model => model.get(attr))
  }
  return fields
}
