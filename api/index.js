require('dotenv').config()
const app = require('express')()
const fs = require('fs')
const { Transform } = require('stream')
const JSONStream = require('JSONStream')
const { postBundle, getRiskScoreData } = require('./lib/fetch-mw-risk-api')
const { merge, pathOr, mergeDeepRight } = require('ramda')
const { medwiseRiskAPIAuthMiddleware } = require('./lib/mw-risk-api-auth-mw')
const calcRiskLevel = require('./lib/calc-risk-level')
const through2 = require('through2')

let stats = {
  counts: {
    total: 0,
    errors: 0,
    veryLow: 0,
    low: 0,
    moderate: 0,
    high: 0,
    veryHigh: 0
  },
  averageScore: 0,
  highestScore: 0,
  lowestScore: 0,
  sumScores: 0
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
  const scoreDataInt = parseInt(scoreData, 10)
  const riskLevel = scoreData ? calcRiskLevel(scoreDataInt) : null

  const newStats = scoreData
    ? {
        sumScores: stats.sumScores + scoreDataInt,
        averageScore:
          (stats.sumScores + scoreDataInt) / (stats.counts.total + 1),
        highestScore:
          scoreDataInt > stats.highestScore ? scoreDataInt : stats.highestScore,
        counts: {
          total: stats.counts.total + 1,
          [riskLevel]: stats.counts[riskLevel] + 1
        }
      }
    : {
        counts: {
          total: stats.counts.total + 1,
          errors: stats.counts.errors + 1
        }
      }

  // mutate high-scoped stats obj with new counts
  stats = mergeDeepRight(stats, newStats)
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
  process.stdout.write(`\n`)
  process.stdout.write('\x1B[4mRisk Strat\x1B[0m\n')
  process.stdout.write(` Very Low: ${stats.counts.veryLow}\n`)
  process.stdout.write(`      Low: ${stats.counts.low}\n`)
  process.stdout.write(` Moderate: ${stats.counts.moderate}\n`)
  process.stdout.write(`     High: ${stats.counts.high}\n`)
  process.stdout.write(`Very High: ${stats.counts.veryHigh}\n`)
  process.stdout.write(`\n`)
  process.stdout.write('\x1B[4mStats\x1B[0m\n')
  process.stdout.write(`    Count: ${stats.counts.total}\n`)
  process.stdout.write(`      Sum: ${stats.sumScores}\n`)
  process.stdout.write(`      Avg: ${stats.averageScore}\n`)
  process.stdout.write(`  Highest: ${stats.highestScore}\n`)
  process.stdout.write(`Err Count: ${stats.counts.errors}\n`)

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

app.get('/stats', (req, res, next) => res.status(200).send(stats))

app.listen(4000, () => console.log('Up on 4000'))
