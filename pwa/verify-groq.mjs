// Run explicitly in a server environment with the deployment's Groq variables.
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createHandler } from '../api/assistant.mjs';
import { analyze, comparePeriods } from './js/nova-analysis.js';

async function observedFetch(url, options) {
  const response = await fetch(url, options);
  const stage = JSON.parse(options.body).response_format?.json_schema?.name;
  if (stage && response.ok) {
    const payload = await response.clone().json().catch(() => null);
    try {
      const decision = JSON.parse(payload?.choices?.[0]?.message?.content ?? '');
      console.log('GROQ_LIVE_DECISION', stage, JSON.stringify({
        intent: decision.intent,
        status: decision.status,
        queries: Array.isArray(decision.queries) ? decision.queries.map(query => ({
          tool: query?.tool, group: query?.group, metric: query?.metric,
          periods: query?.periods, groups: query?.groups,
          filterKeys: Object.entries(query?.filters ?? {}).filter(([, value]) => value !== null).map(([key]) => key),
        })) : [],
        discardCount: Array.isArray(decision.discard) ? decision.discard.length : 0,
      }));
    } catch {
      console.log('GROQ_LIVE_DECISION_UNREADABLE', stage);
    }
  }
  return response;
}

async function ask(message, history = [], retries = 2) {
  const result = {};
  const response = {
    setHeader(key, value) { if (key === 'Retry-After') result.retryAfter = Number(value); },
    status(code) { result.code = code; return this; },
    json(body) { result.body = body; },
  };
  await createHandler({ fetcher: observedFetch })({ method: 'POST', headers: {}, body: { message, history } }, response);
  if (result.code === 429 && retries > 0) {
    const seconds = Math.min(120, Math.max(61, result.retryAfter || 0));
    console.log('GROQ_LIVE_RATE_LIMIT_RETRY', seconds);
    await delay(seconds * 1000);
    return ask(message, history, retries - 1);
  }
  if (result.code !== 200) throw new Error('Groq live verification HTTP ' + result.code + ' ' + (result.body?.error ?? ''));
  assert.ok(result.body.sections[0].text.length > 30, 'Groq returned a non-empty answer');
  return result.body;
}

const probes = {
  async comparisonAndFollowup() {
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

  },
  async scenario() {
    const scenario = await ask('¿Cuánto ingreso neto tendríamos con 20 % más de volumen manteniendo los precios y descuentos? Muestra una tabla con el total.');
    const hypothetical = scenario.artifacts.find(item => item.scenario?.quantityChange === 20);
    assert.ok(hypothetical, 'scenario_evidence');
    assert.equal(hypothetical.rows[0].scenario, analyze({ quantityChange: 20 }).rows[0].scenario, 'scenario_total');
    console.log('GROQ_LIVE_SCENARIO_OK');
  },
  async diagnostic() {
    const diagnostic = await ask('Me dijeron que las ventas netas cayeron de febrero a marzo. ¿Es cierto? Contrasta las cifras, los aportes por categoría y canal y el cambio en transacciones y ticket. Dime qué puede explicar la fuente.');
    const actual = diagnostic.artifacts.find(item => item.kind === 'period_comparison'
      && item.contributions.category && item.contributions.channel);
    const direction = /aument|subi|creci|increment|repunt|fue mayor/i.test(diagnostic.sections[0].text);
    const citation = !!actual && diagnostic.sections[0].text.includes('[' + actual.evidenceId + ']');
    console.log('GROQ_LIVE_DIAGNOSTIC_CHECK', JSON.stringify({
      artifacts: diagnostic.artifacts.map(item => item.kind === 'period_comparison'
        ? { kind: item.kind, periods: item.periods, dimensions: Object.keys(item.contributions) }
        : { kind: item.kind, group: item.group, metric: item.metric }),
      direction, citation,
    }));
    const comparisonMonths = comparePeriods({ periods: ['2025-02', '2025-03'], groups: ['category', 'channel'] });
    assert.ok(actual?.contributions.category && actual.contributions.channel, 'Period analysis includes category and channel');
    assert.deepEqual(actual.periods, comparisonMonths.periods);
    assert.equal(actual.netDelta, comparisonMonths.netDelta);
    assert.equal(actual.drivers.orderCountEffect + actual.drivers.averageTicketEffect, actual.netDelta);
    assert.ok(citation, 'Conclusion cites the comparison');
    assert.ok(direction, 'Conclusion corrects the false premise');
    console.log('GROQ_LIVE_DIAGNOSTIC_OK');

  },
  async rankings() {
    const ranks = await ask('De los productos, ¿qué artículo ocupa el segundo lugar por unidades y cuál el segundo por ingresos netos? Explica por qué los dos rankings pueden diferir.');
    const checks = { units: 'Banda de Resistencia', net: 'Cafetera Express' };
    for (const [metric, name] of Object.entries(checks)) {
      const evidence = ranks.artifacts.find(item => item.group === 'product' && item.metric === metric);
      assert.equal(evidence?.rows[1]?.name, name);
      assert.ok(ranks.sections[0].text.includes(name), 'Conclusion uses the correct ranking position');
    }
    console.log('GROQ_LIVE_RANKINGS_OK');

  },
  async limits() {
    const unavailable = await ask('¿Qué margen de beneficio dejó cada tienda en abril y cuánto stock quedó? Si falta información, dime exactamente qué falta.');
    assert.equal(unavailable.artifacts.length, 0, 'Unavailable data does not get substituted');
    assert.match(unavailable.sections[0].text, /costos|costes/i);
    assert.match(unavailable.sections[0].text, /stock|inventario|existencias/i);
    assert.match(unavailable.sections[0].text, /abril|marzo/i);
    assert.doesNotMatch(unavailable.sections[0].text, /\$\s*\d/);
    console.log('GROQ_LIVE_LIMITS_OK');

  },
};

const selected = new Set(process.argv.slice(2));
for (const [phase, run] of Object.entries(probes)) {
  if (selected.size && !selected.has(phase)) continue;
  try {
    await run();
  } catch (error) {
    // Print only test metadata. Assertion operands and Groq content stay private.
    const detail = ['scenario_evidence', 'scenario_total'].includes(error.message) ? error.message : error.name;
    console.error('GROQ_LIVE_CHECK_FAILED', phase, detail);
    process.exitCode = 1;
  }
}
