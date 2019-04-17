if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const PouchDB = require('pouchdb-core')

PouchDB.plugin(require('pouchdb-adapter-http'))

const dburl = process.env.COUCHDB_URL
const db = new PouchDB(dburl)
const pkGenerator = require('./lib/build-pk')

const addBundle = ({
  patientId,
  profileId,
  processDateTime,
  medWiseRiskScore,
  processId,
  bundle,
  riskLevel
}) => {
  const _id = pkGenerator(
    `bundle_`,
    `${patientId}_${processDateTime}_${medWiseRiskScore}_${profileId}`
  )
  return db.put({
    _id,
    type: 'bundle',
    patientId,
    profileId,
    processDateTime,
    medWiseRiskScore,
    riskLevel,
    processId,
    bundle
  })
}

const addStats = ({ processDateTime, processId, stats }) => {
  const _id = pkGenerator(`stats_`, `${processId}`)
  return db.put({
    _id,
    type: 'stats',
    processDateTime,
    processId,
    stats
  })
}

const getDoc = _id => db.get(_id)

const dal = {
  addBundle,
  addStats,
  getDoc
}

module.exports = dal
