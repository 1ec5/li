const { brotliCompressSync } = require('zlib')
const arc = require('@architect/functions')
const validate = require('./_validate.js')
const chromium = require('chrome-aws-lambda')

async function getHeadless (req) {
  let options = decodeURIComponent(req.queryStringParameters.options)
  options = JSON.parse(options)
  let { cookies, rejectUnauthorized, url } = options

  let browser = null

  try {
    const agent = 'Mozilla/5.0 (Macintosh Intel Mac OS X 10_13_2) ' +
                  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                  'Chrome/80.0.3987.132 Safari/537.36'
    const defaultViewport = { width: 1280, height: 800, isMobile: false }
    const responseTimeout = 5000
    const timeout = 30000

    // Important: this prevents SSL from failing
    if (rejectUnauthorized) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    })
    let page = await browser.newPage()

    await page.setUserAgent(agent)
    await page.setViewport(defaultViewport)
    if (cookies) {
      const cookie = Object.entries(cookies).map(([cookie, value]) => `${cookie}=${value}`).join('; ')
      await page.setExtraHTTPHeaders({ cookie })
    }

    let tries = 0
    while (tries < 5) {
      tries++
      if (tries > 1) {
        await new Promise(r => setTimeout(r, 2000))
      }

      const response = await page.goto(url, {
        timeout,
        waitUntil: 'networkidle2'
      })

      // Some sort of internal socket error or other badness, retry
      if (response === null) {
        browser.close()
        continue
      }

      const status = response.status()

      // Try again if we got an error code which might be recoverable
      if (status >= 500) {
        continue
      }

      // We got a good response, return it
      if (status < 400) {
        await page.waitFor(responseTimeout)
        const html = await page.content()
        browser.close()

        // Compress, then base64 encode body in case we transit binaries, max 10MB payload
        let responseBody = new Buffer.from(html)
        responseBody = brotliCompressSync(responseBody).toString('base64')
        if (responseBody.length >= 1000 * 1000 * 10) {
          console.log(`Hit a very large payload!`, JSON.stringify(options, null, 2))
          return {
            statusCode: 500,
            json: { error: 'maximum_size_exceeded' }
          }
        }
        // Set up response payload
        let payload = {
          body: responseBody
        }
        // TODO handle cookies, haven't seen a need yet
        // → page.cookies

        const body = JSON.stringify(payload)
        return {
          statusCode: 200,
          body
        }
      }

      // 400-499 means retrying is not likely to help
      if (status < 500) {
        browser.close()
        return {
          statusCode: status
        }
      }

      if (tries === 5) {
        browser.close
        return {
          statusCode: 500
        }
      }
    }
  }
  catch (err) {
    if (browser) {
      browser.close()
    }
    console.error('An error occurred', err)
    return {
      statusCode: 500
    }
  }
}

exports.handler = arc.http.async(validate, getHeadless)
