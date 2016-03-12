import Koapi, {Model} from '../src/koapi';
import path from 'path';

var app  = new Koapi({
  port:4000,
  routers: __dirname + '/app/routers/**/*',
  knex: {
    client: 'mysql',
    connection: {
      host     : 'ubuntu',
      user     : 'root',
      password : '123456',
      database : 'blog',
      charset  : 'utf8'
    }
  }
});

app.run();
