// Run explicitly in a server environment with the deployment's Groq variables.
import assert from 'node:assert/strict';
import { createHandler } from '../api/assistant.mjs';
import { analyze } from './js/nova-analysis.js';

async function ask(message, history = []) {
  const result = {};
  const response = {
    setHeader() {},
    status(code) { result.code = code; return this; },
    json(body) { result.body = body; },
  };
  await createHandler()({ method: 'POST', headers: {}, body: { message, history } }, response);
  if (result.code !== 200) throw new Error('Groq live verification HTTP ' + result.code + ' ' + (result.body?.error ?? ''));
  assert.ok(result.body.sections[0].text.length > 30, 'Groq returned a non-empty answer');
  return result.body;
}

try {
  const first = 'Quiero una gráfica de barras con el total neto de Moda y Deportes por separado. ¿Cuál de las dos vendió más?';
  const comparison = await ask(first);
  const filters = { category: ['Moda', 'Deportes'] };
  const levels = comparison.artifacts.find(artifact => artifact.group === 'category' && artifact.view === 'bar');
  assert.ok(levels, 'Comparison includes a category bar chart');
  const expected = analyze({ group: 'category', filters }).rows;
  assert.deepEqual(levels.rows.map(({ name, net }) => [name, net]).sort(), expected.map(({ name, net }) => [name, net]).sort());
  console.log('GROQ_LIVE_COMPARISON_OK');

  const followup = await ask('¿Y cuánto vendió solo la ganadora en marzo? Muéstralo en una tarjeta KPI.', [
    { role: 'user', content: first },
    { role: 'assistant', content: comparison.sections[0].text.slice(0, 2400) },
  ]);
  const followupEvidence = followup.artifacts.find(item => item.view === 'kpi' && item.filters.month?.includes('2025-03'));
  assert.ok(followupEvidence?.filters.category?.length === 1 && followupEvidence.filters.category[0] === expected[0].name,
    'Follow-up retains the winning category');
  assert.equal(followupEvidence.rows.reduce((sum, item) => sum + item.net, 0),
    analyze({ filters: { category: [expected[0].name], month: ['2025-03'] } }).rows[0].net);
  console.log('GROQ_LIVE_FOLLOWUP_OK');

  const scenario = await ask('¿Cuánto ingreso neto tendríamos con 20 % más de volumen manteniendo los precios y descuentos? Muestra una tabla con el total.');
  const hypothetical = scenario.artifacts.find(item => item.scenario?.quantityChange === 20);
  assert.ok(hypothetical, 'Volume scenario is backed by a validated calculation');
  assert.equal(hypothetical.rows[0].scenario, analyze({ quantityChange: 20 }).rows[0].scenario);
  console.log('GROQ_LIVE_SCENARIO_OK');
} catch (error) {
  // Never print provider text, request bodies, environment contents, or assertion operands.
  console.error('GROQ_LIVE_CHECK_FAILED', error.name === 'AssertionError' ? 'evidence_mismatch' : error.message);
  process.exitCode = 1;
}
