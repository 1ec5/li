process.env.NODE_ENV = 'testing'

const test = require('tape')
const { join } = require('path')
const fs = require('fs')
const utils = require('../../_lib/utils.js')


async function waitForGeneratedFiles (fileCount, timeoutms = 10000, interval = 500) {
  return new Promise(resolve => {
    let remaining = timeoutms
    var check = async () => {
      remaining -= interval
      let files = utils.testReportsDir.allFiles()
      if (files.length === fileCount)
        resolve(files)
      else if (remaining < 0) {
        resolve(files)
      }
      else {
        console.log(`  waiting for ${fileCount} files, got ${files.length} (${remaining}ms left)`)
        setTimeout(check, interval)
      }
    }
    setTimeout(check, interval)
  })
}


test.only('files are generated', async t => {
  await utils.setup()
  t.equal(utils.testReportsDir.allFiles().length, 0, 'no files at start')

  const caseData = {
    cases: 21,
    deaths: 4,
    tested: 200,
    hospitalized: 5,
    icu: 2
  }
  utils.writeFakeSourceContent('json-source/data.json', caseData)
  await utils.crawl('json-source')
  await utils.scrape('json-source')

  const locations = await utils.waitForDynamoTable('locations', 10000, 200)
  t.equal(locations.length, 1, `Sanity check, have 1 location: ${JSON.stringify(locations, null, 2)}`)

  // Override load path for sources, since we're using fake sources
  // for these tests.
  await utils.generateReports(utils.sourcesPath, utils.testReportsDir.reportsDir)
  const reportStatus = await utils.waitForDynamoTable('report-status', 10000, 200)
  console.table(reportStatus)

  const expectedFiles = [
    'locations.json',
    'timeseries-byLocation.json',
    'timeseries-jhu.csv',
    'timeseries-tidy.csv',
    'timeseries.csv'
  ]
  let files = await waitForGeneratedFiles(5)
  const msg = `expected 5 files, got ${files.length} (${files.join()})`
  t.equal(files.length, 5, msg)
  t.equal(expectedFiles.sort().join(), files.sort().join())

  function assertContentsEqual (filename) {
    const actual = join(utils.testReportsDir.reportsDir, filename)
    const expected = join(__dirname, 'expected-results', filename)
    const clean = f => fs.readFileSync(f, 'UTF-8').replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
    t.equal(clean(actual), clean(expected), filename)
  }
  for (const f of expectedFiles) {
    console.log(`validate ${f}`)
    assertContentsEqual(f)
  }

  await utils.teardown()
  t.end()
})
