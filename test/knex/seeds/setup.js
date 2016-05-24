exports.seed = function(knex, Promise) {
  return Promise.join(
    // Deletes ALL existing entries
    knex('posts').del(),

    // Inserts seed entries
    knex('posts').insert({title: 'Title', content:'Content', user_id:1})
  );
};
