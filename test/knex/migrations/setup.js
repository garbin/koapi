
exports.up = function(knex, Promise) {
  return knex.schema.createTable('posts', function(table) {
    table.increments('id').primary();
    table.string('title');
    table.text('content');
    table.integer('user_id');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  }).createTable('comments', function(table) {
    table.increments('id').primary();
    table.string('title');
    table.text('content');
    table.integer('user_id');
    table.integer('post_id');
    table.timestamp('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
  }).createTable('categories', function (table) {
    table.increments('id').primary();
    table.string('category_name');
  }).createTable('category2post', function (table) {
    table.integer('category_id');
    table.integer('post_id');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('posts').dropTable('comments').dropTable('categories').dropTable('category2post');
};
