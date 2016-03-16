# Koapi

RESTful API framework based on koa and bookshelf

Build a RESTful API with `Koa` will be dead simple

# Install
```bash
npm install koapi
```

I recommended you install a globaly version for advanced usage.
```bash
npm install -g koapi
```


# Quick Usage

## Create server.js below
```js
import Koapi, {Router} from 'koapi';

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

## Now run it
```bash
babel-node server.js
```

# Advanced Usage

## Create your project folder
```bash
mkdir /path/to/project
cd /path/to/project
```

## Init a boilerplate
```bash
koapi init ./
```
For the boilerplate details, see [koapi-boilerplate](http://github.com/garbin/koapi-boilerplate)
