# koapi

RESTful API framework based on koa and bookshelf

# Build a RESTful API with `Koa` will be dead simple

create `./server.js`
```js
import Koapi from 'koapi';

var app = new Koapi({
  knex:{
    // knex options
  }
});

// use koa middleware if you need
// app.use(koa middleware)

app.router();

app.run();
```

create `./app/routers/posts.js`
```js
import {Router} from 'koapi';
import Post from '../models/post';

const posts = new Router();
posts.get('/posts', function*(){
  this.body = yield Post.fetchAll();
});
posts.get('/posts/:id', function*(){
  var post = yield Post.where('id', '=', this.params.id).fetch();
  this.body = post;
});
export default posts;
```

create `./app/models/post.js`
```js
import { Model } from 'koapi';

export default Model({
  tableName: 'posts',
});
```
