import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, insights } from '../js/nova-analysis.js';
import { createHandler, reply } from '../../api/assistant.mjs';

const result = value => Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
const prepared = { queries: [{ group: 'month', metric: 'net', view: 'line', filters: { category: ['Moda', 'Deportes'] } }] };
const report = { facts: 'Comparación de Moda y Deportes.', calculations: 'Se agruparon las ventas por mes.',
  recommendations: 'Contrastar por canal antes de promover.' };

test('consulta abierta con errores y seguimiento: transmite los turnos y usa la evidencia comprobada', async () => {
  const calls = [];
  const history = [
    { role: 'user', content: 'Kontrasta las bentas de Moda y Deportes' },
    { role: 'assistant', content: 'Comparé Moda y Deportes.' },
  ];
  const outcome = await reply({ message: '¿Y cómo cambiaron mes por mes?', history }, {
    key: 'test-key', fetcher: async (url, request) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      assert.equal(request.headers.Authorization, 'Bearer test-key');
      calls.push(JSON.parse(request.body));
      return result(calls.length === 1 ? prepared : report);
    },
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].messages.slice(1, 3), history);
  assert.equal(calls[0].messages.at(-1).content, '¿Y cómo cambiaron mes por mes?');
  assert.match(calls[1].messages[0].content, /"name":"2025-02","net":/);
  assert.deepEqual(outcome.artifacts[0], analyze(prepared.queries[0]));
  assert.deepEqual(outcome.sections.map(section => section.kind), ['facts', 'calculations', 'recommendations']);
});

test('céntimos conciliados, orden cronológico y escenario de precios sin cambiar demanda', () => {
  const aggregate = analyze({ change: 10 }).rows[0];
  assert.equal(aggregate.net, 74908725);
  assert.equal(aggregate.units, 5001);
  assert.equal(aggregate.orders, 1671);
  assert.equal(aggregate.scenario, 82399564);
  assert.equal(aggregate.delta, 7490839);
  const { rows } = analyze({ group: 'month' });
  assert.deepEqual(rows.map(row => row.name), ['2025-01', '2025-02', '2025-03']);
  assert.equal(rows.reduce((sum, row) => sum + row.net, 0), aggregate.net);
  assert.equal(rows[1].periodChangePct, Math.round((rows[1].net / rows[0].net - 1) * 10000) / 100);
  assert.equal(insights().length, 3);
  assert.throws(() => analyze({ filters: { category: ['Inexistente'] } }));
  assert.throws(() => analyze({ group: 'stock' }));
  assert.throws(() => analyze({ change: 1000 }));
});

test('el modelo no obtiene herramientas de escritura y las consultas sencillas omiten gráficos', async () => {
  const noChart = { queries: [{ group: 'total', filters: { product: ['  lampara led smart  '] } }] };
  let n = 0;
  const output = await reply({ message: '¿Cuántas lámparas LED Smart se vendieron?' }, {
    key: 'test-key', fetcher: async () => result(n++ === 0 ? noChart : { facts: 'La fuente muestra las unidades vendidas.' }),
  });
  assert.deepEqual(output.artifacts, []);
  await assert.rejects(reply({ message: 'Actualiza stock' }, {
    key: 'test-key', fetcher: async () => result({ queries: [{ group: 'stock' }] }),
  }), { status: 502 });
});

async function send(options, body = { message: '¿Qué tendencias detectas?' }, overrides = {}) {
  const response = {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; },
  };
  await createHandler(options)({ method: 'POST', headers: {}, socket: { remoteAddress: '127.0.0.1' }, body, ...overrides }, response);
  return response;
}

test('credenciales ausentes, origen inválido, historial inválido, 429, timeout y errores de proveedor', async () => {
  const env = { DATACORE_ASSISTANT_ENABLED: '1', GROQ_API_KEY: 'test-key' };
  const disabled = await send({ env: {}, fetcher: () => assert.fail('Llamada no autorizada') });
  assert.equal(disabled.code, 503);
  assert.equal(disabled.payload.error, 'groq_key_missing');
  const switchedOff = await send({ env: { GROQ_API_KEY: 'test-key' }, fetcher: () => assert.fail('Llamada no autorizada') });
  assert.equal(switchedOff.code, 503);
  assert.equal(switchedOff.payload.error, 'assistant_disabled');
  assert.equal(disabled.headers['Cache-Control'], 'no-store');
  assert.equal((await send({ env }, { message: 'x', history: [{ role: 'system', content: 'x' }] })).code, 400);
  assert.equal((await send({ env }, undefined, { headers: { 'sec-fetch-site': 'cross-site' } })).code, 403);
  const limited = await send({ env, fetcher: async () => new Response('', { status: 429, headers: { 'retry-after': '12' } }) });
  assert.equal(limited.code, 429);
  assert.equal(limited.headers['Retry-After'], '12');
  assert.equal((await send({ env, fetcher: async () => { throw new DOMException('t', 'TimeoutError'); } })).code, 504);
  const rejected = await send({ env, fetcher: async () => new Response('sensitive provider diagnostics', { status: 401 }) });
  assert.equal(rejected.code, 502);
  assert.match(rejected.payload.message, /rechazó la credencial/);
  assert.doesNotMatch(JSON.stringify(rejected.payload), /sensitive|test-key/);
  const unavailable = await send({
    env: { ...env, GROQ_MODEL: ' unlisted-model ', GROQ_API_KEY: ' test-key ' },
    fetcher: async (_url, request) => {
      assert.equal(request.headers.Authorization, 'Bearer test-key');
      assert.equal(JSON.parse(request.body).model, 'unlisted-model');
      return Response.json({ error: { code: 'model_not_found' } }, { status: 404 });
    },
  });
  assert.equal(unavailable.code, 502);
  assert.match(unavailable.payload.message, /modelo de Groq configurado no está disponible/);
});
