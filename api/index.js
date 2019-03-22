require('dotenv').config()
const app = require('express')()
const fs = require('fs')
const { Transform } = require('stream')
const JSONStream = require('JSONStream')
const { getHome } = require('./lib/fetch-mw-risk-api')
//const fetch = require('isomorphic-fetch')
//const { processBundles } = require('./lib/process-bundles')
const { merge } = require('ramda')
const { medwiseRiskAPIAuthMiddleware } = require('./lib/mw-risk-api-auth-mw')
const through2 = require('through2')
let stats = { count: null, high: null, low: null }

const jsonInput = fs.createReadStream(`./data/fhir-bundles/bundles.json`, {
  encoding: 'utf8'
})

const jsonToObject = JSONStream.parse('*')

const reportProgress = new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    process.stdout.write('*')

    stats = merge({ count: stats.count++ }, stats)
    callback(null, chunk)
  }
})

const objectToString = new Transform({
  writableObjectMode: true,
  transform(bundle, encoding, callback) {
    console.log({ objectToStringBundle: JSON.stringify(bundle) })
    this.push(bundle.name + ' ')
    callback()
  }
})

app.get('/batchprocess', medwiseRiskAPIAuthMiddleware, (req, res, next) => {
  const { access_token } = req

  const getHomeStream = through2({ objectMode: true }, async function(
    chunk,
    enc,
    callback
  ) {
    const result = await getHome({ access_token })

    this.push(result)
    callback()
  })

  getHomeStream.on('data', function(data) {
    const toString = Object.prototype.toString.call(data)
    console.log('type of data:', toString)
    console.log('data:', data, '\n')
  })

  getHomeStream.on('error', err => {
    console.log('!', err.message)
  })

  jsonInput
    .pipe(jsonToObject)
    .pipe(getHomeStream)
    .pipe(reportProgress)
    .pipe(objectToString)
    .pipe(res)

  //res.status(200).send(stats)
})

app.get('/stats', (req, res, next) => res.status(200).send(stats))

app.listen(4000, () => console.log('Up on 4000'))
