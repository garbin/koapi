import Koapi, { middlewares, ResourceRouter } from '../../src'
import { bookshelf, initialize } from '../../src/model'
import knex_config from '../knex/knexfile'
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

export const {server, app} = setup(app => {
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
    collection: ctx => ctx.state.parents.post.comments(),
    name:'comments',
    setup(router){
      router.crud();
    }
  });
  posts.children(comments)
  app.bodyparser();
  app.routers( [ posts ] );
});
