const fetch = require('fetch-retry')

module.exports = async ({ access_token, profileId }) => {
  const scoredata = await fetch(
    `https://trhc-prod.apigee.net/medwise/api/profiles/${profileId}/scoredata`,
    {
      retries: 3,
      retryDelay: 100,
      retryOn: [429, 503, 500],
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    }
  )
    .then(res => res.json())
    .then(scoreResult => {
      return scoreResult.values[0].value
    })
    .catch(err => console.log({ err }))

  return scoredata
}
