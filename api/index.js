const app = require('express')()
const processBundles = require('./lib/process-bundles')

app.get('/foo', (req, res, next) => {
  const options = { fhirBundleDataPath: `./data/fhir-bundles/bundles.json` }

  processBundles(options).pipe(res)

  //res.status(200).send('Foo 2 U 2.')
})

app.listen(4000, () => console.log('Up on 4000'))
