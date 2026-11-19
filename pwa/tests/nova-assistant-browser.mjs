import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createHandler } from '../../api/assistant.mjs';

const root = new URL('../../public-demo/', import.meta.url);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const requests = [];
const provider = async (_url, request) => {
  const { messages } = JSON.parse(request.body);
  await new Promise(resolve => setTimeout(resolve, 160));
  const question = messages.at(-1).content;
  if (question === 'Error controlado') return new Response('', { status: 503 });
  const waitingForPlan = messages[0].content.includes('planificador');
  const data = waitingForPlan
    ? { queries: [{ group: 'month', metric: 'net', view: 'line', filters: { category: ['Moda'] } }] }
    : { facts: 'La serie muestra las ventas netas de Moda.', recommendations: 'Contrasta el cambio por canal.' };
  return Response.json({ choices: [{ message: { content: JSON.stringify(data) } }] });
};
const api = createHandler({ env: { DATACORE_ASSISTANT_ENABLED: '1', GROQ_API_KEY: 'browser-test' }, fetcher: provider });
const staticFiles = new Set(['index.html', 'nova.css', 'styles.css', 'sw.js', 'icon.svg', 'manifest.webmanifest',
  'js/app.js', 'js/icons.js', 'js/nova-chat.js', 'js/nova-analysis.js', 'js/novaretail-data.js',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png']);
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (path === 'api/assistant') {
    let body = '';
    for await (const part of req) body += part;
    req.body = JSON.parse(body);
    requests.push(req.body);
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    await api(req, res);
    return;
  }
  if (!staticFiles.has(path)) { res.writeHead(404).end(); return; }
  const type = types[path.slice(path.lastIndexOf('.'))];
  if (type) res.setHeader('Content-Type', type);
  res.end(await readFile(new URL(path, root)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.DATACORE_CHROMIUM || undefined });
  for (const width of [1440, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/#asistente');
    await page.getByRole('heading', { name: 'Insights inteligentes' }).waitFor();
    assert.equal(await page.locator('.nova-insights article').count(), 3);
    const input = page.getByRole('textbox', { name: 'Pregunta sobre Nova Retail' });
    await input.fill('¿Qe patrones encuntras en Moda?');
    await input.press('Enter');
    await page.getByText('Analizando la consulta…').waitFor();
    await page.getByText('La serie muestra las ventas netas de Moda.').waitFor();
    await page.getByText('Ver valores').click();
    assert.equal(await page.locator('.nova-chat-artifact tbody tr').count(), 3);
    if (width === 1440) {
      await input.fill('¿Y cuál fue su mejor mes?');
      await page.getByRole('button', { name: 'Enviar mensaje' }).click();
      await page.locator('.nova-message.assistant').nth(1).waitFor();
      assert.equal(requests.at(-1).history[0].content, '¿Qe patrones encuntras en Moda?');
      await input.fill('Error controlado');
      await input.press('Enter');
      await page.getByRole('alert').waitFor();
      assert.equal(await input.inputValue(), 'Error controlado');
      await page.locator('[data-full-period]').first().click();
      await page.getByText('Analizando la consulta…').waitFor();
    }
    await page.getByRole('button', { name: 'Nueva conversación' }).click();
    await page.getByText('¿Qué quieres analizar?').waitFor();
    assert.equal(await page.locator('.nova-message').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    await page.close();
    console.log('Chat validado a ' + width + ' px');
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
