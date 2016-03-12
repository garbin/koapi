export default {
  port: 4000,
  debug: true,
  cors: true,
  routers: __dirname + '/../app/routers/**/*',
  serve: {
    root: __dirname + '/../public',
  },
  knex: {
    client: 'mysql',
    connection: {
      host     : 'ubuntu',
      user     : 'root',
      password : '123456',
      database : 'blog',
      charset  : 'utf8'
    }
  },
};
