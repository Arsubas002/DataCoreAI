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
    });
    for (const route of [
      "inicio",
      "productos",
      "clientes",
      "ventas",
      "inventario",
      "reportes",
      "asistente",
    ]) {
      await p.goto(
        (process.env.BASE_URL || "http://127.0.0.1:8080") + "/#" + route,
      );
      await p.waitForFunction((r) => document.body.dataset.page === r, route);
      const input = p.locator("#global-search");
      assert.ok(await input.isVisible());
      const box = await input.boundingBox();
      assert.ok(box.y >= 0);
      assert.equal(await p.locator("aside input").count(), 0);
      checks++;
      await input.fill("stock DEMO-002");
      await p.keyboard.press("ArrowDown");
      assert.equal(
        await p.evaluate(() => document.activeElement.dataset.searchProduct),
        "DEMO-002",
      );
      await p.keyboard.press("Escape");
      assert.equal(await p.locator("#global-results").isVisible(), false);
      checks++;
      await input.fill("Ana");
      await p.locator('[data-search-client="DEMO-C001"]').click();
      assert.match(await p.locator("dialog").textContent(), /Ana Torres/);
      await p
        .getByRole("button", { name: "Cerrar panel", exact: true })
        .click();
      checks++;
    }
    await p.close();
  }
  console.log(
    `PASS: ${checks} search/navigation checks across seven sections and mobile/desktop, including original customer lookup.`,
  );
} finally {
  await b.close();
}
