const fs = require('fs')
const { Transform } = require('stream')
const JSONStream = require('JSONStream')

const processBundles = ({ fhirBundleDataPath }) => {
  const jsonInput = fs.createReadStream(fhirBundleDataPath, {
    encoding: 'utf8'
  })
  const jsonToObject = JSONStream.parse('*')

  const objectToString = new Transform({
    writableObjectMode: true,
    transform(bundle, encoding, callback) {
      this.push(bundle.resourceType + ' ')
      callback()
    }
  })

  return (
    jsonInput
      .pipe(jsonToObject)
      //.pipe(reportProgress)
      .pipe(objectToString)
  )
  //  .on('finish', () => console.log({ stats }))
}

module.exports = { processBundles }
