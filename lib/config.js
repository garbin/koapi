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

function load (file) {
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
  const defaultFile = `${configPath}/defaults/${file}.js`
  const envFile = `${configPath}/${internal.env}/${file}.js`
  if (fs.existsSync(path.resolve(__dirname, defaultFile)) && fs.existsSync(path.resolve(__dirname, envFile))) {
    const registry = new Registry(Object.assign({},
      require(defaultFile),
      require(envFile)))
    internal.register[file] = registry
    return registry
  } else {
    const registry = new Registry(Object.assign({}))
    internal.register[file] = registry
    return registry
  }
}

const config = function (file = 'index') {
  return internal.register[file] || load(file)
}
config.get = (...args) => config().get(...args)
config.path = path => { internal.path = path }
config.env = env => { internal.env = env }
config.all = (...args) => config().all(...args)
config.reload = (...files) => (files || ['index']).forEach(load)

internal.register.index = config()
module.exports = config
