require('dotenv').config()
const app = require('express')()
const fs = require('fs')
const { Transform } = require('stream')
const JSONStream = require('JSONStream')
const {
  postBundle,
  getRiskScoreData,
  getRisckScoreViz
} = require('./lib/fetch-mw-risk-api')
const { merge, pathOr } = require('ramda')
const { medwiseRiskAPIAuthMiddleware } = require('./lib/mw-risk-api-auth-mw')
const calcRiskLevel = require('./lib/calc-risk-level')
const through2 = require('through2')

let stats = {
  count: 0,
  errors: 0,
  veryLow: 0,
  low: 0,
  moderate: 0,
  high: 0,
  veryHigh: 0
}

/* bundle sample with med risk score (mrs) property
  {

    mrs: {
      scoreData: 5,
      status: "not started"
    }
  }
*/

const jsonInput = fs.createReadStream(`./data/fhir-bundles/bundles.json`, {
  encoding: 'utf8'
})

const jsonToObject = JSONStream.parse('*')

const mergeMedRiskScoreStatusProp = through2({ objectMode: true }, function(
  bundle,
  enc,
  callback
) {
  const medRiskScoreStatus = {
    mrs: {
      scoreData: null,
      status: null
    }
  }

  callback(null, merge(bundle, medRiskScoreStatus))
})

const calcStats = through2({ objectMode: true }, async function(
  bundleWithScore,
  enc,
  callback
) {
  const scoreData = pathOr(null, ['mrs', 'scoreData'], bundleWithScore)
  const riskLevel = scoreData ? calcRiskLevel(parseInt(scoreData, 10)) : null

  const newStats = scoreData
    ? {
        count: stats.count + 1,
        [riskLevel]: stats[riskLevel] + 1
      }
    : {
        count: stats.count + 1,
        errors: stats.errors + 1
      }

  // mutate high-scoped stats obj with new counts
  stats = merge(stats, newStats)

  callback(null, bundleWithScore)
})

const logProgressToConsole = through2({ objectMode: true }, async function(
  bundleWithScore,
  enc,
  callback
) {
  // clear the console
  process.stdout.write('\x1Bc')
  process.stdout.write('\x1B[4mBatch Risk Score Processing\x1B[0m\n')
  process.stdout.write(`Processed: ${stats.count}\n`)
  process.stdout.write(` Very Low: ${stats.veryLow}\n`)
  process.stdout.write(`      Low: ${stats.low}\n`)
  process.stdout.write(` Moderate: ${stats.moderate}\n`)
  process.stdout.write(`     High: ${stats.high}\n`)
  process.stdout.write(`Very High: ${stats.veryHigh}\n`)

  callback(null, bundleWithScore)
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
    const scoreData = await postBundle({ access_token, bundle }).then(
      profileId => getRiskScoreData({ access_token, profileId })
    )

    //this.push(merge(bundle, { scoreData }))

    this.push(
      merge(bundle, {
        mrs: {
          scoreData: scoreData,
          status: 'complete'
        }
      })
    )

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
    .pipe(mergeMedRiskScoreStatusProp)
    .pipe(getRiskScoreDataStream)
    .pipe(calcStats)
    .pipe(logProgressToConsole)
    .pipe(objectToString)
    .pipe(res)

  //.pipe(someFSWriteStream)
})

app.get(
  '/profiles/:id/riskscore',
  medwiseRiskAPIAuthMiddleware,
  async (req, res, next) => {
    const { access_token } = req
    const { id } = req.params
    const viz = await getRisckScoreViz({ access_token, id })
    console.log(access_token, req.params.id, viz)
    res.send(viz)
  }
)
app.get('/stats', (req, res, next) => res.status(200).send(stats))

app.listen(4000, () => console.log('Up on 4000'))
