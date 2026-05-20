const { chromium } = require('playwright');
const { mkdirSync } = require('fs');

const BASE = 'http://localhost:8095';

async function run() {
  mkdirSync('test-screenshots', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  // 1. Landing
  console.log('\n=== 1. Landing ===');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: 'test-screenshots/1-landing.png' });
  console.log('URL:', page.url());
  console.log('Start btn:', await page.locator('text=Start a meeting').first().isVisible());
  console.log('Join btn:', await page.locator('text=Join with code').first().isVisible());

  // 2. Start a meeting
  console.log('\n=== 2. Start a meeting ===');
  await page.locator('text=Start a meeting').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-screenshots/2-after-start.png' });
  const url2 = page.url();
  console.log('URL:', url2);
  console.log('On /join/ :', url2.includes('/join/'));
  const unmatched2 = await page.locator('text=Unmatched').first().isVisible().catch(() => false);
  console.log('Unmatched error:', unmatched2);

  // 3. Lobby
  if (url2.includes('/join/')) {
    console.log('\n=== 3. Lobby — fill name ===');
    await page.waitForSelector('input', { timeout: 5000 });
    const nameInput = page.locator('input').first();
    await nameInput.fill('Test User');
    await page.screenshot({ path: 'test-screenshots/3-lobby.png' });
    const joinBtn = page.locator('text=Join Room').first();
    console.log('Join Room btn:', await joinBtn.isVisible());
    await joinBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-screenshots/4-room.png' });
    const url3 = page.url();
    console.log('URL after Join Room:', url3);
    console.log('On /room/ :', url3.includes('/room/'));
    const unmatched3 = await page.locator('text=Unmatched').first().isVisible().catch(() => false);
    console.log('Unmatched error:', unmatched3);
  }

  // 4. Join with code
  console.log('\n=== 4. Join with code ===');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  await page.locator('text=Join with code').first().click();
  await page.waitForTimeout(400);
  await page.locator('input').first().fill('my-test-room');
  await page.locator('text=Join').last().click();
  await page.waitForTimeout(1000);
  const url4 = page.url();
  console.log('URL:', url4);
  console.log('On /join/ :', url4.includes('/join/'));
  console.log('Unmatched:', await page.locator('text=Unmatched').first().isVisible().catch(() => false));
  await page.screenshot({ path: 'test-screenshots/5-join-code.png' });

  // 5. Profile page
  console.log('\n=== 5. Profile ===');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  await page.locator('text=Profile').first().click();
  await page.waitForTimeout(800);
  const url5 = page.url();
  console.log('URL:', url5);
  console.log('On /profile :', url5.includes('/profile'));
  await page.screenshot({ path: 'test-screenshots/6-profile.png' });

  console.log('\n=== JS Errors ===');
  if (errors.length === 0) {
    console.log('✓ None');
  } else {
    errors.slice(0, 5).forEach(e => console.log('ERR:', e.slice(0, 150)));
  }

  console.log('\nScreenshots → test-screenshots/');
  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
