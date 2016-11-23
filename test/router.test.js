import Koapi, { middlewares, ResourceRouter } from '../src'
import { bookshelf, initialize, relation } from '../src/model'
import suite from '../src/test'
import knex_config from './knex/knexfile'
import Joi from 'joi'
import _ from 'lodash'

initialize(knex_config.test);

class Category extends bookshelf.Model {
  get tableName(){ return 'categories' };
  get hasTimestamps() { return false }
  posts(){
    return this.belongsToMany(Post, 'category2post').withPivot(['category_id']);
  }
}

class Comment extends bookshelf.Model {
  get tableName(){ return 'comments' }
  get hasTimestamps() { return false }
  get unique() { return ['title'] }
}

class Post extends bookshelf.Model {
  static fields = Joi.object().keys({
    title: Joi.string().required(),
    content: Joi.string().required(),
    tags: Joi.array(),
    test1: Joi.string(),
    test2: Joi.string()
  }).or(['test1', 'test2']);
  static format = {
    tags: 'json'
  };
  static dependents = ['comments'];
  get tableName(){ return 'posts' };
  get hasTimestamps() { return true; }
  comments(){
    return this.hasMany(Comment);
  }
  categories(){
    return this.belongsToMany(Category, 'category2post');
  }
}

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
      router.read(async(ctx, next)=>{
        if (_.get(ctx.request.query, 'filters.category_id')) {
          ctx.state.query = Post.forge().query(qb => qb.leftJoin('category2post', 'posts.id', 'category2post.post_id'));
        }
        await next();
      }, {
        sortable: ['created_at'],
        filterable: [ 'user_id', 'category_id' ],
        searchable: ['title', 'content']
      });
      router.update();
      router.destroy();
    }
  });
  let comments = ResourceRouter.define({
    collection: ctx => ctx.state.post.comments(),
    name:'comments',
    setup(router){
      router.use(async (ctx, next) => {
        ctx.state.post = await Post.where({id:ctx.params.post_id}).fetch();
        await next();
      });
      router.crud();
    }
  });
  posts.use('/posts/:post_id(\\d+)', comments.routes());
  app.bodyparser();
  app.routers( [ posts ] );
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
        joins: ['categories'],
        sortable: ['created_at'],
        filterable: ['user_id', 'caetgory_id'],
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

suite(async ({ResourceTester, request, test, expect})=>{
  let tester = new ResourceTester(server, '/posts');
  tester.create({title:'abc', content:'haha', tags:['a', 'b'], test1:'haha'}, req => req.set('X-Header', 'haha'))
        .test(res => {
          expect(res.body.title).equals('Hehe');
          expect(res.body.haha).equals('yes');
          expect(res.body.tags).to.be.instanceof(Array);
        });
  test('should return 422', t => request(server).post('/posts')
                                                .send({ title:'abc' })
                                                .then(res => expect(res).to.have.status(422))
                                                .catch(e => expect(e).to.have.status(422)));
  await tester.read(req => req.set('X-Header', 'haha')).test();
  tester.read(100).catch(e => expect(e.actual).equals(204)).test();
  tester.read(1, req => req.set('X-Header', 'haha')).test();
  tester.update(1, {title: 'new title'}).test();
  tester.destroy(2).test();
  // tester.read(null, {
  //   filters:{
  //     category_id: [1, 2]
  //   }
  // }).test(res => {
  //   expect(res.body).to.not.be.empty;
  // });
  tester.read(null, {
    filters:{
      category_id: [3, 4]
    }
  }).test(res => {
    expect(res.body).to.be.empty;
  });
  tester.read(null, {
    filters:{
      test2: 'haha'
    }
  }).test(res => {
    expect(res.body.length).to.be.equal(3);
  });
  // tester.read(null, {
  //   filters:{
  //     category_id: 2
  //   },
  //   q:'doestnotexists'
  // }).test(res => {
  //   expect(res.body).to.be.empty;
  // });
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
  tester.create({
    title: 'Title1',
    content: 'abc',
  }).catch(res => expect(res).to.have.status(409)).test();
});
