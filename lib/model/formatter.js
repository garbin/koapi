const helpers = {
  onlyChanged: (format, parse = v => v) => ({
    format: (value, hasChanged) => hasChanged ? format(value) : undefined,
    parse
  }),
  always: (format, parse = v => v) => ({
    format: (value, hasChanged) => format(value),
    parse
  }),
  json: () => ({
    format: (value) => JSON.stringify(value),
    parse: JSON.parse
  })
}

module.exports = function (bookshelf) {
  bookshelf.Model = class extends bookshelf.Model {
    format (attrs) {
      if (attrs) {
        const formatters = this.constructor.formatters
        ? this.constructor.formatters(helpers)
        : {}
        return Object.entries(attrs).reduce((formatted, [field, value]) => {
          formatted[field] = formatters[field]
          ? formatters[field].format(value, this.hasChanged(field))
          : value
          return formatted
        }, {})
      } else {
        return attrs
      }
    }
  }
}
