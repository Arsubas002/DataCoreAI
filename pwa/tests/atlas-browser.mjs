import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { analytics, money } from '../js/data.js';
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let checks = 0;
try {
  for (const width of [393, 1440]) {
    const p = await b.newPage({
        viewport: { width, height: 1000 },
        serviceWorkers: 'block',
        reducedMotion: 'reduce',
      }),
      base = process.env.BASE_URL || 'http://127.0.0.1:8080';
    await p.goto(base);
    const d = analytics();
    await p.locator('[data-chart]').focus();
    await p.keyboard.press('End');
    assert.ok(
      (await p.locator('.chart-tooltip').textContent()).includes(
        money(d.revenue),
      ),
    );
    checks++;
    await p.locator('[data-chart-type="bars"]').click();
    await p.locator('[data-chart]').focus();
    await p.keyboard.press('End');
    assert.ok(
      (await p.locator('.chart-tooltip').textContent()).includes(
        money(d.series.at(-1)),
      ),
    );
    checks++;
    await p.locator('[data-chart-compare]').uncheck();
    assert.equal(await p.locator('.previous-line').isVisible(), false);
    checks++;
    await p.locator('[data-viz="donut"] button').first().click();
    assert.ok(await p.locator('[data-viz="donut"] output').isVisible());
    checks++;
    await p.goto(base + '/#ventas');
    await p.locator('.column-item').first().click();
    assert.match(
      await p.locator('[data-viz="columns"] output').textContent(),
      /Centro/,
    );
    checks++;
    await p.locator('.calendar-grid button').first().click();
    assert.ok(
      (await p.locator('[data-viz="calendar"] output').textContent()).includes(
        money(d.series[0]),
      ),
    );
    checks++;
    await p.selectOption('#branch', 'Sin asignar');
    await p.selectOption('#period', '7');
    await p.locator('.column-item').last().click();
    assert.ok(
      (await p.locator('[data-viz="columns"] output').textContent()).includes(
        money(1347.7),
      ),
    );
    checks++;
    await p.goto(base + '/#reportes');
    await p.locator('.tile-legend button').last().click();
    assert.ok(await p.locator('[data-viz="treemap"] output').isVisible());
    checks++;
    await p
      .locator('.scatter-plot')
      .evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await p.locator('.scatter-field button').first().click();
    assert.match(
      await p.locator('[data-viz="scatter"] output').textContent(),
      /unidades/,
    );
    checks++;
    assert.equal(await p.locator('aside [type="search"]').count(), 0);
    assert.equal(await p.locator('[data-viz="treemap"]').count(), 1);
    assert.equal(await p.locator('[data-chart]').count(), 0);
    checks++;
    await p.close();
  }
  console.log(
    `PASS: ${checks} Atlas chart interactions; cumulative/daily values, comparison, donut, branches, calendar, treemap, scatter and source-filtered tooltips.`,
  );
} finally {
  await b.close();
}
