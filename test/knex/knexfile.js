// Update with your config settings.
exports.development = exports.production = exports.test = {
  migrations: {
    directory: './test/knex/migrations'
  },
  seeds: {
    directory: './test/knex/seeds'
  },
  // debug: true,
  client: 'postgres',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: '123456',
    database: 'koapi_test',
    charset: 'utf8'
  }
}
