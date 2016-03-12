// Update with your config settings.

module.exports = {

  development: {
    client: 'mysql',
    connection: {
      host     : 'ubuntu',
      user     : 'root',
      password : '123456',
      database : 'blog',
      charset  : 'utf8'
    },
    migrations: {
      directory: './database/migrations',
    },
    seeds:{
      directory: './database/seeds',
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
