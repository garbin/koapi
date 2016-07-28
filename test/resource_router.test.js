import request from 'supertest-as-promised'
import Koapi, {Model, ResourceRouter} from '../src'
import knex_config from './knex/knexfile'
import {describe} from 'ava-spec'

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

describe('ResourceRouter', it => {
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

  it.serial('#list', t => request(server)
                    .get('/posts')
                    .set('Accept', 'application/json')
                    .expect(200)
                    .expect(res => res.should.be.json())
                    .expect('Content-Range', 'items 0-0/1')
                    .expect(res => res.body.length.should.be.equal(1)));
  it.serial('get item', t => request(server)
                        .get('/posts/1')
                        .set('Accept', 'application/json')
                        .expect(200)
                        .expect(res => res.should.be.json())
                        .expect(res => res.body.id.should.be.equal(1)));
  it.serial('post item', t => request(server)
                        .post('/posts')
                        .set('Accept', 'application/json')
                        .send({
                          title: 'title',
                          content: 'content'
                        })
                        .expect(201)
                        .expect(res => res.should.be.json())
                        .expect(res => res.body.id.should.be.equal(2)));
  it.serial('patch item', t => {
    let new_title = 'new title';
    return request(server)
      .patch('/posts/1')
      .set('Accept', 'application/json')
      .send({
        title: new_title
      })
      .expect(202)
      .expect(res => res.should.be.json())
      .expect(res => res.body.title.should.be.equal(new_title))
  });
  it.serial('put item', t => {
    let new_title = 'search';
    return request(server)
      .put('/posts/1')
      .set('Accept', 'application/json')
      .send({
        title: new_title
      })
      .expect(202)
      .expect(res => res.should.be.json())
      .expect(res => res.body.title.should.be.equal(new_title))
  });
  it.serial('#list sort', t => request(server)
                          .get('/posts?sort=created_at')
                          .set('Accept', 'application/json')
                          .expect(200)
                          .expect(res => res.should.be.json())
                          .expect(res => res.body[0].id.should.be.equal(1)));
  it.serial('#list search', t => request(server)
                            .get('/posts?q=doestnotexists')
                            .set('Accept', 'application/json')
                            .expect(200)
                            .expect(res => res.should.be.json())
                            .expect(res => res.body.should.be.empty()));
  it.serial('#list filter', t => request(server)
                            .get('/posts?filters[user_id]=2')
                            .set('Accept', 'application/json')
                            .expect(200)
                            .expect(res => res.should.be.json())
                            .expect(res => res.body.should.be.empty()));
  it.serial('#list filter & search', t => request(server)
                                    .get('/posts?filters[user_id]=2&q=doestnotexists')
                                    .set('Accept', 'application/json')
                                    .expect(200)
                                    .expect(res => res.should.be.json())
                                    .expect(res => res.body.should.be.empty()));
  it.serial('nested #list', t => request(server)
                            .get('/posts/1/comments')
                            .set('Accept', 'application/json')
                            .expect(200)
                            .expect(res => res.should.be.json()));
  it.serial('nested #item', t => request(server)
                            .get('/posts/1/comments/1')
                            .set('Accept', 'application/json')
                            .expect(200)
                            .expect(res => res.should.be.json()));
  it.serial('delete item', t => request(server)
                          .del('/posts/1')
                          .set('Accept', 'application/json')
                          .expect(204));
});
