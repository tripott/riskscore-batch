//const fetch = require('isomorphic-fetch')
// module.exports = async ({ access_token }) => {
//   return fetch('https://trhc-prod.apigee.net/medwise/api', {
//       headers: {
//         Authorization: `Bearer ${access_token}`
//       }
//     })
// }
const fetch = require('fetch-retry')

module.exports = ({ access_token }) =>
  fetch(`https://trhc-prod.apigee.net/medwise/api`, {
    retries: 3,
    retryDelay: 100,
    retryOn: [429, 503, 500],
    headers: { Authorization: `Bearer ${access_token}` }
  }).then(res => res.json())
