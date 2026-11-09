import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const output = process.env.ARTIFACTS_DIR || '/tmp/datacore-v2';
await mkdir(output, { recursive: true });
try {
  for (const [device, viewport] of [
    ['iphone15', { width: 393, height: 852 }],
    ['desktop', { width: 1440, height: 1000 }],
  ]) {
    const context = await browser.newContext({
        viewport,
        serviceWorkers: 'block',
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
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
      await page.screenshot({ path: `${output}/${device}-${route}.png` });
      if (route === 'inicio') {
        await page.locator('#global-search').fill('stock');
        await page.screenshot({ path: `${output}/${device}-search.png` });
        await page.locator('#search-clear').click();
        const theme = await page.locator('html').getAttribute('data-theme');
        await page
          .getByRole('button', {
            name:
              theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro',
          })
          .click();
        await page.screenshot({
          path: `${output}/${device}-${theme === 'dark' ? 'light' : 'dark'}.png`,
        });
        await page
          .getByRole('button', {
            name:
              theme === 'dark' ? 'Activar modo oscuro' : 'Activar modo claro',
          })
          .click();
      }
    }
    await context.close();
  }
  console.log(
    `Screenshots for all six sections, search and dark mode: ${output}`,
  );
} finally {
  await browser.close();
}
