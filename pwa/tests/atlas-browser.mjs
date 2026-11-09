import { chromium } from "playwright";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
let checks = 0;
try {
  for (const width of [393, 1440]) {
    const p = await b.newPage({
        viewport: { width, height: 1000 },
        serviceWorkers: "block",
        reducedMotion: "reduce",
      }),
      base = process.env.BASE_URL || "http://127.0.0.1:8080";
    await p.goto(base);
    await p.locator(".folio-number").waitFor();
    assert.equal(await p.locator(".schema-node").count(), 6);
    assert.equal(await p.locator(".schema-node.recovered").count(), 3);
    assert.equal(await p.locator(".schema-node.pending").count(), 3);
    checks++;
    assert.deepEqual(
      await p.evaluate(() =>
        ["--paper", "--accent", "--ink"].map((k) =>
          getComputedStyle(document.documentElement).getPropertyValue(k).trim(),
        ),
      ),
      ["#141613", "#d1ed89", "#eeeee4"],
    );
    checks++;
    await p.goto(base + "/#reportes");
    await p.locator(".donut-legend button").nth(0).click();
    assert.match(
      await p.locator('[data-viz="stock-donut"] output').textContent(),
      /54 unidades/,
    );
    checks++;
    await p.locator(".treemap button").first().click();
    assert.match(
      await p.locator('[data-viz="stock-map"] output').textContent(),
      /unidades/,
    );
    checks++;
    await p
      .locator(".scatter-plot")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    await p.locator(".scatter-field button").first().click();
    assert.match(
      await p.locator('[data-viz="price-stock"] output').textContent(),
      /Teclado USB/,
    );
    checks++;
    await p.selectOption("#report-category", "Hogar");
    assert.match(await p.locator(".report-lead").textContent(), /55 unidades/);
    assert.equal(await p.locator(".scatter-field button").count(), 5);
    checks++;
    await p.getByRole("button", { name: "Activar modo claro" }).click();
    assert.deepEqual(
      await p.evaluate(() =>
        ["--paper", "--accent", "--ink"].map((k) =>
          getComputedStyle(document.documentElement).getPropertyValue(k).trim(),
        ),
      ),
      ["#f3f0e8", "#4c601b", "#24291f"],
    );
    checks++;
    await p.close();
  }
  console.log(
    `PASS: ${checks} Atlas chart/source/palette checks; approved colors, honest unknowns and original quantities.`,
  );
} finally {
  await b.close();
}
