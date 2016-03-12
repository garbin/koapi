import {Router} from '../../../src/koapi';
import Comment from '../models/comment';
import Posts from './posts';

const comments = new Router();

  comments.get('/', function*(){
    this.body = yield Comment.fetchAll();
  });

  comments.get('/:id', function*(){
    this.body = yield Comment.where('id', '=', this.params.id).fetch();
  });

export default Posts.use('/posts/:post_id/comments', comments.routes());
