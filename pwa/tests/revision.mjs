import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let checks = 0;
try {
  for (const viewport of [
    { width: 393, height: 852 },
    { width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({
        viewport,
        serviceWorkers: 'block',
      }),
      page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
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
      assert.equal(
        await page.locator('aside input,aside [role="search"]').count(),
        0,
      );
      assert.equal(await page.locator('input[type="search"]').count(), 1);
      const field = page.locator('#global-search');
      assert.ok(await field.isVisible());
      await field.fill('stock jean');
      await page.locator('[data-search-product="2"]').waitFor();
      assert.match(
        await page.locator('#search-matches').textContent(),
        /4 unidades/,
      );
      await page.keyboard.press('ArrowDown');
      assert.equal(
        await page.evaluate(() => document.activeElement.dataset.searchProduct),
        '2',
      );
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#global-results').isVisible(), false);
      checks++;
      await field.fill('reposición');
      assert.equal(await page.locator('[data-search-product]').count(), 2);
      checks++;
      await page.locator('[data-search-product="3"]').click();
      await page.locator('dialog').waitFor();
      assert.match(await page.locator('dialog').textContent(), /Casaca urbana/);
      await page
        .getByRole('button', { name: 'Cerrar panel', exact: true })
        .click();
      await page.locator('dialog').waitFor({ state: 'hidden' });
      checks++;
      await field.fill('ventas');
      await page.locator('.search-route[href="#ventas"]').click();
      await page.locator('.sales-summary').waitFor();
      assert.equal(await page.locator('#global-results').isVisible(), false);
      checks++;
    }
    await page.goto(
      (process.env.BASE_URL || 'http://127.0.0.1:8080') + '/#inicio',
    );
    await page.locator('[data-chart-type="bars"]').click();
    assert.equal(
      await page.locator('.chart-bars').getAttribute('visibility'),
      'visible',
    );
    await page.locator('[data-chart-compare]').uncheck();
    assert.equal(await page.locator('.previous-line').isVisible(), false);
    checks++;
    if (viewport.width === 393) {
      const nav = await page.locator('#mobile-nav').boundingBox();
      assert.ok(nav.x > 0 && nav.y + nav.height < viewport.height);
      const box = await page.locator('#global-search').boundingBox(),
        brand = await page.locator('.mobile-brand').boundingBox();
      assert.ok(box.y >= brand.y + brand.height);
      checks++;
    }
    await page.goto(
      (process.env.BASE_URL || 'http://127.0.0.1:8080') + '/#asistente',
    );
    await page.locator('#chat-input').fill('Hola');
    assert.equal(await page.locator('.suggestions').isVisible(), false);
    await page.locator('#chat-input').fill('');
    assert.equal(await page.locator('.suggestions').isVisible(), false);
    checks++;
    assert.deepEqual(errors, []);
    checks++;
    await context.close();
  }
  console.log(
    `PASS: ${checks} correction checks: persistent global search across all six sections, stock, keyboard, details, navigation, chart controls, floating dock and conversation suggestions.`,
  );
} finally {
  await browser.close();
}
