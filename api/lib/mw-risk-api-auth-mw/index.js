require('isomorphic-fetch')
const { not } = require('ramda')
let token = null
let expiresIn = null
let generatedTime = null
let currentTime = null

const clientID = process.env.APIGEE_DEV_APP_CLIENTID
const secret = process.env.APIGEE_DEV_APP_SECRET
const auth = 'Basic ' + Buffer.from(clientID + ':' + secret).toString('base64')

/**

  mdsAuth

  Authentication middleware for the MDS API, this middleware will
  use implicit client authentication to access the internal mds service.

  @param req {object} - request object
  @param res {object} - response object
  @param next {function} - function to continue middleware chain

  Usage:

  ``` js
  app.post('/profiles', mdsAuth, profilesHandler)
  ```
*/
const medwiseRiskAPIAuthMiddleware = async (req, res, next) => {
  currentTime = new Date().getTime()
  // if token is expired then get new token
  if (
    (not(generatedTime) && not(expiresIn)) ||
    generatedTime + expiresIn * 950 < currentTime
  ) {
    const { access_token, expires_in } = await fetch(
      'https://trhc-prod.apigee.net/oauth/client_credential/accesstoken?grant_type=client_credentials',
      {
        headers: {
          Authorization: `${auth}`,
          'Content-Length': 0
        },
        method: 'POST'
      }
    )
      .then(res => res.json())
      .catch(err => {
        res.status(500).send({
          error: 'Cannot generate token for FDB service - ' + err.message
        })
      })

    expiresIn = expires_in
    token = access_token
    req.access_token = token
    generatedTime = new Date().getTime()
    next()
  } else {
    req.access_token = token
    next()
  }
}

module.exports = { medwiseRiskAPIAuthMiddleware }
