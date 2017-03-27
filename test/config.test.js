const path = require('path')
const { describe, it, expect } = global

describe('config', () => {
  it('default', () => {
    const { config } = require('../lib')
    expect(config.get('custom')).toBe('custom_test')
    expect(config('custom').get('custom')).toBe('test_path')
  })
  // it('path', () => {
  //   expect(config('path').get('path')).toBe('path')
  // })
  it('custom', () => {
    const { config } = require('../lib')
    config.env('development')
    config.path(path.resolve(__dirname, './lib/config'))
    expect(config.get('custom')).toBe('custom')
    expect(config('custom').get('custom')).toBe('custom_path')
  })
  it('env', () => {
    const { config } = require('../lib')
    config.env('production')
    expect(config.get('custom')).toBe('production')
    expect(config('custom').get('custom')).toBe('production_path')
  })
})
