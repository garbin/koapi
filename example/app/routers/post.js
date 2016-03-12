import {Router} from '../../../src/koapi';
import Post from '../models/post';

export default (new Router())
  .get('/posts', function*(){
    this.body = yield Post.fetchAll();
  })
  .get('/posts/:id', function*(){
    var post = yield Post.where('id', '=', this.params.id).fetch({'withRelated':'comments'});
    this.body = post;
  });
