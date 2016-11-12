// Update with your config settings.
require('babel-register');
exports.development = exports.production = exports.test = {
  debug:true,
  client: 'postgres',
  connection: {
    host     : 'localhost',
    user     : 'postgres',
    password : '123456',
    database : 'koapi_test',
    charset  : 'utf8'
  },
};
