const { chromium } = require('playwright');
const { mkdirSync } = require('fs');

async function run() {
  mkdirSync('test-screenshots', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://localhost:8095', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body text:', bodyText.slice(0, 300));

  if (errors.length) {
    console.log('Errors:', errors.slice(0,3).map(e => e.slice(0,200)));
  } else {
    console.log('No JS errors');
  }

  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
