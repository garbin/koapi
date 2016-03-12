import Koapi, {Model} from '../src/koapi';
import path from 'path';

var app  = new Koapi();
app.debug();
app.database({
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

app.cors();

app.serve(__dirname + '/public');

app.router(__dirname + '/app/routers/**/*');

app.listen(4000);
