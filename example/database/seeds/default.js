
exports.seed = function(knex, Promise) {
  return Promise.join(
    // Deletes ALL existing entries
    knex('posts').del(),
    knex('comments').del(),

    // Inserts seed entries
    knex('posts').insert({id: 1, title: 'Post Title', contents:'Post Contents', user_id:1}),
    knex('comments').insert({id: 1, title: 'Comment Title', contents:'Comment Contents', user_id:1, post_id:1})
  );
};
