const { toLower, concat, trim, compose, replace } = require('ramda')

module.exports = (prefix, value) =>
  compose(
    concat(prefix),
    replace(/ /g, '_'),
    trim,
    toLower
  )(value)
