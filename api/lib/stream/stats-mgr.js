const calcRiskLevel = require('../../lib/calc-risk-level')
const { mergeDeepRight, propOr } = require('ramda')
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

const statsMgr = {
  getStats: () => stats,
  calcStats: () =>
    through2({ objectMode: true }, async function(
      bundleWithScore,
      enc,
      callback
    ) {
      const medWiseRiskScore = propOr(null, 'medWiseRiskScore', bundleWithScore)
      const medWiseRiskScoreInt = parseInt(medWiseRiskScore, 10)

      const riskLevel = medWiseRiskScore
        ? calcRiskLevel(medWiseRiskScoreInt)
        : null

      const newStats = medWiseRiskScore
        ? {
            sumScores: stats.sumScores + medWiseRiskScoreInt,
            averageScore:
              (stats.sumScores + medWiseRiskScoreInt) /
              (stats.counts.total + 1),
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
    }),
  logStats: () =>
    through2({ objectMode: true }, async function(
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
}

module.exports = statsMgr
