import Koapi, {middlewares, Model, ResourceRouter} from '../src'
import suite from '../src/test'
import knex_config from './knex/knexfile'
import Joi from 'joi'
import _ from 'lodash'

Model.init(knex_config.test);


const Comment = Model.extend({
  tableName: 'comments',
  hasTimestamps: true
});

const Post = Model.extend({
  tableName: 'posts',
  hasTimestamps: true,
  validate: {
    title: Joi.string().required(),
    content: Joi.string().required()
  },
  comments(){
    return this.hasMany(Comment);
  }
});

const setup = (config) => {
  let app = new Koapi();
  app.use(middlewares.json_error())
  app.compress();
  config(app);
  let server = app.listen(null);
  return {app, server};
};

let {server, app} = setup(app => {
  let posts = ResourceRouter.define({
    collection: Post.collection(),
    setup(router){
      router.create(async (ctx, next) => {
        ctx.state.attributes = ctx.request.body;
        ctx.state.attributes.title = 'Hehe';
        await next();
        ctx.body = ctx.body.toJSON();
        ctx.body.haha = 'yes';
      });
      router.read({
        sortable: ['created_at'],
        filterable: ['user_id'],
        searchable: ['title', 'content']
      });
      router.update();
      router.destroy();
    }
  });
  let comments = ResourceRouter.define({
    collection: ctx => ctx.state.post.comments(),
    setup(router){
      router.use(async (ctx, next) => {
        ctx.state.post = await Post.where({id:ctx.params.post_id}).fetch();
        await next();
      });
      router.crud();
    }
  });
  app.bodyparser();
  app.routers( [ posts, posts.use('/posts/:post_id/comments', comments.routes()) ] );
});

suite(({request, test, expect})=>{
  let posts = ResourceRouter.define({
    collection: Post.collection(),
    setup(router){
      router.create(async (ctx, next) => {
        ctx.state.attributes = ctx.request.body;
        ctx.state.attributes.title = 'Hehe';
        await next();
        ctx.body = ctx.body.toJSON();
        ctx.body.haha = 'yes';
      });
      router.read({
        sortable: ['created_at'],
        filterable: ['user_id'],
        searchable: ['title', 'content']
      });
      router.update();
      router.destroy();
    }
  });
  test('schema', t => {
    let schema = posts.schema();
    expect(schema).to.have.property('create');
    expect(schema).to.have.property('list');
    expect(schema).to.have.property('read');
    expect(schema).to.have.property('update');
    expect(schema).to.have.property('destroy');
    expect(schema.create).to.have.property('schema');
    expect(schema.create).to.have.property('example');
    expect(schema.create.schema).to.have.property('request');
    expect(schema.create.schema).to.have.property('response');
    expect(schema.create.example).to.have.property('request');
    expect(schema.create.example).to.have.property('response');
  });
});

suite(({ResourceTester, request, test, expect})=>{
  let tester = new ResourceTester(server, '/posts');
  tester.create({ title: 'title', content: 'content'}, req => req.set('X-Header', 'haha'))
        .test(res => {
          expect(res.body.title).equals('Hehe');
          expect(res.body.haha).equals('yes');
        });
  test('should return 422', t => request(server).post('/posts')
                                                .send({ content: 'content'})
                                                .then()
                                                .catch(e => expect(e).to.have.status(422)));
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
