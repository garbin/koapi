# Koapi

RESTful API framework based on koa and bookshelf

Wriging a RESTful API have never been so easy!

# Install
```bash
npm install koapi
```

# Write your APIs in just 1 minute

## Assume you have database below

### Table `posts`
| id | title | contents | created_at | updated_at |
|----|-------|----------|------------|------------|
| 1  | Title | Contents | 2016-8-1   | 2016-8-1   |

### Table `comments`

| id | post_id | title | contents | created_at | updated_at |
|----|---------|-------|----------|------------|------------|
| 1  | 1       | Title | Comment  | 2016-8-1   | 2016-8-1   |

## Here we go!
### app.js
```js
import Koapi, {ResourceRouter, Model} from 'koapi';

const app = new Koapi();

/****************** Connect to database ******************/
let database_config = {
  connection: 'pg',
  // knex database config...
};
Model.init(database_config);



/****************** Model definition    ******************/
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




/****************** Implement Routers ******************/

const posts = new ResourceRouter(Post.collection());
// YES! IT'S DEAD SIMPLE! RIGHT?
// POST /posts
// GET  /posts
// GET  /posts/:id
// PATCH /posts
// DELETE /posts/:id
// All are ready
posts.crud();

const comments = new ResourceRouter(ctx => ctx.state.post.comments());

// get post instance in context
comments.use(async (ctx, next) => {
  ctx.state.post = await Post.findById(ctx.params.post_id, {require:true});
  await next();
});

// method "crud" is a shortcut for create, read, update, destroy
// YOU CAN ALSO USE MIDDLEWARE in create, read, update, destroy
// AWESOME! RIGHT?!!!
comments.create(async(ctx, next) => {
  // you can do anything before create
  await next();
  // you can do anything after create
});
comments.read(/* if you want, you can place any middlewares here */{
  filterable: ['created_at'], // filterable field
  sortable: ['created_at'], // sortable field
});
// comment may not have update
// comments.update();
comments.destroy();



/****************** Start server      ******************/
app.bodyparser();
app.routers([
  posts,
  // YES! Thanks to koa-router, it support nested router
  posts.use('/posts/:post_id/comments', comments)
]);

app.listen(3000);
```

### run
```bash
babel-node app.js
```

You have done your RESTful APIs in 1 minute

# Your API is more complex?

Checkout [Koapi Boilerplate](https://github.com/koapi/koapi-boilerplate) for your situation.
