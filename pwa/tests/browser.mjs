import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const artifacts = process.env.ARTIFACTS_DIR || '/tmp/datacore-artifacts';
await mkdir(artifacts, { recursive: true });
let checks = 0;
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 393, height: 852 },
    { width: 375, height: 812 },
  ]) {
    const mobile = viewport.width < 760;
    const context = await browser.newContext({
        viewport,
        isMobile: mobile,
        hasTouch: mobile,
        serviceWorkers: 'block',
      }),
      page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('.hero-value').waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    checks++;
    const before = await page.locator('.hero-value').textContent();
    await page.selectOption('#period', '7');
    assert.notEqual(await page.locator('.hero-value').textContent(), before);
    checks++;
    const chart = page.locator('[data-chart]');
    await chart.focus();
    await page.keyboard.press('ArrowLeft');
    assert.ok(await page.locator('.chart-tooltip').isVisible());
    assert.match(
      await page.locator('.chart-tooltip').textContent(),
      /Anterior/,
    );
    checks++;
    await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    checks++;
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `${artifacts}/inicio-${viewport.width}-dark.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Activar modo claro' }).click();
    await page
      .locator(mobile ? '#mobile-nav' : '#desktop-nav')
      .getByRole('link', { name: 'Productos', exact: true })
      .click();
    await page.locator('.product').first().waitFor();
    assert.equal(await page.locator('.product').count(), 6);
    checks++;
    assert.equal(await page.locator('aside input[type="search"]').count(), 0);
    assert.equal(await page.locator('input[type="search"]').count(), 1);
    await page.locator('#global-search').fill('zz_sin_coincidencias');
    assert.match(
      await page.locator('#search-matches').textContent(),
      /Sin coincidencias/,
    );
    await page.locator('#search-clear').click();
    checks++;
    await page.getByRole('button', { name: 'Textil', exact: true }).click();
    assert.equal(await page.locator('.product').count(), 2);
    checks++;
    await page.locator('[data-compare]').nth(0).check();
    await page.locator('[data-compare]').nth(1).check();
    await page.locator('#compare-open').click();
    assert.ok(await page.locator('dialog').isVisible());
    assert.match(await page.locator('dialog').textContent(), /Jean clásico/);
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({ state: 'hidden' });
    checks++;
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await page
      .getByRole('button', {
        name: 'Ver detalles de Casaca urbana',
        exact: true,
      })
      .click();
    assert.match(
      await page.locator('dialog').textContent(),
      /Reposición recomendada/,
    );
    await page.locator('#sheet-close').click();
    await page.locator('dialog').waitFor({ state: 'hidden' });
    checks++;
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `${artifacts}/productos-${viewport.width}.png`,
      fullPage: true,
    });
    if (mobile) {
      await page.locator('#more-nav').click();
      await page
        .locator('dialog')
        .getByRole('link', { name: /Inventario/ })
        .click();
      await page.locator('dialog').waitFor({ state: 'hidden' });
    } else
      await page
        .locator('#desktop-nav')
        .getByRole('link', { name: /Inventario/ })
        .click();
    await page
      .getByRole('button', { name: 'Por reponer', exact: true })
      .click();
    assert.equal(await page.locator('.inventory-row').count(), 2);
    checks++;
    if (mobile) {
      await page.locator('#more-nav').click();
      await page
        .locator('dialog')
        .getByRole('link', { name: 'Reportes', exact: true })
        .click();
      await page.locator('dialog').waitFor({ state: 'hidden' });
    } else
      await page
        .locator('#desktop-nav')
        .getByRole('link', { name: 'Reportes', exact: true })
        .click();
    const download = page.waitForEvent('download');
    await page.locator('#export-csv').click();
    assert.match((await download).suggestedFilename(), /datacore_demo_ventas/);
    checks++;
    await page
      .locator(mobile ? '#mobile-nav' : '#desktop-nav')
      .getByRole('link', { name: 'Ventas', exact: true })
      .click();
    await page.selectOption('#branch', 'Centro');
    assert.match(await page.locator('.transactions').textContent(), /Centro/);
    checks++;
    await page
      .locator(mobile ? '#mobile-nav' : '#desktop-nav')
      .getByRole('link', { name: 'Asistente IA', exact: true })
      .click();
    await page
      .locator('#chat-input')
      .fill('¿Qué productos necesitan reposición?');
    assert.equal(await page.locator('.suggestions').isVisible(), false);
    await page.getByRole('button', { name: 'Enviar pregunta' }).click();
    await page.locator('.message.assistant').waitFor();
    assert.match(
      await page.locator('.message.assistant').textContent(),
      /Casaca urbana: 2/,
    );
    checks++;
    await page.locator('#chat-input').fill('<img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: 'Enviar pregunta' }).click();
    assert.equal(await page.locator('.message img').count(), 0);
    await page.locator('.message.user').nth(1).waitFor();
    assert.equal(await page.locator('.message.user').count(), 2);
    checks++;
    await page
      .locator(mobile ? '#mobile-nav' : '#desktop-nav')
      .getByRole('link', { name: 'Inicio', exact: true })
      .click();
    await page.locator('.hero-value').waitFor();
    await page
      .locator(mobile ? '#mobile-nav' : '#desktop-nav')
      .getByRole('link', { name: 'Asistente IA', exact: true })
      .click();
    await page.locator('.message.user').nth(1).waitFor();
    assert.equal(await page.locator('.message.user').count(), 2);
    checks++;
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `${artifacts}/asistente-${viewport.width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    checks++;
    await context.close();
  }
  const gestureContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    serviceWorkers: 'block',
  });
  const gesturePage = await gestureContext.newPage();
  await gesturePage.goto(base + '/#productos');
  await gesturePage.locator('.product').first().waitFor();
  await gesturePage.locator('[data-product]').first().click();
  const handle = await gesturePage.locator('.sheet-handle').boundingBox();
  await gesturePage.mouse.move(handle.x + 100, handle.y + 10);
  await gesturePage.mouse.down();
  await gesturePage.mouse.move(handle.x + 100, handle.y + 95, { steps: 8 });
  assert.notEqual(
    await gesturePage
      .locator('dialog')
      .evaluate((el) => getComputedStyle(el).transform),
    'none',
  );
  await gesturePage.mouse.move(handle.x + 100, handle.y + 390, { steps: 8 });
  await gesturePage.mouse.up();
  await gesturePage.locator('dialog').waitFor({ state: 'hidden' });
  checks++;
  await gesturePage.goto(base + '/#asistente');
  await gesturePage.locator('#chat-input').fill('ventas');
  await gesturePage.evaluate(() => (globalThis.datacoreServerAssistant = true));
  await gesturePage.route('**/api/assistant', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":"unavailable"}',
    }),
  );
  await gesturePage.getByRole('button', { name: 'Enviar pregunta' }).click();
  await gesturePage.locator('.message.assistant').waitFor();
  assert.match(
    await gesturePage.locator('.message.assistant').textContent(),
    /No se pudo completar/,
  );
  checks++;
  await gestureContext.close();
  const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.hero-value').waitFor();
  assert.match(
    await page.locator('#network-status').textContent(),
    /Sin conexión/,
  );
  checks++;
  await page
    .locator('#mobile-nav')
    .getByRole('link', { name: 'Productos', exact: true })
    .click();
  await page.locator('.product').first().waitFor();
  assert.equal(await page.locator('.product').count(), 6);
  await page
    .getByRole('button', { name: 'Ver detalles de Polo algodón', exact: true })
    .click();
  assert.ok(await page.locator('dialog').isVisible());
  await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  assert.equal(await page.locator('dialog').isVisible(), false);
  checks++;
  await context.close();
  console.log(
    `PASS: ${checks} browser checks; desktop, 393px, 375px, themes, filters, chart, comparison, assistant, offline and reduced motion. Screenshots: ${artifacts}`,
  );
} finally {
  await browser.close();
}
