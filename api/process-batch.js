require('dotenv').config()
const JSONStream = require('JSONStream')
const dateFormat = require('dateformat')
const now = new Date()
const processDateTime = dateFormat(now, 'isoDateTime') // 2007-06-09T17:46:21
const uuidv4 = require('uuid/v4')
const processId = uuidv4()
const { addStats } = require('./dal')
const {
  getFhirBundleReadStream,
  getRiskScoreThroughStream,
  statsMgr,
  saveBundleThroughStream
} = require('./lib/stream')
const { getStats, calcStats, logStats } = statsMgr
const fhirBundlesStream = getFhirBundleReadStream(process.argv[2])
const jsonToObjStream = JSONStream.parse('*')
const getRiskScoreStream = getRiskScoreThroughStream()
const calcStatsStream = calcStats()

const saveBundleStream = saveBundleThroughStream({ processId, processDateTime })
const logStatsStream = logStats()

const processBatch = () => {
  return fhirBundlesStream
    .pipe(jsonToObjStream)
    .pipe(getRiskScoreStream)
    .pipe(calcStatsStream)
    .pipe(saveBundleStream)
    .pipe(logStatsStream)
    .on('finish', () =>
      addStats({ processDateTime, processId, stats: getStats() })
    )
}

processBatch()
