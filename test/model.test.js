const { Post, server } = require('./lib/server')
const { describe, it, expect } = global
const { afterAll, fail } = global
const _ = require('lodash')

afterAll(() => { server.close() })

describe('RESTful API1', function () {
  it('validate', async () => {
    const data = {
      title: 'a',
      content: 'b',
      test1: 'abc'
    }
    try {
      await Post.forge().save(_.omit(data, ['title']))
      fail('failed')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
    const tmp1 = await Post.forge().save(data)
    expect(tmp1.get('title')).toBe('a')
    const tmp2 = await Post.findById(tmp1.id)
    expect(tmp2.get('title')).toBe('a')
    const tmp3 = await tmp2.save({content: 'c'})
    expect(tmp3.get('content')).toBe('c')
    const tmp4 = await tmp3.save(tmp3.toJSON())
    expect(tmp4.get('content')).toBe(tmp3.get('content'))
  })
  it('unique', async () => {
    const data = {
      slug: 'a',
      title: 'a',
      content: 'b',
      test1: 'abc'
    }
    const tmp0 = await Post.forge().save(data)
    expect(tmp0.get('slug')).toBe(data.slug)
    const tmp1 = await Post.findById(tmp0.id)
    const tmp2 = await tmp1.save({title: 'b'})
    expect(tmp2.get('title')).toBe('b')
    const tmp3 = await tmp1.save({slug: data.slug, title: 'b'})
    expect(tmp3.get('slug')).toBe(data.slug)
    try {
      await Post.forge().save(data)
      fail('duplicate')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })
  it('format', async () => {
    const data = {
      slug: 'b',
      title: 'a',
      content: 'b',
      password: 'abc',
      test1: 'test1'
    }
    const hashed = '900150983cd24fb0d6963f7d28e17f72'
    const tmp0 = await Post.forge().save(data)
    expect(tmp0.get('password')).toBe('abc')
    await tmp0.refresh()
    expect(tmp0.get('password')).toBe(hashed)
    await tmp0.save({title: 'b'})
    expect(tmp0.get('title')).toBe('b')
    expect(tmp0.get('password')).toBe(hashed)
  })
  it('object', async () => {
    const object = {
      'name': '颜色',
      'value': 'color',
      'options': [{
        'name': '黑色',
        'value': 'black'
      }]
    }
    // 初始
    const post = await Post.forge().save({
      title: 'a',
      content: 'b',
      object,
      test1: 'abc'
    })
    expect(post.get('object')).toEqual(object)
    const fetched = await Post.findById(post.get('id'))
    expect(fetched.get('object')).toEqual(object)
    const saved = await fetched.save({title: 'b', object})
    expect(saved.get('object')).toEqual(object)
    try {
      await saved.save({object: ['array']})
      fail('native')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
    expect(saved.get('object')).toEqual(object)
    const data = _.pick(saved.toJSON(), ['title'])
    // const data = { title: 'b' }
    const nochange = await saved.save(data)
    expect(nochange.get('object')).toEqual(object)
  })
  it('array', async () => {
    const array = [{
      'name': '颜色',
      'value': 'color',
      'options': [{
        'name': '黑色',
        'value': 'black'
      }]
    }]
    const tmp0 = Post.forge({
      title: 'a',
      content: 'b',
      array,
      test1: 'abc'
    })
    expect(tmp0.get('array')).toEqual(array)
    await tmp0.save()
    expect(tmp0.get('array')).toEqual(array)
    await tmp0.refresh()
    expect(tmp0.get('array')).toEqual(array)
    const tmp1 = await Post.findById(tmp0.id)
    expect(tmp1.get('array')).toEqual(array)
    await tmp1.save()
    expect(tmp1.get('array')).toEqual(array)
    await tmp1.save({title: 'b'})
    expect(tmp1.get('array')).toEqual(array)
    expect(tmp1.get('title')).toEqual('b')
    const tmp2 = await tmp1.save(tmp1.toJSON())
    expect(tmp2.get('array')).toEqual(array)
    expect(tmp2.get('title')).toEqual('b')
    const tmp3 = await tmp2.save({
      title: 'c',
      array: ['a', 'b']
    })
    await tmp3.refresh()
    expect(tmp3.get('title')).toBe('c')
    expect(tmp3.get('array')).toEqual(['a', 'b'])
  })
})
