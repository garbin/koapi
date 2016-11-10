exports.seed = function(knex, Promise) {
  return Promise.join(
    // Deletes ALL existing entries
    knex('posts').del(),
    knex('comments').del(),
    knex('categories').del(),
    knex('category2post').del(),

    // Inserts seed entries
    knex('posts').insert([
      {title: 'Title', content:'Content', user_id:1},
      {title: 'Title', content:'Content', user_id:1}
    ]),
    knex('comments').insert([
      {title: 'Title', content:'Content', user_id:1, post_id:1 },
      {title: 'Title', content:'Content', user_id:1, post_id:2 }
    ]),
    knex('categories').insert([
      {category_name: 'Test'},
    ]),
    knex('category2post').insert([
      {category_id:1, post_id:1}
    ])
  );
};
