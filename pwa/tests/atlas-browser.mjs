import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const base = process.env.BASE_URL || "http://127.0.0.1:8080";
let checks = 0;
try {
  for (const width of [393, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 393 ? 852 : 1000 },
      serviceWorkers: "block",
      reducedMotion: "reduce",
    });
    await page.goto(base);
    await page.locator(".stock-display").waitFor();
    assert.equal(
      await page.locator(".stock-display>strong").textContent(),
      "336",
    );
    await page.locator(".health-legend button").first().click();
    assert.match(
      await page.locator('[data-viz="health"] output').textContent(),
      /14 de 20/,
    );
    checks++;
    for (const [theme, bg] of [
      ["dark", "rgb(13, 23, 38)"],
      ["light", "rgb(242, 245, 250)"],
    ]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      assert.deepEqual(
        await page.evaluate(() =>
          ["petroleum", "white", "violet", "turquoise"].map((name) =>
            getComputedStyle(document.documentElement)
              .getPropertyValue("--brand-" + name)
              .trim(),
          ),
        ),
        ["#0d1726", "#f2f5fa", "#7659e8", "#24c9c0"],
      );
      // Read the settled body color after the short theme color transition.
      await page.waitForFunction(
        (color) => getComputedStyle(document.body).backgroundColor === color,
        bg,
      );
      checks++;
    }
    await page.goto(base + "/#reportes");
    await page.waitForFunction(() => document.body.dataset.page === "reportes");
    assert.equal(
      await page.locator(".report-lead>div:first-child>strong").textContent(),
      "336",
    );
    await page.locator(".donut-legend button").first().click();
    assert.match(
      await page.locator('[data-viz="stock-donut"] output').textContent(),
      /54 unidades/,
    );
    checks++;
    await page.locator(".treemap button").first().click();
    assert.match(
      await page.locator('[data-viz="stock-map"] output').textContent(),
      /80 unidades/,
    );
    checks++;
    await page.locator('[data-report-metric="value"]').click();
    await page.locator(".treemap-key button").first().click();
    assert.match(
      await page.locator('[data-viz="stock-map"] output').textContent(),
      /1,068.00.*catálogo/,
    );
    checks++;
    await page.selectOption("#report-category", "Papelería");
    assert.equal(
      await page.locator(".report-lead>div:first-child>strong").textContent(),
      "150",
    );
    assert.match(await page.locator(".report-lead").textContent(), /582.50/);
    assert.equal(await page.locator(".scatter-field button").count(), 5);
    checks++;
    await page.locator(".scatter-field button").first().click();
    assert.match(
      await page.locator('[data-viz="price-stock"] output').textContent(),
      /Cuaderno cuadriculado.*8.50.*40 unidades/,
    );
    checks++;
    await page.goto(base + "/#inventario");
    await page.waitForFunction(
      () => document.body.dataset.page === "inventario",
    );
    assert.equal(await page.locator(".matrix-cell").count(), 20);
    assert.equal(await page.locator(".matrix-cell.low").count(), 5);
    assert.equal(await page.locator(".matrix-cell.empty").count(), 1);
    checks++;
    await page.locator(".matrix-cell.empty").click();
    assert.match(await page.locator("dialog").textContent(), /Bloc de notas/);
    checks++;
    await page.close();
  }
  console.log(
    `PASS: ${checks} chart/palette checks; original four colors in both themes, stock health, valuation, shared filters, treemap, scatter and interactive inventory.`,
  );
} finally {
  await browser.close();
}
