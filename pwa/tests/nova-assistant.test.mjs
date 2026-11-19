import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, comparePeriods, insights } from '../js/nova-analysis.js';
import { createHandler, reply } from '../../api/assistant.mjs';

const result = value => Response.json({ choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) } }] });
const prepared = {
  intent: 'lookup',
  queries: [{ group: 'month', metric: 'net', view: 'line', filters: { category: ['Moda', 'Deportes'] } }],
};
const report = 'Hallazgos: comparación de Moda y Deportes. Cálculos: ventas agrupadas por mes.';

function provider(...outputs) {
  const calls = [];
  return {
    calls,
    fetcher: async (url, request) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      assert.equal(request.headers.Authorization, 'Bearer test-key');
      assert.ok(calls.length < outputs.length, 'la investigación debe tener un número limitado de llamadas');
      calls.push(JSON.parse(request.body));
      return result(outputs[calls.length - 1]);
    },
  };
}

const prompt = call => call.messages.filter(message => message.role === 'system').map(message => message.content).join('\n');

test('consulta abierta con errores y seguimiento: transmite los turnos y usa la evidencia comprobada', async () => {
  const { calls, fetcher } = provider(prepared, report);
  const history = [
    { role: 'user', content: 'Kontrasta las bentas de Moda y Deportes' },
    { role: 'assistant', content: 'Comparé Moda y Deportes.' },
  ];
  const outcome = await reply({ message: '¿Y cómo cambiaron mes por mes?', history }, {
    key: 'test-key', fetcher,
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].messages.slice(1, 3), history);
  assert.equal(calls[0].messages.at(-1).content, '¿Y cómo cambiaron mes por mes?');
  assert.match(prompt(calls[1]), /"name"\s*:\s*"2025-02"/);
  assert.deepEqual(outcome.artifacts[0].rows, analyze(prepared.queries[0]).rows);
  assert.deepEqual(calls[0].response_format, { type: 'json_object' });
  assert.equal(calls[1].response_format, undefined);
  assert.deepEqual(outcome.sections, [{ kind: 'answer', text: report }]);
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
  assert.equal(insights().length, 4);
  assert.throws(() => analyze({ filters: { category: ['Inexistente'] } }));
  assert.throws(() => analyze({ group: 'stock' }));
  assert.throws(() => analyze({ change: 1000 }));
});

test('el modelo no obtiene herramientas de escritura y las consultas sencillas omiten gráficos', async () => {
  const noChart = {
    intent: 'lookup',
    queries: [{ group: 'total', metric: 'units', filters: { product: ['  lampara led smart  '] } }],
  };
  const { calls, fetcher } = provider(noChart, 'La fuente muestra las unidades vendidas.');
  const output = await reply({ message: '¿Cuántas lámparas LED Smart se vendieron?' }, {
    key: 'test-key', fetcher,
  });
  assert.deepEqual(output.artifacts, []);
  assert.equal(calls.length, 2);
});

test('el análisis causal revisa las cifras y añade una consulta de desglose antes de redactar', async () => {
  const trend = { group: 'month', metric: 'net', view: 'line' };
  const compare = { tool: 'compare_periods', periods: ['2025-01', '2025-03'], groups: ['category', 'channel'] };
  const { calls, fetcher } = provider(
    { intent: 'analysis', queries: [trend] },
    { status: 'expand', queries: [compare] },
    'La diferencia observada se desglosa por categoría y canal [E2]. El archivo no identifica la causa.',
  );
  const input = { message: '¿Qué explica la diferencia de enero a marzo? Muéstrame la tendencia y los aportes por canal.' };
  const response = await reply(input, { key: 'test-key', fetcher });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[1].response_format, { type: 'json_object' });
  assert.match(prompt(calls[1]), /"name"\s*:\s*"2025-01"/);
  assert.equal(calls[2].response_format, undefined);
  const months = analyze(trend).rows;
  assert.match(prompt(calls[2]), new RegExp('"netDelta"\\s*:\\s*' + (months.at(-1).net - months[0].net)));
  assert.match(prompt(calls[2]), /"contributions"\s*:/);
  assert.deepEqual(response.artifacts.find(artifact => artifact.view === 'line').rows, months);
  const evidence = response.artifacts.find(artifact => artifact.kind === 'period_comparison');
  assert.equal(evidence?.evidenceId, 'E2');
  assert.deepEqual(evidence.contributions, comparePeriods(compare).contributions);
});

test('una consulta inválida activa revisión y no se convierte en un total por defecto', async () => {
  const { calls, fetcher } = provider(
    { intent: 'lookup', queries: [{ tool: 'write', group: 'total', view: 'kpi' }] },
    { status: 'limited', queries: [] },
    'La fuente no permite modificar el inventario.',
  );
  const response = await reply({ message: 'Actualiza stock' }, { key: 'test-key', fetcher });
  assert.equal(calls.length, 3);
  assert.deepEqual(response.artifacts, []);
  assert.doesNotMatch(prompt(calls[2]), /74908725/);
});

test('una intención fuera de la cobertura no fuerza una consulta a ventas', async () => {
  const { calls, fetcher } = provider(
    { intent: 'unavailable', queries: [] },
    'No hay registros de costos ni existencias en el archivo.',
  );
  const response = await reply({ message: '¿Qué margen dejó cada tienda y cuánto stock queda?' }, { key: 'test-key', fetcher });
  assert.equal(calls.length, 2);
  assert.deepEqual(response.artifacts, []);
  assert.doesNotMatch(prompt(calls[1]), /74908725/);
});

test('un subconjunto sin registros requiere revisión y conserva el alcance', async () => {
  const query = { group: 'month', view: 'line', filters: { category: ['Moda'], product: ['Lámpara LED Smart'] } };
  assert.equal(analyze(query).matches, 0);
  const { calls, fetcher } = provider(
    { intent: 'lookup', queries: [query] },
    { status: 'limited', queries: [] },
    'La combinación solicitada no tiene registros en la fuente.',
  );
  const response = await reply({ message: '¿Cuánto vendió la Lámpara LED Smart en Moda?' }, { key: 'test-key', fetcher });
  assert.equal(calls.length, 3);
  assert.deepEqual(response.artifacts, []);
  assert.match(prompt(calls[2]), /"status"\s*:\s*"limited"/);
  assert.doesNotMatch(prompt(calls[2]), /74908725/);
});

test('una respuesta analítica debe citar evidencia de la consulta que se ejecutó', async () => {
  const query = { tool: 'compare_periods', periods: ['2025-01', '2025-02'] };
  const { calls, fetcher } = provider(
    { intent: 'analysis', queries: [query] },
    { status: 'ready', queries: [] },
    'Una conclusión con una fuente inexistente [E99].',
    'La variación calculada se puede comprobar por período [E1].',
  );
  const response = await reply({ message: '¿Qué impulsó la variación de enero a febrero?' }, { key: 'test-key', fetcher });
  assert.equal(calls.length, 4);
  assert.doesNotMatch(response.sections[0].text, /E99/);
  assert.match(response.sections[0].text, /\[E1\]/);
  assert.equal(response.artifacts[0].evidenceId, 'E1');
});

test('una revisión descarta el alcance incorrecto sin reutilizar su referencia', async () => {
  const initial = { group: 'month', filters: { category: ['Deportes'] } };
  const replacement = { group: 'month', filters: { category: ['Moda'] } };
  const { calls, fetcher } = provider(
    { intent: 'analysis', queries: [initial] },
    { status: 'expand', discard: ['E1'], queries: [replacement] },
    'La evolución de Moda se comprueba en los datos mensuales [E2].',
  );
  const response = await reply({ message: '¿Qué patrón hay mes a mes en Moda?' }, { key: 'test-key', fetcher });
  assert.equal(calls.length, 3);
  assert.doesNotMatch(prompt(calls[2]), /"evidenceId"\s*:\s*"E1"/);
  assert.deepEqual(response.artifacts.map(({ evidenceId, filters }) => [evidenceId, filters]), [['E2', replacement.filters]]);
});

test('las contribuciones y el recuento y ticket explican aritméticamente el cambio neto', () => {
  const periods = ['2025-01', '2025-03'];
  const scope = { category: ['Moda'], month: ['2025-02'] };
  const comparison = comparePeriods({ periods, groups: ['product', 'channel'] }, scope);
  const [baseline, current] = periods.map(month => analyze({ filters: { category: ['Moda'], month: [month] } }).rows[0]);
  assert.equal(comparison.coverage, 'comparable');
  assert.deepEqual(comparison.filters, { category: ['Moda'] });
  assert.equal(comparison.netDelta, current.net - baseline.net);
  assert.equal(comparison.drivers.orderCountEffect + comparison.drivers.averageTicketEffect, comparison.netDelta);
  for (const rows of Object.values(comparison.contributions)) {
    assert.equal(rows.reduce((sum, row) => sum + row.netDelta, 0), comparison.netDelta);
  }
  const missing = comparePeriods({ periods, filters: { category: ['Moda'], product: ['Lámpara LED Smart'] } });
  assert.equal(missing.coverage, 'no_matches');
  assert.equal(missing.netDelta, null);
  assert.equal(missing.drivers, null);
  assert.throws(() => comparePeriods({ periods: ['2025-01', '2025-04'] }));
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

test('la respuesta vacía se identifica por etapa y sus diagnósticos omiten contenido y credenciales', async () => {
  let attempt = 0;
  const entries = [];
  const response = await send({
    env: { DATACORE_ASSISTANT_ENABLED: '1', GROQ_API_KEY: 'test-key' },
    fetcher: async () => result(attempt++ === 0 ? prepared : ''),
    logger: { warn: (...args) => entries.push(args) },
  }, { message: 'consulta privada de prueba' }, { socket: { remoteAddress: '127.0.0.2' } });
  assert.equal(response.code, 502);
  assert.match(response.payload.message, /no generó texto/);
  assert.deepEqual(entries, [['datacore.assistant', { status: 502, stage: 'answer', reason: 'empty_content' }]]);
});

test('volumen, descuentos y participaciones se calculan en el servidor', () => {
  const baseline = analyze({}).rows[0];
  const volume = analyze({ quantityChange: 20 });
  assert.equal(volume.rows[0].scenario, Math.round(baseline.net * 1.2));
  const discount = analyze({ discountRate: 15 });
  assert.equal(discount.rows[0].scenario, 65860125);
  assert.equal(discount.scenario.discountRate, 15);
  const distribution = analyze({ group: 'category', view: 'distribution' }).rows;
  assert.ok(Math.abs(distribution.reduce((sum, row) => sum + row.sharePct, 0) - 100) < 1e-9);
  assert.throws(() => analyze({ discountRate: -1 }));
});
