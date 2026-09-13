import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const port = 8791;
const origin = `http://127.0.0.1:${port}`;
const output = (name) => fileURLToPath(new URL(`../public/screenshots/${name}`, import.meta.url));
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(port), KOTCYA_PUBLIC_ORIGIN: origin },
  stdio: 'ignore',
});

const sample = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#dceedd"/><stop offset="1" stop-color="#8fbd98"/></linearGradient></defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <circle cx="600" cy="300" r="140" fill="#347e4c"/>
    <path d="M350 760c20-230 130-330 250-330s230 100 250 330" fill="#245d39"/>
  </svg>
`);

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) return;
    } catch {
      // Retry while the local server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('撮影用サーバーを起動できませんでした');
}

await mkdir(new URL('../public/screenshots/', import.meta.url), { recursive: true });
await waitForServer();
const browser = await chromium.launch();

try {
  const wide = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await wide.goto(origin);
  await wide.locator('input[type="file"]').first().setInputFiles({
    name: 'sample.svg',
    mimeType: 'image/svg+xml',
    buffer: sample,
  });
  await wide.locator('img[alt="加工プレビュー"]').waitFor();
  await wide.screenshot({
    path: output('wide.png'),
  });

  const narrow = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await narrow.goto(origin);
  await narrow.locator('input[type="file"]').first().setInputFiles({
    name: 'sample.svg',
    mimeType: 'image/svg+xml',
    buffer: sample,
  });
  const paneSwitch = narrow.getByRole('radiogroup', { name: 'ツール、プレビュー、画像情報の切替' });
  await paneSwitch.getByText('ツール', { exact: true }).click();
  await narrow.screenshot({
    path: output('narrow.png'),
  });
} finally {
  await browser.close();
  server.kill();
}
