const path = require('node:path');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectVideoMetrics(page) {
  return page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video')).map((v, idx) => ({
      track: (() => {
        const track = v.srcObject && v.srcObject.getVideoTracks ? v.srcObject.getVideoTracks()[0] : null;
        if (!track) {
          return null;
        }
        const settings = track.getSettings ? track.getSettings() : {};
        return {
          muted: track.muted,
          enabled: track.enabled,
          readyState: track.readyState,
          settings,
        };
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

async function joinFromHome(page, roomId, peerId) {
  await page.goto('http://localhost:3009', { waitUntil: 'networkidle', timeout: 120000 });
  await page.fill('#room-id', roomId);
  await page.fill('#peer-id', peerId);
  await page.getByRole('button', { name: /Odaya Katıl|Join Room/ }).click();
  await page.waitForURL(new RegExp(`/room/${roomId}`), { timeout: 30000 });
  // Dismiss device selection modal if it appears (wait up to 20s for room to join)
  try {
    await page.getByRole('button', { name: 'Katıl' }).click({ timeout: 20000 });
  } catch {
    // modal may not appear (already dismissed or feature flag disabled)
  }
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
      try {
        const data = await response.json();
        transportResponsesA.push(data);
      } catch {
        // ignore parse errors
      }
    }
  });

  pageB.on('response', async (response) => {
    if (response.url().includes('/transports') && response.request().method() === 'POST') {
      try {
        const data = await response.json();
        transportResponsesB.push(data);
      } catch {
        // ignore parse errors
      }
    }
  });

  const roomId = `room-${Date.now()}`;
  await joinFromHome(pageA, roomId, 'peer-a');
  await joinFromHome(pageB, roomId, 'peer-b');

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
