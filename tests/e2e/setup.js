/**
 * E2E test setup for Firefox extension testing with Puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Build extension before tests
async function buildExtension() {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  console.log('Building extension for E2E tests...');
  
  try {
    await execAsync('npm run build');
    console.log('Extension built successfully');
  } catch (error) {
    console.error('Failed to build extension:', error);
    process.exit(1);
  }
}

// Set up global test helpers
global.loadExtension = async () => {
  const extensionPath = path.join(__dirname, '../../dist');
  
  if (!fs.existsSync(extensionPath)) {
    throw new Error('Extension not built. Run npm run build first.');
  }
  
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    product: 'firefox',
    args: [
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  return browser;
};

global.waitForExtension = async (page) => {
  // Wait for extension to be loaded
  await page.waitForFunction(
    () => window.__deepwebInitialized === true,
    { timeout: 10000 }
  );
};

global.openChatUI = async (page) => {
  // Trigger chat UI
  await page.evaluate(() => {
    window.postMessage({ type: 'toggle_chat' }, '*');
  });
  
  // Wait for UI to appear
  await page.waitForSelector('#deepweb-chat-root', { visible: true });
};

// Clean up after tests
afterAll(async () => {
  // Clean up any remaining browser instances
  const browsers = await puppeteer.browsers();
  for (const browser of browsers) {
    await browser.close();
  }
});

// Set longer timeout for E2E tests
jest.setTimeout(30000);

// Build extension before running tests
beforeAll(async () => {
  if (process.env.SKIP_BUILD !== 'true') {
    await buildExtension();
  }
});