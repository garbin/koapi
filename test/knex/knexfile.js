// Update with your config settings.

exports.development = exports.production = exports.test = {
  debug: false,
  client: 'postgres',
  connection: {
    host     : 'ubuntu',
    user     : 'postgres',
    password : '1234',
    database : 'koapi_test',
    charset  : 'utf8'
  },
};
