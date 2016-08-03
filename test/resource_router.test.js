import Koapi, {Model, ResourceRouter} from '../src'
import suite from '../src/test'
import knex_config from './knex/knexfile'

Model.init(knex_config.test);


const Comment = Model.extend({
  tableName: 'comments',
  hasTimestamps: true,
});

const Post = Model.extend({
  tableName: 'posts',
  hasTimestamps: true,
  comments(){
    return this.hasMany(Comment);
  }
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
  let comments = new ResourceRouter(ctx => ctx.state.post.comments());
  comments.use(async (ctx, next) => {
    ctx.state.post = await Post.where({id:ctx.params.post_id}).fetch();
    await next();
  });
  comments.crud();
  app.bodyparser({
    fieldsKey: false,
    filesKey: false,
  });
  app.routers( [ posts, posts.use('/posts/:post_id/comments', comments.routes()) ] );
});


suite(({ResourceTester, expect})=>{
  let tester = new ResourceTester(server, '/posts');
  tester.create({ title: 'title', content: 'content'}, req => req.set('X-Header', 'haha')).test();
  tester.read(req => req.set('X-Header', 'haha')).test();
  tester.read(100).catch(e => expect(e.actual).equals(204)).test();
  tester.read(1, req => req.set('X-Header', 'haha')).test();
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
  tester.read().test(res => {
    expect(res.body).to.have.lengthOf(1);
  });
  tester.create({
    title: 'abc',
    content: 'abc',
  }).test(res => {
    expect(res.body.post_id).equals(1);
  });
});
