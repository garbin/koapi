import request from 'supertest-as-promised'
import Koapi, {Model, ResourceRouter} from '../src'
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

describe('ResourceRouter', function(){
  let {server, app} = setup(app => {
    let rest_router = new ResourceRouter();
    rest_router.resource(Post.collection(), {
      sortable: ['created_at'],
      filterable: ['user_id'],
      searchable: ['title', 'content']
    });
    app.bodyparser({
        fieldsKey: false,
        filesKey: false,
    });
    app.routers( [ rest_router ] );
  });

  it('#list', function(done){
    request(server)
      .get('/posts')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(res => res.should.be.json())
      .expect('Content-Range', 'items 0-0/1')
      .expect(res => res.body.length.should.be.equal(1))
      .then(res => done(null))
      .catch(done);
  });
  it('get item', function(done){
    request(server)
      .get('/posts/1')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(res => res.should.be.json())
      .expect(res => res.body.id.should.be.equal(1))
      .then(res => done(null))
      .catch(done);
  });
  it('post item', function(done){
    request(server)
      .post('/posts')
      .set('Accept', 'application/json')
      .send({
        title: 'title',
        content: 'content'
      })
      .expect(201)
      .expect(res => res.should.be.json())
      .expect(res => res.body.id.should.be.equal(2))
      .then(res => done(null))
      .catch(done);
  });
  it('patch item', function(done){
    let new_title = 'new title';
    request(server)
      .patch('/posts/1')
      .set('Accept', 'application/json')
      .send({
        title: new_title
      })
      .expect(202)
      .expect(res => res.should.be.json())
      .expect(res => res.body.title.should.be.equal(new_title))
      .then(res => done(null))
      .catch(done);
  });
  it('put item', function(done){
    let new_title = 'search';
    request(server)
      .put('/posts/1')
      .set('Accept', 'application/json')
      .send({
        title: new_title
      })
      .expect(202)
      .expect(res => res.should.be.json())
      .expect(res => res.body.title.should.be.equal(new_title))
      .then(res => done(null))
      .catch(done);
  });
  it('#list sort', function(done){
    request(server)
      .get('/posts?sort=created_at')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(res => res.should.be.json())
      .expect(res => res.body[0].id.should.be.equal(1))
      .then(res => done(null))
      .catch(done);
  });
  it('#list search', function(done){
    request(server)
      .get('/posts?q=doestnotexists')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(res => res.should.be.json())
      .expect(res => res.body.should.be.empty())
      .then(res => done(null))
      .catch(done);
  });
  it('#list filter', function(done){
    request(server)
      .get('/posts?filters[user_id]=2')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(res => res.should.be.json())
      .expect(res => res.body.should.be.empty())
      .then(res => done(null))
      .catch(done);
  });
  it('#list filter & search', function(done){
    request(server)
      .get('/posts?filters[user_id]=2&q=doestnotexists')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(res => res.should.be.json())
      .expect(res => res.body.should.be.empty())
      .then(res => done(null))
      .catch(done);
  });
  it('delete item', function(done){
    request(server)
      .del('/posts/1')
      .set('Accept', 'application/json')
      .expect(204)
      .then(res => done(null))
      .catch(done);
  });
});
