const { Post, server } = require('./lib/server')
const { describe, it, expect } = global
const { afterAll } = global

afterAll(() => { server.close() })

describe('RESTful API1', function () {
  it('format save', async () => {
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
  it('native json object', async () => {
    const object = {
      'name': '颜色',
      'value': 'color',
      'options': [{
        'name': '黑色',
        'value': 'black'
      }]
    }
    const post = await Post.forge().save({
      title: 'a',
      content: 'b',
      native_object: object,
      test1: 'abc'
    })
    expect(post.get('native_object')).toEqual(object)
    const fetched = await Post.findById(post.get('id'))
    expect(fetched.get('native_object')).toEqual(object)
    const saved = await fetched.save({title: 'b', native_object: object})
    expect(saved.get('native_object')).toEqual(object)
  })
  it('json column', async () => {
    const object = {
      'name': '颜色',
      'value': 'color',
      'options': [{
        'name': '黑色',
        'value': 'black'
      }]
    }
    const post = await Post.forge().save({
      title: 'a',
      content: 'b',
      object: object,
      test1: 'abc'
    })
    expect(post.get('object')).toEqual(object)
    const fetched = await Post.findById(post.get('id'))
    expect(fetched.get('object')).toEqual(object)
    const saved = await fetched.save({title: 'saved', object})
    expect(saved.get('object')).toEqual(object)
  })
  it('json column array', async () => {
    const object = [{
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
      object: object,
      test1: 'abc'
    })
    expect(post.get('object')).toEqual(object)
    const fetched = await Post.findById(post.get('id'))
    expect(fetched.get('object')).toEqual(object)
    const saved = await fetched.save({title: 'edit', object})
    expect(saved.get('object')).toEqual(object)
  })
})
