const helpers = {
  onlyChanged: (format, parse = v => v) => ({
    format: (value, hasChanged) => hasChanged ? format(value) : undefined,
    parse
  }),
  always: (format, parse = v => v) => ({
    format: (value, hasChanged) => format(value),
    parse
  }),
  json: (needParse = false) => ({
    format: value => JSON.stringify(value),
    parse: value => needParse ? JSON.parse(value) : value
  })
}

module.exports = function (bookshelf) {
  bookshelf.Model = bookshelf.Model.extend({
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
    },
    parse (attrs) {
      if (attrs) {
        const formatters = this.constructor.formatters
        ? this.constructor.formatters(helpers)
        : {}
        return Object.entries(attrs).reduce((formatted, [field, value]) => {
          formatted[field] = formatters[field]
          ? formatters[field].parse(value)
          : value
          return formatted
        }, {})
      } else {
        return attrs
      }
    }
  })
}
