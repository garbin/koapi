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

### Assume you have database below

##### Table `posts`
| id | title | contents | created_at | updated_at |
|----|-------|----------|------------|------------|
| 1  | Title | Contents | 2016-8-1   | 2016-8-1   |

##### Table `comments`

| id | post_id | title | contents | created_at | updated_at |
|----|---------|-------|----------|------------|------------|
| 1  | 1       | Title | Comment  | 2016-8-1   | 2016-8-1   |

### Here we go!

##### app.js
```js
const { Koapi, router, middlewares, model } = require('koapi')

const app = new Koapi();

/****************** Connect to database ******************/
model.connect({
  client: 'pg',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'myapp_test'
  }
})


class Comment extends model.base() {
  get tableName () { return 'comments' }
  get hasTimestamps () { return true }
}
class Post extends model.base() {
  get tableName () { return 'posts' }
  get hasTimestamps () { return true }
  comments () {
    return this.hasMany(Comment);
  }
}

/****************** Implement Routers ******************/

// POST /posts
// GET  /posts
// GET  /posts/:id
// PATCH /posts/:id
// DELETE /posts/:id
const posts = router.define('resource', Post.collection());

const comments = router.define('resource', {
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

/****************** Run server ******************/
app.use(middlewares.preset('restful'))
app.use(middlewares.routers([ posts ]))

app.listen(3000);
```

### run
```bash
node ./app
```

You have done your RESTful APIs in ONE minute

## Your API is far more complicated than this?
Checkout [Koapp](https://github.com/koapi/koapp) for your situation.

## License
[MIT](http://opensource.org/licenses/MIT)
