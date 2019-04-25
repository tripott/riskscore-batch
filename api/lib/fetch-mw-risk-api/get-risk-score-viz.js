/*
The MedWise Risk API is centered around the concept of
accepting a FHIR `Bundle` resource in the form of a JSON document
when conducting a `POST` to the `/profiles` endpoint.
Once posted, you will receive a profile id that can be used in
subsequent calls to retrieve medication risk visualizations
and score data.
Let's submit our FHIR bundle via a `POST /profiles`.

The response should look similar to this. The `id` property represents the profile id.

{id: "d0bdab64-ab22-a668-95d9-b459ec5faae9", ok: true,}
*/

// module.exports = ({ access_token, bundle }) =>
//   fetch(`https://trhc-prod.apigee.net/medwise/api/profiles`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${access_token}`
//     },
//     body: JSON.stringify(bundle)
//   })

const fetch = require('fetch-retry')
const { propOr } = require('ramda')

module.exports = async ({ access_token, id }) =>
  fetch(`https://trhc-prod.apigee.net/medwise/api/profiles/${id}/riskscore`, {
    retries: 3,
    retryDelay: 100,
    retryOn: [429, 503, 500],
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`
    }
  })
    .then(res => res.json())
    .then(result => {
      console.log(result)
      return propOr(null, 'html', result)
    })
