const { pathOr, find, compose } = require('ramda')
const { addBundle } = require('../../dal')
const through2 = require('through2')

module.exports = ({ processId, processDateTime }) =>
  through2({ objectMode: true }, async function(
    bundleWithScoreAndRiskLevel,
    enc,
    callback
  ) {
    const patientId = compose(
      pathOr(null, ['resource', 'id']),
      find(
        entry => pathOr(null, ['resource', 'resourceType'], entry) === 'Patient'
      ),
      pathOr([], ['bundle', 'entry'])
    )(bundleWithScoreAndRiskLevel)

    const bundle = {
      ...bundleWithScoreAndRiskLevel,
      patientId,
      processDateTime,
      processId
    }

    addBundle(bundle)
      .then(result => callback(null, bundle))
      .catch(err => callback(err))
  })
