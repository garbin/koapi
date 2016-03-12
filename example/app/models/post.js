import { Model } from '../../../src/koapi';
import Comment from './comment';

export default Model({
  tableName: 'posts',
  comments: function(){
    return this.hasMany(Comment);
  }
});
