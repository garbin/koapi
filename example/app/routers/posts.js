import {Router} from '../../../src/koapi';
import Post from '../models/post';

const posts = new Router();

  posts.get('/posts', function*(){
    try {
      a;
      this.body = yield Post.fetchAll();
    } catch (e) {
      // console.log(e);
      // this.body = e.message;
      this.throw(e, 500);
    }
  });

  posts.get('/posts/:id', function*(){
    var post = yield Post.where('id', '=', this.params.id).fetch({'withRelated':'comments'});
    this.body = post;
  });

export default posts;
