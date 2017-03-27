const cwd = process.cwd()
const { get } = require('lodash')
const path = require('path')
const fs = require('fs')
const internal = {
  path: null,
  env: process.env.NODE_ENV || 'development',
  register: {}
}

class Registry {
  constructor (data) {
    this.data = data
  }
  get (...args) {
    return get(this.data, ...args)
  }
  all () {
    return this.data
  }
}

const config = function (file = 'index') {
  let configPath
  if (internal.path === null) {
    const pkgPath = `${cwd}/package.json`
    if (fs.existsSync(pkgPath)) {
      const pkg = require(pkgPath)
      configPath = get(pkg, 'koapi.config')
      configPath = configPath ? path.resolve(cwd, configPath) : cwd
    } else {
      configPath = './config'
    }
  } else {
    configPath = internal.path
  }
  if (!internal[file]) {
    internal.register[file] = new Registry(Object.assign({},
      require(`${configPath}/defaults/${file}`),
      require(`${configPath}/${internal.env}/${file}`)))
  }
  return internal.register[file]
}
config.get = (...args) => config().get(...args)
config.path = path => { internal.path = path }
config.env = env => { internal.env = env }

internal.register.index = config()
module.exports = config
