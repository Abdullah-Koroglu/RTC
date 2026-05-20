import { chromium } from 'playwright';

const BASE = 'http://localhost:8093';

async function screenshot(page, name) {
  await page.screenshot({ path: `test-screenshots/${name}.png`, fullPage: false });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 14 size
  const page = await ctx.newPage();

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // --- Landing ---
    console.log('\n=== 1. Landing page ===');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const landingTitle = await page.textContent('text=Link').catch(() => null);
    const startBtn = await page.locator('text=Start a meeting').first();
    const joinBtn = await page.locator('text=Join with code').first();
    console.log('Title visible:', !!landingTitle);
    console.log('Start meeting btn:', await startBtn.isVisible());
    console.log('Join with code btn:', await joinBtn.isVisible());
    await screenshot(page, '1-landing');

    // --- Join with code flow ---
    console.log('\n=== 2. Join with code ===');
    await joinBtn.click();
    await page.waitForTimeout(400);
    const input = page.locator('input').first();
    await input.fill('test-room-123');
    await screenshot(page, '2-join-input');
    await page.locator('text=Join').last().click();
    await page.waitForTimeout(800);
    const url2 = page.url();
    console.log('URL after join click:', url2);
    const isOnJoin = url2.includes('/join/');
    const isUnmatched = await page.locator('text=Unmatched').first().isVisible().catch(() => false);
    console.log('On /join/ page:', isOnJoin);
    console.log('Unmatched route error:', isUnmatched);
    await screenshot(page, '3-after-join-click');

    // --- Start meeting flow ---
    console.log('\n=== 3. Start a meeting ===');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('text=Start a meeting').first().click();
    await page.waitForTimeout(800);
    const url3 = page.url();
    console.log('URL after Start meeting:', url3);
    const isOnJoin2 = url3.includes('/join/');
    console.log('On /join/ page:', isOnJoin2);
    await screenshot(page, '4-start-meeting');

    // --- Join lobby → name input ---
    if (isOnJoin2) {
      console.log('\n=== 4. Join lobby ===');
      const nameInput = page.locator('input').first();
      await nameInput.fill('Test User');
      await screenshot(page, '5-lobby-name');
      const joinRoomBtn = page.locator('text=Join Room').first();
      console.log('Join Room btn visible:', await joinRoomBtn.isVisible());
      await joinRoomBtn.click();
      await page.waitForTimeout(1200);
      const url4 = page.url();
      console.log('URL after Join Room:', url4);
      console.log('On /room/ page:', url4.includes('/room/'));
      await screenshot(page, '6-after-join-room');
    }

    // Console errors summary
    if (errors.length > 0) {
      console.log('\n=== Console Errors ===');
      errors.slice(0, 5).forEach(e => console.log(' ERR:', e.slice(0, 120)));
    } else {
      console.log('\n✓ No console errors');
    }

  } finally {
    await browser.close();
  }
}

import { mkdirSync } from 'fs';
mkdirSync('test-screenshots', { recursive: true });
run().catch(console.error);
