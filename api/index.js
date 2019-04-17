require('dotenv').config()
const app = require('express')()
const { getDoc } = require('./dal')

app.get('/stats/:processId', (req, res, next) => {
  getDoc(req.params.processId)
    .then(doc => res.status(200).send(doc))
    .catch(err => res.status(404).send('Not Found'))
})

app.listen(4000, () => console.log('Up on 4000'))
