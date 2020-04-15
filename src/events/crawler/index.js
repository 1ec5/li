const arc = require('@architect/functions')
const loadSource = require('./load-source/index.js')
const crawler = require('./crawl')
const cache = require('./cache')

async function crawlSource (event) {
  try {
    /**
     * Load the requested source
     */
    const source = loadSource(event)
    const { scrapers, _sourceKey } = source

    /**
     * Select the current scraper from the source's available scrapers
     */
    // TODO actually calculate latest start date; this hack works for now
    const scraper = scrapers[scrapers.length - 1]

    /**
     * Prepare all the 'get' results to be cached
     */
    const results = []
    // TODO maybe want to make this Promise.all once things are stable
    for (let crawl of scraper.crawl) {
      let { type, url } = crawl
      crawl.url = typeof url === 'string'
                     ? url
                     : await url(/*client*/)

      // A crawl may pass back a URL or { url, cookie }; extract and pass along
      if (crawl.url.cookie) {
        crawl.cookie = crawl.url.cookie
      }
      if (crawl.url.url) {
        crawl.url = url
      }
      const data = await crawler(crawl)
      const result = {
        // Caching metadata
        _sourceKey,
        _name: scraper.crawl.length > 1 ? crawl.name : 'default',
        // Payload
        data,
        type
      }

      results.push(result)
    }

    if (results.length !== scraper.crawl.length) {
      throw Error(`Failed to crawl all requested 'get' sources`)
    }

    /**
     * Cache the results
     */
    await cache(results)
  }
  catch (err) {
    console.log('Crawler error', err)
    throw Error(err)
  }
}

exports.handler = arc.events.subscribe(crawlSource)
module.exports = crawlSource
