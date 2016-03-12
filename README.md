# Koapi

RESTful API framework based on koa and bookshelf

# Build a RESTful API with `Koa` will be dead simple

## 1. server.js

```js
import Koapi, {Router, Model} from './src/koapi';

const app = new Koapi();

// Router
const posts = new Router();
posts.get('/', function*(){
  this.body = 'Hello World';
});

app.run({
  port: 4000,
  debug: true,
  cors: true,
  serve: {
    root: __dirname + '/public', // serve static file in ./public
  },
  routers: [ posts ], // Routers
});
```

## 2. run server.js

```bash
babel-node server.js
```
