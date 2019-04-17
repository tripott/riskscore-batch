require('dotenv').config()
const fs = require('fs')
const JSONStream = require('JSONStream')
const { postBundle, getRiskScoreData } = require('./lib/fetch-mw-risk-api')
const { pathOr, propOr, mergeDeepRight, compose, find } = require('ramda')
const calcRiskLevel = require('./lib/calc-risk-level')
const through2 = require('through2')
const fetchAccessToken = require('./lib/fetch-access-token')
const uuidv4 = require('uuid/v4')
const processId = uuidv4()
const dateFormat = require('dateformat')
const now = new Date()
const processDateTime = dateFormat(now, 'isoDateTime') // 2007-06-09T17:46:21
const { addBundle, addStats } = require('./dal')
const fileName = process.argv[2]

const jsonInput = fs.createReadStream(`./data/fhir-bundles-in/${fileName}`, {
  encoding: 'utf8'
})

const jsonToObject = JSONStream.parse('*')

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

const calcStats = through2({ objectMode: true }, async function(
  bundleWithScore,
  enc,
  callback
) {
  const medWiseRiskScore = propOr(null, 'medWiseRiskScore', bundleWithScore)
  const medWiseRiskScoreInt = parseInt(medWiseRiskScore, 10)
  const riskLevel = medWiseRiskScore ? calcRiskLevel(medWiseRiskScoreInt) : null

  const newStats = medWiseRiskScore
    ? {
        sumScores: stats.sumScores + medWiseRiskScoreInt,
        averageScore:
          (stats.sumScores + medWiseRiskScoreInt) / (stats.counts.total + 1),
        highestScore:
          medWiseRiskScoreInt > stats.highestScore
            ? medWiseRiskScoreInt
            : stats.highestScore,
        lowestScore:
          stats.counts.total === 0
            ? medWiseRiskScoreInt
            : medWiseRiskScoreInt < stats.lowestScore
            ? medWiseRiskScoreInt
            : stats.lowestScore,
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

  callback(null, {
    ...bundleWithScore,
    medWiseRiskScore: medWiseRiskScoreInt,
    riskLevel
  })
})

const writeBundleToDB = through2({ objectMode: true }, async function(
  bundleWithScoreAndRiskLevel,
  enc,
  callback
) {
  console.log({ bundleWithScoreAndRiskLevel })

  const patientId = compose(
    pathOr(null, ['resource', 'id']),
    find(
      entry => pathOr(null, ['resource', 'resourceType'], entry) === 'Patient'
    ),
    pathOr([], ['bundle', 'entry'])
  )(bundleWithScoreAndRiskLevel)

  const bundle = {
    ...bundleWithScoreAndRiskLevel,
    patientId,
    processDateTime,
    processId
  }

  console.log({ bundle })
  addBundle(bundle)
    .then(result => callback(null, bundle))
    .catch(err => callback(err))
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
  process.stdout.write(`   Lowest: ${stats.lowestScore}\n`)
  process.stdout.write(`Err Count: ${stats.counts.errors}\n`)

  callback(null, bundleWithScore)
})

const processBatch = async () => {
  const access_token = await fetchAccessToken()
  let pId = null
  const getRiskScoreDataStream = through2({ objectMode: true }, async function(
    bundle,
    enc,
    callback
  ) {
    const medWiseRiskScore = await postBundle({ access_token, bundle })
      .then(profileId => {
        pId = profileId
        return getRiskScoreData({ access_token, profileId })
      })
      .catch(err => console.log({ err }))

    this.push({ medWiseRiskScore, status: 'complete', profileId: pId, bundle })

    callback()
  })

  jsonInput
    .pipe(jsonToObject)
    .pipe(getRiskScoreDataStream)
    .pipe(calcStats)
    .pipe(writeBundleToDB)
    .pipe(logProgressToConsole)
    .on('finish', () => addStats({ processDateTime, processId, stats }))
}

processBatch()
