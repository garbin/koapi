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
          total: types.int(),
          edges: types.list(Edge),
          pageInfo: types.type(types.PageInfo)
        })
      })
    },
    result: (
      nodes,
      meta,
      cursor = {
        node: ({after, index}) => after + index,
        start: ({after}) => after,
        end: ({after, first}) => after + first,
        hasNext: ({after, first, total}) => after < total - first
      }
    ) => {
      const { first, after, total } = meta
      return {
        total,
        edges: nodes.map((node, index) => ({
          node,
          cursor: cursor.node({
            node,
            after,
            index
          })
        })),
        pageInfo: {
          startCursor: cursor.start({
            total,
            nodes,
            after,
            first
          }),
          endCursor: cursor.end({
            nodes,
            total,
            after,
            first
          }),
          hasNextPage: cursor.hasNext({
            after,
            first,
            nodes,
            total
          })
        }
      }
    },
    resolve: resolver => {
      return async (root, args, ctx, info) => {
        args.after = Number(base64.decode(args.after || 'MA=='))
        args.before = Number(base64.decode(args.before || 'MA=='))
        args.first = Number(args.first) || 10
        args.last = Number(args.last) || 10
        const data = await resolver(root, args, ctx, info)
        return data
      }
    }
  }
}

module.exports = relay
