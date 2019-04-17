const clientID = process.env.APIGEE_DEV_APP_CLIENTID
const secret = process.env.APIGEE_DEV_APP_SECRET
const auth = 'Basic ' + Buffer.from(clientID + ':' + secret).toString('base64')

module.exports = async () => {
  const access_token = await fetch(
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
    .then(token => token.access_token)
    .catch(err => {
      console.log({ err })
    })

  return access_token
}
