const knexConfig = require('../knex/knexfile')
const { model } = require('../../lib')
const Joi = require('joi')
const md5 = require('blueimp-md5')

const { connection } = model.connect(knexConfig.test)

class Category extends model.Base {
  get tableName () { return 'categories' }
  get hasTimestamps () { return false }
  posts () {
    return this.belongsToMany(Post, 'category2post').withPivot(['category_id'])
  }
  static get validator () {
    return {
      category_name: Joi.string().required()
    }
  }
}

class Comment extends model.Base {
  get tableName () { return 'comments' }
  get hasTimestamps () { return false }
  get unique () { return ['title'] }
  static get validator () {
    return {
      title: Joi.string().min(1).required(),
      content: Joi.string(),
      user_id: Joi.number().integer(),
      post_id: Joi.number().integer()
    }
  }
}

class Post extends model.Base {
  static get validator () {
    return Joi.object().keys({
      title: Joi.string().required(),
      content: Joi.string().required(),
      slug: Joi.string(),
      password: Joi.string(),
      user_id: Joi.number(),
      tags: Joi.array(),
      object: Joi.object(),
      array: Joi.array(),
      test1: Joi.string(),
      test2: Joi.string()
    }).or(['test1', 'test2'])
  }
  static formatters ({onlyChanged, always, json}) {
    return {
      password: onlyChanged(md5),
      tags: json(),
      object: json(),
      array: json()
    }
  }
  static get dependents () {
    return ['comments']
  }
  get tableName () { return 'posts' }
  get hasTimestamps () { return true }
  comments () {
    return this.hasMany(Comment)
  }
  categories () {
    return this.belongsToMany(Category, 'category2post')
  }
}
module.exports = {
  connection,
  Comment,
  Post,
  Category
}
