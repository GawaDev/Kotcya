import { expect, test } from '@playwright/test';

const sampleSvg = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
    <rect width="640" height="480" fill="#dceedd"/>
    <circle cx="320" cy="190" r="80" fill="#347e4c"/>
    <rect x="235" y="275" width="170" height="150" rx="70" fill="#245d39"/>
  </svg>
`);

test('スマートフォンで主要操作へ到達できる', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('radiogroup', { name: 'ツール、プレビュー、画像情報の切替' })).toBeVisible();
  await expect(page.getByText('画像を開く', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'sample.svg',
    mimeType: 'image/svg+xml',
    buffer: sampleSvg,
  });
  await expect(page.locator('img[alt="加工プレビュー"]')).toBeVisible();

  const paneSwitch = page.getByRole('radiogroup', { name: 'ツール、プレビュー、画像情報の切替' });
  await paneSwitch.getByText('ツール', { exact: true }).click();
  await page.getByRole('button', { name: '人物を切り抜く' }).click();
  await expect(page.getByRole('dialog', { name: '人物を切り抜く' })).toBeVisible();
  await page.getByRole('button', { name: 'キャンセル' }).click();
  await page.getByText('保存', { exact: true }).last().scrollIntoViewIfNeeded();
  await expect(page.getByText('保存', { exact: true }).last()).toBeVisible();

  await paneSwitch.getByText('情報', { exact: true }).click();
  await expect(page.getByRole('button', { name: '生成情報を確認' })).toBeVisible();

  await page.getByRole('button', { name: 'ヘルプ' }).click();
  await expect(page.getByRole('complementary', { name: 'ヘルプ目次' })).toBeVisible();
  await expect(page.getByText('はじめに', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '閉じる' }).click();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('インストール情報とオフライン起動を利用できる', async ({ page, context }) => {
  await page.goto('/');
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
  ]));

  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
  if (!controlled) await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(/Kotcya/);
  await expect(page.getByText('画像を開く', { exact: true })).toBeVisible();
});
