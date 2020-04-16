const loadSources = require('@architect/shared/sources/_lib/load-sources.js')
const sourceKey = require('@architect/shared/sources/_lib/source-key.js')

/**
 * If it wasn't obvious from all the naming, this thing loads a specified source
 */
module.exports = function loadSource (params) {
  const { source } = params

  const sources = loadSources()
  const filePath = sources[source]

  if (!filePath) {
    throw Error(`Specified source not found ${source}`)
  }
  try {
    // eslint-disable-next-line
    const src = require(filePath)

    // Populate the sourceKey for caching
    src._sourceKey = sourceKey(filePath)

    return src
  }
  catch (err) {
    throw Error(`Source could not be loaded ${source}`)
  }
}
