/** Requires a real deployed URL. Never treats a local build as publication. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.env.DEPLOYMENT_URL;
if (!base || !base.startsWith('https://'))
  throw new Error('Set DEPLOYMENT_URL to the actual HTTPS deployment.');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
});
try {
  const page = await context.newPage();
  const response = await page.goto(base + '/?verify=editorial-search-v2');
  assert.equal(response.status(), 200);
  assert.equal(
    await page.locator('meta[name="datacore-release"]').getAttribute('content'),
    'editorial-search-v2',
  );
  await page.locator('#global-search').fill('jean');
  await page.locator('[data-search-product="2"]').waitFor();
  const root = new URL('../../public-demo/', import.meta.url);
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  let checked = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const file = new URL(
      entry.name,
      new URL(entry.parentPath.replace(/\/$/, '') + '/', 'file://'),
    );
    const relative = file.href.slice(root.href.length);
    const remote = await context.request.get(
      new URL(relative, base.endsWith('/') ? base : base + '/').href +
        '?verify=editorial-search-v2',
      { headers: { 'Cache-Control': 'no-cache' } },
    );
    assert.equal(remote.status(), 200, relative);
    const local = await readFile(file);
    assert.equal(
      createHash('sha256')
        .update(await remote.body())
        .digest('hex'),
      createHash('sha256').update(local).digest('hex'),
      `Stale asset: ${relative}`,
    );
    checked++;
  }
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  assert.equal(
    await page.locator('meta[name="datacore-release"]').getAttribute('content'),
    'editorial-search-v2',
  );
  console.log(
    `PASS: public HTTPS deployment serves editorial-search-v2; ${checked} assets match SHA-256, including after reload with service worker.`,
  );
} finally {
  await browser.close();
}
