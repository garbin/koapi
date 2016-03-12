import { Model } from '../../../src/koapi';
import Comment from './comment';
import Joi from 'joi';

const title = Joi.string().alphanum().min(3).max(30);
const timestamp = Joi.date();

export default Model({
  tableName: 'posts',
  hasTimestamps: true,
  comments: function(){
    return this.hasMany(Comment);
  },
  schema: {
    create: Joi.object().keys({
      title: title.required(),
    }).unknown(true),
    update: Joi.object().keys({
      title: title.required(),
    }).unknown(true)
  }
});
