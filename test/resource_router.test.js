import Koapi, {Model, ResourceRouter} from '../src'
import {suite} from '../src/test'
import knex_config from './knex/knexfile'

Model.init(knex_config.test);

const Post = Model.extend({
  tableName: 'posts',
  hasTimestamps: true,
});

const Comment = Model.extend({
  tableName: 'comments',
  hasTimestamps: true,
});


const setup = (config) => {
  let app = new Koapi();
  config(app);
  let server = app.listen(null);
  return {app, server};
};

let {server, app} = setup(app => {
  let posts = new ResourceRouter(Post.collection());
  posts.create();
  posts.read({
    sortable: ['created_at'],
    filterable: ['user_id'],
    searchable: ['title', 'content']
  });
  posts.update();
  posts.destroy();
  let comments = new ResourceRouter(ctx => Comment.collection());
  comments.crud();
  app.bodyparser({
    fieldsKey: false,
    filesKey: false,
  });
  app.routers( [ posts, posts.use('/posts/:post_id/comments', comments.routes()) ] );
});



suite(({ResourceTester, expect})=>{
  let tester = new ResourceTester(server, '/posts');
  tester.create({ title: 'title', content: 'content'}).test();
  tester.read(1).test();
  tester.update(1, {title: 'new title'}).test();
  tester.destroy(2).test();
  tester.read(null, {
    filters:{
      user_id:2
    },
    q:'doestnotexists'
  }).test(res => {
    expect(res.body).to.be.empty;
  });
});

suite(({ResourceTester, expect})=>{
  let tester = new ResourceTester(server, '/posts/1/comments');
  tester.read(1).test();
  tester.read().test();
});
