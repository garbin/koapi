# [Koapi](http://koapi.github.io/koapi)

RESTful API framework based on koa and bookshelf

Writing a RESTful API has never been so easy!

## Intro
Koapi is a library for building RESTful APIs in a really simple way.

## Installation
```bash
npm install koapi
```

## Write your APIs in just ONE minute

* Assume you have database below

##### Table `posts`
| id | title | contents | created_at | updated_at |
|----|-------|----------|------------|------------|
| 1  | Title | Contents | 2016-8-1   | 2016-8-1   |

##### Table `comments`

| id | post_id | title | contents | created_at | updated_at |
|----|---------|-------|----------|------------|------------|
| 1  | 1       | Title | Comment  | 2016-8-1   | 2016-8-1   |

* Here we go!
##### app.js
```js
import Koapi, { ResourceRouter } from 'koapi';
import extend, { initialize } from 'koapi/lib/model'

const app = new Koapi();

/****************** Connect to database ******************/
initialize({
  client: 'pg',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'myapp_test'
  }
});



/****************** Model definition    ******************/
const Comment = extend({
  tableName: 'comments',
  hasTimestamps: true,
});

const Post = extend({
  tableName: 'posts',
  hasTimestamps: true,
  comments(){
    return this.hasMany(Comment);
  }
});




/****************** Implement Routers ******************/

// POST /posts
// GET  /posts
// GET  /posts/:id
// PATCH /posts/:id
// DELETE /posts/:id
const posts = ResourceRouter.define(Post.collection());

const comments = ResourceRouter.define({
  collection: ctx => ctx.state.parents.post.comments(),
  setup(router){
    // method "crud" is a shortcut for "create", "read", "update" and "destroy"
    // YOU CAN ALSO USE MIDDLEWARE in "create", "read", "update", "destroy"    
    router.create(async(ctx, next) => {
      // you can do anything before create
      await next();
      // you can do anything after create
    });
    router.read(/* You can place any middleware here if you need */{
      filterable: ['created_at'], // filterable fields
      sortable: ['created_at'], // sortable fields
    });        
    router.destroy();
  }
});
posts.children(comments)




/****************** Start server ******************/
app.bodyparser();
app.routers([ posts ]);

app.listen(3000);
```

### run
```bash
babel-node app.js
```

You have done your RESTful APIs in ONE minute

## Your API is far more complicated than this?

Checkout [Koapi Boilerplate](https://github.com/koapi/koapi-boilerplate) for your situation.

## License
[MIT](http://opensource.org/licenses/MIT)
