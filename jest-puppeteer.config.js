/**
 * Puppeteer configuration for E2E testing with Firefox
 */

module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    product: 'firefox',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  },
  browserContext: 'default'
};