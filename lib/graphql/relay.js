const types = require('./types')
const { base64 } = require('../utils')

const relay = {
  connection: {
    args: args => Object.assign({
      first: types.int(),
      last: types.int(),
      after: types.string(),
      before: types.string()
    }, args),
    edge: Type => new types.Object({
      name: `${Type}Edge`,
      fields: _ => ({
        node: { type: Type },
        cursor: types.string({
          resolve: edge => base64.encode(edge.cursor)
        })
      })
    }),
    create: Node => {
      const Edge = relay.connection.edge(Node)
      return new types.Object({
        name: `${Node}Connection`,
        fields: _ => ({
          totalCount: types.int(),
          edges: types.list(Edge)(),
          pageInfo: types.type(types.PageInfo)()
        })
      })
    },
    resolve: resolver => {
      return async (root, args, ctx, info) => {
        args.after = base64.decode(args.after || 'MA==')
        args.before = base64.decode(args.before || 'MA==')
        args.first = args.first || 10
        args.last = args.last || 10
        const data = await resolver(root, args, ctx, info)
        return data
      }
    }
  }
}

module.exports = relay
