import {Router} from '../../../src/koapi';
import Post from '../models/post';

const posts = new Router();

  posts.get('/posts', function*(){
    this.body = yield Post.fetchAll();
  });

  posts.get('/posts/:id', function*(){
    var post = yield Post.where({id: this.params.id}).fetch({'withRelated':'comments'});
    this.body = post;
  });

  posts.post('/posts', function *() {
    var post = yield new Post(this.request.body).save();
    this.body = post;
  });

export default posts;
