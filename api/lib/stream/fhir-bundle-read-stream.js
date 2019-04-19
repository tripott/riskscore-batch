const fs = require('fs')

module.exports = fileName =>
  fs.createReadStream(`./data/fhir-bundles-in/${fileName}`, {
    encoding: 'utf8'
  })
