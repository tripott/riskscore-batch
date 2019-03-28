require('dotenv').config()
const app = require('express')()
const fs = require('fs')
const { Transform } = require('stream')
const JSONStream = require('JSONStream')
const { getRiskScoreData } = require('./lib/fetch-mw-risk-api')
const { merge } = require('ramda')
const { medwiseRiskAPIAuthMiddleware } = require('./lib/mw-risk-api-auth-mw')
const calcRiskLevel = require('./lib/calc-risk-level')
const through2 = require('through2')
let stats = { count: null, high: null, low: null }

const jsonInput = fs.createReadStream(`./data/fhir-bundles/bundles.json`, {
  encoding: 'utf8'
})

const jsonToObject = JSONStream.parse('*')

const reportProgress = new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  transform(bundleWithScore, encoding, callback) {
    const { scoreData } = bundleWithScore
    process.stdout.write(
      `* ${scoreData} - ${calcRiskLevel(parseInt(scoreData, 10))}`
    )

    stats = merge({ count: stats.count++ }, stats)
    callback(null, bundleWithScore)
  }
})

const objectToString = new Transform({
  writableObjectMode: true,
  transform(bundle, encoding, callback) {
    this.push(JSON.stringify(bundle) + ', ')
    callback()
  }
})

app.get('/batchprocess', medwiseRiskAPIAuthMiddleware, (req, res, next) => {
  const { access_token } = req

  const getRiskScoreDataStream = through2({ objectMode: true }, async function(
    bundle,
    enc,
    callback
  ) {
    const scoreData = await getRiskScoreData({ access_token, bundle })

    this.push(merge(bundle, { scoreData }))
    callback()
  })

  // getRiskScoreDataStream.on('data', function(data) {
  //   const toString = Object.prototype.toString.call(data)
  //   console.log('type of data:', toString)
  //   console.log('data:', data, '\n')
  // })
  //
  // getRiskScoreDataStream.on('error', err => {
  //   console.log('!', err.message)
  // })

  jsonInput
    .pipe(jsonToObject)
    .pipe(getRiskScoreDataStream)
    .pipe(reportProgress)
    .pipe(objectToString)
    .pipe(res)

  //.pipe(someFSWriteStream)
})

app.get('/stats', (req, res, next) => res.status(200).send(stats))

app.listen(4000, () => console.log('Up on 4000'))
