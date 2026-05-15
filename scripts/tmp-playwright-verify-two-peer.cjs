const path = require('node:path');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectVideoMetrics(page) {
  return page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video')).map((v, idx) => ({
      track: (() => {
        const track = v.srcObject && v.srcObject.getVideoTracks ? v.srcObject.getVideoTracks()[0] : null;
        if (!track) return null;
        const settings = track.getSettings ? track.getSettings() : {};
        return { muted: track.muted, enabled: track.enabled, readyState: track.readyState, settings };
      })(),
      idx,
      muted: v.muted,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      readyState: v.readyState,
      currentTime: v.currentTime,
      hasTrack: !!v.srcObject && v.srcObject.getVideoTracks().length > 0,
    }));

    const remoteCandidates = videos.filter((v) => !v.muted);
    const remoteAnyWidth = remoteCandidates.some((v) => v.videoWidth > 0);

    return {
      href: location.href,
      videos,
      remoteAnyWidth,
      remoteCandidateCount: remoteCandidates.length,
      roomHeading: document.querySelector('h1')?.textContent?.trim() || '',
    };
  });
}

async function joinFromLobby(page, roomId, displayName) {
  // Seed sessionStorage so the room page auto-joins without modal
  await page.goto(`http://localhost:3009/join/${roomId}`, { waitUntil: 'networkidle', timeout: 120000 });

  // Pre-seed sessionStorage values so join lobby and room page are ready
  await page.evaluate(({ name, rId }) => {
    sessionStorage.setItem('rtc:displayName', name);
    sessionStorage.setItem('rtc:micOn', '1');
    sessionStorage.setItem('rtc:camOn', '1');
  }, { name: displayName, rId: roomId });

  // Fill in the display name field on the join lobby
  await page.fill('#join-name-input', displayName);

  // Click "Join Room" — triggers connecting splash then navigates to room
  await page.getByRole('button', { name: 'Join Room' }).click();

  // Wait for URL to reach the room (connecting splash lasts ~1.9s)
  await page.waitForURL(new RegExp(`/room/${roomId}`), { timeout: 30000 });
}

async function main() {
  const pwRoot = path.join(process.env.TEMP || 'C:/Windows/Temp', 'pwtmp', 'node_modules', 'playwright');
  const { chromium } = require(pwRoot);

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  const transportResponsesA = [];
  const transportResponsesB = [];

  pageA.on('response', async (response) => {
    if (response.url().includes('/transports') && response.request().method() === 'POST') {
      try { transportResponsesA.push(await response.json()); } catch { /* ignore */ }
    }
  });

  pageB.on('response', async (response) => {
    if (response.url().includes('/transports') && response.request().method() === 'POST') {
      try { transportResponsesB.push(await response.json()); } catch { /* ignore */ }
    }
  });

  const roomId = `room-${Date.now()}`;
  await joinFromLobby(pageA, roomId, 'peer-a');
  await joinFromLobby(pageB, roomId, 'peer-b');

  const deadline = Date.now() + 90000;
  let lastA = null;
  let lastB = null;
  let passed = false;

  while (Date.now() < deadline) {
    try {
      [lastA, lastB] = await Promise.all([collectVideoMetrics(pageA), collectVideoMetrics(pageB)]);
    } catch {
      await sleep(1000);
      continue;
    }

    const aOk = lastA.remoteAnyWidth;
    const bOk = lastB.remoteAnyWidth;

    if (aOk && bOk) {
      passed = true;
      break;
    }

    await sleep(1500);
  }

  const result = {
    passed,
    roomId,
    transportResponsesA,
    transportResponsesB,
    pageA: lastA,
    pageB: lastB,
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (!passed) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
