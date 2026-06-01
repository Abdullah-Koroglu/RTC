const { chromium } = require('playwright');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickJoinFromLobby(page, roomId, displayName) {
  await page.goto(`http://localhost:3000/join/${roomId}`, { waitUntil: 'domcontentloaded', timeout: 120000 });

  await page.evaluate(({ name }) => {
    sessionStorage.setItem('rtc:displayName', name);
    sessionStorage.setItem('rtc:micOn', '1');
    sessionStorage.setItem('rtc:camOn', '1');
  }, { name: displayName });

  await page.fill('#join-name-input', displayName);
  await page.getByRole('button', { name: /Join Room|Odaya Katıl/i }).click();
  await page.waitForURL(new RegExp(`/room/${roomId}`), { timeout: 30000 });
}

async function createRoomAndJoin(page, displayName) {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('button', { name: /Start a meeting|Toplantı Başlat/i }).click();

  await page.waitForURL(/\/join\//, { timeout: 60000 });
  const url = page.url();
  const roomId = decodeURIComponent(url.split('/join/')[1] || '');
  if (!roomId) {
    throw new Error(`Failed to resolve roomId from URL: ${url}`);
  }

  await page.evaluate(({ name }) => {
    sessionStorage.setItem('rtc:displayName', name);
    sessionStorage.setItem('rtc:micOn', '1');
    sessionStorage.setItem('rtc:camOn', '1');
  }, { name: displayName });

  await page.fill('#join-name-input', displayName);
  await page.getByRole('button', { name: /Join Room|Odaya Katıl/i }).click();
  await page.waitForURL(new RegExp(`/room/${roomId}`), { timeout: 60000 });
  return roomId;
}

async function mediaSnapshot(page, tag) {
  return page.evaluate((stageTag) => {
    const tiles = Array.from(document.querySelectorAll('article'));
    const canvasCount = document.querySelectorAll('canvas').length;
    const audioEls = Array.from(document.querySelectorAll('audio'));

    const audios = audioEls.map((a, idx) => ({
      idx,
      muted: a.muted,
      paused: a.paused,
      readyState: a.readyState,
      currentTime: a.currentTime,
      hasSrcObject: !!a.srcObject,
    }));

    const localIndicators = Array.from(document.querySelectorAll('span')).map((s) => s.textContent || '').filter(Boolean);

    return {
      tag: stageTag,
      href: location.href,
      tileCount: tiles.length,
      canvasCount,
      audioCount: audioEls.length,
      audios,
      textProbe: localIndicators.slice(0, 20),
    };
  }, tag);
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const ctxA = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const ctxB = await browser.newContext({ permissions: ['camera', 'microphone'] });

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const roomId = await createRoomAndJoin(pageA, 'peer-a');
  await clickJoinFromLobby(pageB, roomId, 'peer-b');

  await sleep(5000);

  const beforeA = await mediaSnapshot(pageA, 'before-offline-a');
  const beforeB = await mediaSnapshot(pageB, 'before-offline-b');

  await ctxA.setOffline(true);
  console.log('[test] peer-a offline');

  await sleep(20000);

  await ctxA.setOffline(false);
  console.log('[test] peer-a online');

  await sleep(12000);

  const afterA = await mediaSnapshot(pageA, 'after-reconnect-a');
  const afterB = await mediaSnapshot(pageB, 'after-reconnect-b');

  const result = {
    roomId,
    beforeA,
    beforeB,
    afterA,
    afterB,
  };

  console.log(JSON.stringify(result, null, 2));

  // Keep a short grace window for visual confirmation, then close.
  await sleep(2000);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
