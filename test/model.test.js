const { Post, server } = require('./lib/server')
const { describe, it, expect } = global
const { afterAll } = global

afterAll(() => { server.close() })

describe('RESTful API1', function () {
  it('formatter should work', async () => {
    const post = await Post.forge().save({
      title: 'a',
      content: 'b',
      test1: 'abc'
    })
    const hashed = '900150983cd24fb0d6963f7d28e17f72'
    expect(post.get('test1')).toBe('abc')
    const read = await Post.findById(post.get('id'))
    expect(read.get('test1')).toEqual(hashed)
    await read.save({title: 'b'})
    expect(read.get('title')).toBe('b')
    expect(read.get('test1')).toBe(hashed)
  })
  it('should saved', async () => {
    const object = {
      'name': '颜色',
      'value': 'color',
      'options': [{
        'name': '黑色',
        'value': 'black'
      }]
    }
    const create = await Post.forge().save({
      title: 'a',
      content: 'b',
      object,
      test1: 'abc'
    })
    expect(create.get('object')).toEqual(object)
    const read = await Post.findById(create.get('id'))
    expect(read.get('object')).toEqual(object)
  })
  it('array can be saved success', async () => {
    const array = [{
      'name': '颜色',
      'value': 'color',
      'options': [{
        'name': '黑色',
        'value': 'black'
      }]
    }]
    const post = await Post.forge().save({
      title: 'a',
      content: 'b',
      array,
      test1: 'abc'
    })
    expect(post.get('array')).toEqual(array)
  })
})
