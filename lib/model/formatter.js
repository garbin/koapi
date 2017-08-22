const helpers = {
  onlyChanged: (format, parse = v => v) => ({
    format: (value, hasChanged) => hasChanged ? format(value) : undefined,
    parse
  }),
  onlyNew: (format, parse = v => v) => ({
    format: (value, hasChanged, instance) => instance.isNew() ? format(value) : value,
    parse,
    new: true
  }),
  defaultTo: (format, parse = v => v) => ({
    format: (value, hasChanged, instance) => instance.isNew() ? format(value) : value,
    parse,
    default: true
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
        const defaultAttrs = Object.entries(formatters).reduce((defaults, [attr, config]) => {
          if (config.default || (config.new && this.isNew())) {
            defaults[attr] = null
          }
          return defaults
        }, {})
        const _attrs = Object.assign({}, defaultAttrs, attrs)
        const formattedAttrs = Object.entries(_attrs).reduce((formatted, [field, value]) => {
          formatted[field] = formatters[field]
          ? formatters[field].format(value, this.hasChanged(field), this)
          : value
          return formatted
        }, {})
        return formattedAttrs
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
