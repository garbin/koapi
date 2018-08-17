exports.seed = function (knex, Promise) {
  const model = require('../../../lib/model')
  model.connect(knex)
  return Promise.join(
    // Deletes ALL existing entries
    knex('posts').del(),
    knex('comments').del(),
    knex('categories').del(),
    knex('category2post').del(),
    // Inserts seed entries
    knex('posts').insert([
      {
        title: 'Title',
        content: 'Content',
        tags: JSON.stringify(['A', 'B']),
        user_id: 1,
        test1: 'hehe'
      },
      { title: 'Title', content: 'Content', user_id: 500, test2: 'keke' },
      { title: 'OnlyForSearch', content: 'Content', user_id: 1, test2: 'dada' }
    ]),
    knex('comments').insert([
      { title: 'Title1', content: 'Content', user_id: 1, post_id: 1 },
      { title: 'Title2', content: 'Content', user_id: 1, post_id: 2 }
    ]),
    knex('categories').insert([{ category_name: 'Test' }]),
    knex('category2post').insert([{ category_id: 1, post_id: 1 }])
  )
}
