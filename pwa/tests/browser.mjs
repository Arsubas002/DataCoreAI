import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:8080",
  artifacts = process.env.ARTIFACTS_DIR || "/tmp/atlas-sql";
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
let checks = 0;
try {
  for (const width of [320, 393, 768, 1440]) {
    const mobile = width < 760,
      context = await browser.newContext({
        viewport: { width, height: width === 393 ? 852 : 1000 },
        serviceWorkers: "block",
      }),
      page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const section of [
      "inicio",
      "productos",
      "clientes",
      "ventas",
      "inventario",
      "reportes",
      "asistente",
    ]) {
      await page.goto(base + "/#" + section);
      await page.locator("#view h1").waitFor();
      assert.equal(await page.locator('input[type="search"]').count(), 1);
      assert.equal(await page.locator('aside input[type="search"]').count(), 0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${width}/${section} overflow`,
      );
      checks++;
      if (section === "inicio") {
        assert.match(await page.locator(".folio-number").textContent(), /20/);
        assert.match(await page.locator(".metric-ribbon").textContent(), /336/);
        assert.equal(await page.locator(".schema-node").count(), 6);
        checks++;
        await page.locator("[data-source-info]").first().click();
        assert.match(
          await page.locator("dialog").textContent(),
          /No recuperadas/,
        );
        await page
          .getByRole("button", { name: "Cerrar panel", exact: true })
          .click();
        await page.locator("dialog").waitFor({ state: "hidden" });
        checks++;
        await page.getByRole("button", { name: "Activar modo claro" }).click();
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          "light",
        );
        await page.reload();
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          "light",
        );
        await page.getByRole("button", { name: "Activar modo oscuro" }).click();
        checks++;
      }
      if (section === "productos") {
        assert.equal(await page.locator(".product").count(), 20);
        await page
          .getByRole("button", { name: "Tecnología", exact: true })
          .click();
        assert.equal(await page.locator(".product").count(), 5);
        checks++;
        await page.locator("[data-compare]").nth(0).check();
        await page.locator("[data-compare]").nth(1).check();
        await page.locator("#compare-open").click();
        assert.match(
          await page.locator("dialog").textContent(),
          /Existencias del script/,
        );
        await page.keyboard.press("Escape");
        await page.locator("dialog").waitFor({ state: "hidden" });
        checks++;
        await page.locator("#global-search").fill("DEMO-002");
        await page.locator('[data-search-product="DEMO-002"]').click();
        assert.match(
          await page.locator("dialog").textContent(),
          /Mouse óptico/,
        );
        assert.match(
          await page.locator("dialog").textContent(),
          /No se conoce su ProductoID/,
        );
        await page.locator("#sheet-close").click();
        await page.locator("dialog").waitFor({ state: "hidden" });
        checks++;
      }
      if (section === "clientes") {
        assert.equal(await page.locator(".client-row").count(), 10);
        await page.getByRole("button", { name: "A", exact: true }).click();
        assert.equal(await page.locator(".client-row").count(), 1);
        checks++;
        await page.locator(".client-row").click();
        assert.match(await page.locator("dialog").textContent(), /Ana Torres/);
        assert.equal(
          await page.locator("dialog").getByText("ana@example.com").count(),
          0,
        );
        await page.locator("#sheet-close").click();
        await page.locator("dialog").waitFor({ state: "hidden" });
        checks++;
      }
      if (section === "ventas") {
        assert.equal(await page.locator("#branch").count(), 0);
        assert.equal(await page.locator("[data-chart]").count(), 0);
        assert.match(
          await page.locator(".history-gap").textContent(),
          /no significa.*cero ventas/,
        );
        checks++;
        await page.route("**/api/data?resource=status", (r) =>
          r.fulfill({
            status: 401,
            contentType: "application/json",
            body: '{"error":{"code":"authentication_required"}}',
          }),
        );
        await page.locator("[data-check-backend]").click();
        await page.waitForFunction(() =>
          document
            .querySelector(".backend-status")
            .textContent.includes("sesión autorizada"),
        );
        checks++;
      }
      if (section === "inventario") {
        assert.equal(await page.locator(".inventory-row").count(), 20);
        assert.equal(await page.locator(".replenishment-item").count(), 6);
        await page
          .getByRole("button", { name: "Por reponer", exact: true })
          .click();
        assert.equal(await page.locator(".inventory-row").count(), 6);
        checks++;
      }
      if (section === "reportes") {
        await page.selectOption("#report-category", "Papelería");
        assert.match(
          await page.locator(".report-lead").textContent(),
          /150 unidades/,
        );
        assert.match(
          await page.locator(".report-lead").textContent(),
          /5 referencias/,
        );
        checks++;
        const waitDownload = page.waitForEvent("download");
        await page.locator("#export-csv").click();
        const d = await waitDownload,
          path = await d.path(),
          csv = await readFile(path, "utf8");
        assert.equal(csv.split("\r\n").length, 6);
        assert.ok(csv.includes("DEMO-006"));
        assert.ok(!csv.includes("DEMO-001"));
        checks++;
        await page.locator(".donut-legend button").nth(1).click();
        assert.match(
          await page.locator('[data-viz="stock-donut"] output').textContent(),
          /150 unidades/,
        );
        checks++;
      }
      if (section === "asistente") {
        await page
          .locator("#chat-input")
          .fill("¿Qué productos deberían reponerse?");
        assert.equal(await page.locator(".suggestions").isVisible(), false);
        await page.getByRole("button", { name: "Enviar pregunta" }).click();
        await page.locator(".message.assistant").waitFor();
        assert.match(
          await page.locator(".message.assistant").textContent(),
          /Mouse óptico: 4/,
        );
        checks++;
        await page.locator("#chat-input").fill("¿Qué sucursal vende más?");
        await page.getByRole("button", { name: "Enviar pregunta" }).click();
        await page.locator(".message.assistant").nth(1).waitFor();
        assert.match(
          await page.locator(".message.assistant").nth(1).textContent(),
          /no contiene una tabla o columna de sucursal/,
        );
        checks++;
        await page.locator("#chat-input").fill("<img src=x onerror=alert(1)>");
        await page.getByRole("button", { name: "Enviar pregunta" }).click();
        assert.equal(await page.locator(".message img").count(), 0);
        checks++;
      }
      if ([393, 1440].includes(width)) {
        await page.evaluate(() => {
          document.activeElement?.blur();
          window.scrollTo(0, 0);
        });
        await page.screenshot({
          path: `${artifacts}/${section}-${width}.png`,
          fullPage: true,
        });
      }
    }
    if (mobile) {
      await page.locator("#more-nav").click();
      await page
        .locator("dialog")
        .getByRole("link", { name: "Clientes", exact: true })
        .click();
      await page.locator("dialog").waitFor({ state: "hidden" });
      await page.locator(".client-row").first().waitFor();
      assert.match(await page.title(), /Clientes/);
      checks++;
    }
    assert.deepEqual(errors, []);
    checks++;
    await context.close();
  }
  const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.locator(".folio-number").waitFor();
  assert.match(
    await page.locator("#network-status").textContent(),
    /Sin conexión/,
  );
  await page.locator("#more-nav").click();
  await page
    .locator("dialog")
    .getByRole("link", { name: "Clientes", exact: true })
    .click();
  await page.locator(".client-row").first().waitFor();
  assert.equal(await page.locator(".client-row").count(), 10);
  checks++;
  await context.close();
  console.log(
    `PASS: ${checks} browser checks; seven modules, 320/393/768/1440, source boundaries, search, comparison, customers, filters, CSV, chat, themes, keyboard and offline.`,
  );
} finally {
  await browser.close();
}
