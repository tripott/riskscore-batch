const { postBundle, getRiskScoreData } = require('../../lib/fetch-mw-risk-api')
const through2 = require('through2')
const fetchAccessToken = require('../../lib/fetch-access-token')

module.exports = () =>
  through2({ objectMode: true }, async function(bundle, enc, callback) {
    const access_token = await fetchAccessToken()
    let profileId = null
    const medWiseRiskScore = await postBundle({ access_token, bundle })
      .then(pId => {
        profileId = pId
        return getRiskScoreData({ access_token, profileId })
      })
      .catch(err => console.log({ err }))

    this.push({ medWiseRiskScore, status: 'complete', profileId, bundle })

    callback()
  })
