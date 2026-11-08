import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  }),
  page = await context.newPage();
let count = 0;
try {
  for (const theme of ['light', 'dark'])
    for (const route of [
      'inicio',
      'productos',
      'ventas',
      'inventario',
      'reportes',
      'asistente',
    ]) {
      await page.goto(
        (process.env.BASE_URL || 'http://127.0.0.1:8080') + '/#' + route,
      );
      await page.locator('#view h1').waitFor();
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      assert.deepEqual(
        result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
        `${theme}/${route}`,
      );
      count++;
    }
  for (const theme of ['light', 'dark']) {
    await page.goto(
      (process.env.BASE_URL || 'http://127.0.0.1:8080') + '/#inicio',
    );
    await page.locator('#global-search').fill('stock');
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
      theme + '/global-search-open',
    );
    count++;
  }
  console.log(
    `PASS: Axe WCAG A/AA checks across ${count} mobile view/theme/search combinations. This is not a complete accessibility audit.`,
  );
} finally {
  await browser.close();
}
