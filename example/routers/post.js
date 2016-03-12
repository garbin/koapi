import {Router} from '../../src/koapi';
import Post from '../models/post';

const router = new Router();

router.get('/posts', function*(){
  this.body = yield Post.fetchAll();
});

router.get('/posts/:id', function*(){
  var app = yield Post.where('id', '=', this.params.id).fetch();
  this.body = app;
});

export default router;
