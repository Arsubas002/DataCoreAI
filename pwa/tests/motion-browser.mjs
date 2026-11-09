import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  serviceWorkers: "block",
});
const page = await context.newPage();
const base = process.env.BASE_URL || "http://127.0.0.1:8080";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const settled = () =>
  page.waitForFunction(() => {
    const dialog = document.querySelector("dialog");
    return (
      dialog.open &&
      Math.abs(new DOMMatrix(getComputedStyle(dialog).transform).m42) < 0.001
    );
  });
const position = () =>
  page
    .locator("dialog")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
try {
  await page.clock.install({ time: new Date("2026-11-09T12:00:00Z") });
  await page.goto(base + "/#productos");
  await page.locator("[data-product]").first().click();
  await settled();
  let handle = await page.locator(".sheet-handle").boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 10);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 95, {
    steps: 8,
  });
  assert.ok(
    Math.abs((await position()) - 85) < 2,
    "sheet follows the pointer 1:1",
  );
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 45, {
    steps: 8,
  });
  assert.ok(
    Math.abs((await position()) - 35) < 2,
    "drag reverses without a jump",
  );
  await page.mouse.up();
  await settled();

  // Inspect a closing spring between frames, then grab its presented position.
  // Pausing avoids browser-driver round trips missing a rapidly moving hit target.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.locator("#sheet-close").click();
  await page.clock.runFor(32);
  const closingPosition = await position();
  assert.ok(closingPosition > 0);
  handle = await page.locator(".sheet-handle").boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 10);
  await page.mouse.down();
  assert.ok(Math.abs((await position()) - closingPosition) < 0.5);
  await page.mouse.move(handle.x + handle.width / 2, handle.y - 80, {
    steps: 5,
  });
  await page.mouse.up();
  await page.clock.resume();
  await settled();
  assert.ok(
    await page.locator("dialog").isVisible(),
    "closing can be reversed",
  );

  // A deliberate downward flick projects its endpoint and dismisses.
  handle = await page.locator(".sheet-handle").boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 10);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 330, {
    steps: 10,
  });
  await page.mouse.up();
  await page.locator("dialog").waitFor({ state: "hidden" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("[data-product]").first().click();
  assert.ok(
    Math.abs(await position()) < 0.5,
    "reduced motion opens without travel",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").isVisible(), false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 9 motion checks; direct tracking, reversal, presented position, interrupted closing, flick dismissal, reduced motion, Escape and no JS errors.",
  );
} finally {
  await browser.close();
}
