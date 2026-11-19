import { money, num, pct } from './novaretail-data.js';
import { insights } from './nova-analysis.js';

const labels = {
  net: 'Ventas netas', gross: 'Ventas brutas', discount: 'Descuentos', units: 'Unidades',
  orders: 'Transacciones', ticket: 'Ticket medio', price: 'Precio unitario medio',
  scenario: 'Neto simulado', delta: 'Variación',
};
const dimensions = { category: 'Categoría', product: 'Producto', channel: 'Canal', shop: 'Tienda' };
const comparisonMetrics = ['net', 'gross', 'discount', 'orders', 'units', 'ticket'];
const driverLabels = { orderCountEffect: 'Efecto del número de transacciones', averageTicketEffect: 'Efecto del ticket medio' };
const examples = [
  '¿Cómo evolucionaron las ventas?',
  'Compara Moda y Deportes',
  '¿Qué pasa si subimos los precios un 10 %?',
];
const findings = insights();

function provenance(result, esc, defaultScope) {
  const scope = Object.values(result.filters).flat().map(esc).join(' · ');
  const source = result.evidenceId ? `[${esc(result.evidenceId)}] Nova Retail 2025 · ` : '';
  return source + (scope || defaultScope);
}

function comparisonTable(title, headings, rows, esc) {
  return `<div class="nova-table-scroll" tabindex="0" role="region" aria-label="${esc(title)}">
    <table class="nova-table"><thead><tr>${headings.map(value => `<th scope="col">${esc(value)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label, ...values]) => `<tr><th scope="row">${esc(label)}</th>${values.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function comparisonArtifact(result, esc, turnIndex, artifactIndex) {
  const { baseline, current, coverage, periods, contributions, drivers, netDelta, netDeltaPct } = result;
  const source = provenance(result, esc, 'Todas las ventas');
  if (coverage !== 'comparable') {
    return `<section class="nova-chat-artifact"><h3>Comparación mensual</h3><small>${source}</small>
      <p>Al menos uno de los meses seleccionados no tiene registros para estos filtros.</p></section>`;
  }
  const cells = comparisonMetrics.map(metric => {
    const format = ['orders', 'units'].includes(metric) ? num : money;
    return [labels[metric], format(baseline[metric]), format(current[metric])];
  });
  const breakdown = Object.entries(contributions).map(([dimension, rows]) => {
    const label = dimensions[dimension];
    return `<details><summary>Aportes por ${label.toLowerCase()}</summary>
      ${comparisonTable('Aportes por ' + label.toLowerCase(), [label, ...periods, 'Variación'],
        rows.map(row => [row.name, money(row.baselineNet), money(row.currentNet), money(row.netDelta)]), esc)}</details>`;
  }).join('');
  const accounting = drivers ? `<details><summary>Cambios en transacciones y ticket</summary>
    ${comparisonTable('Descomposición del cambio en ventas netas', ['Componente', 'Aporte'],
      Object.entries(driverLabels).map(([key, label]) => [label, money(drivers[key])]), esc)}
    <p>Los aportes descomponen contablemente la variación de las ventas.</p></details>` : '';
  return `<section class="nova-chat-artifact nova-chat-comparison">
    <h3>Comparación mensual</h3>
    <small>${source}</small>
    <div class="nova-chat-comparison-delta"><span>Variación de ventas netas</span>
      <strong>${money(netDelta)}${netDeltaPct === null ? '' : ` · ${pct(netDeltaPct / 100)}`}</strong></div>
    ${comparisonTable('Indicadores por mes', ['Indicador', ...periods], cells, esc)}
    ${breakdown}
    ${accounting}
    <button type="button" class="nova-chat-action" data-export-chat="${turnIndex}:${artifactIndex}">Descargar CSV</button>
  </section>`;
}

function artifact(result, esc, turnIndex, artifactIndex) {
  if (result.kind === 'period_comparison') return comparisonArtifact(result, esc, turnIndex, artifactIndex);
  const { metric, rows, view, scenario, groups } = result;
  const columns = !scenario ? [metric] : ['net', 'scenario', 'delta'];
  const format = value => value == null ? '—' : ['units', 'orders'].includes(metric) ? num(value) : money(value);
  const title = labels[metric];
  const maximum = Math.max(1, ...rows.map(row => row[metric] ?? 0));
  const points = rows.map((row, index) => [
    16 + (rows.length === 1 ? 244 : index * 488 / (rows.length - 1)),
    112 - (row[metric] ?? 0) * 98 / maximum,
  ]);
  const table = `<div class="nova-table-scroll" tabindex="0" role="region" aria-label="Datos de ${esc(title)}">
    <table class="nova-table"><thead><tr><th scope="col">Grupo</th>${columns.map(key => `<th scope="col">${labels[key]}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr><th scope="row">${esc(row.name)}</th>${columns.map(key => `<td>${format(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const distribution = view === 'distribution';
  const chart = view === 'bar' || distribution ? `<div class="nova-bars">${rows.map(row => `<div class="nova-bar-row">
      <div class="nova-bar-top"><span>${esc(row.name)}</span><b>${format(row[metric])}${distribution && row.sharePct !== null ? ` · ${pct(row.sharePct / 100)}` : ''}</b></div>
      <div class="nova-bar-track" aria-hidden="true"><i style="width:${(distribution ? row.sharePct ?? 0 : 100 * (row[metric] ?? 0) / maximum).toFixed(2)}%"></i></div></div>`).join('')}</div>`
    : view === 'line' ? `<svg class="nova-chat-line" viewBox="0 0 520 150" role="img" aria-label="${esc(title)} por fecha. Valores disponibles en la tabla.">
      <path d="M16 112H504" stroke="var(--line)"/>
      <polyline points="${points.map(point => point.join(',')).join(' ')}" stroke="var(--chart)" stroke-width="3" fill="none"/>
      ${points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${points.length > 15 ? 2 : 4}" fill="var(--chart)"/>`).join('')}
      <text x="16" y="138">${esc(rows[0].name)}</text>
      ${rows.length > 1 ? `<text x="504" y="138" text-anchor="end">${esc(rows.at(-1).name)}</text>` : ''}
    </svg>`
    : view === 'kpi' ? `<div class="nova-chat-kpis">${rows.map(row => `<div><span>${esc(row.name)}</span><strong>${format(row[metric])}</strong></div>`).join('')}</div>`
    : '';
  return `<section class="nova-chat-artifact"><h3>${title}</h3>
    <small>${provenance(result, esc, 'Enero–marzo 2025')}${groups > rows.length ? ` · ${rows.length} de ${groups} grupos` : ''}</small>
    ${scenario ? `<p><strong>Escenario hipotético.</strong> ${scenario.change === undefined ? 'Precios constantes.' : `Precios: ${num(scenario.change)} % de variación.`}
      ${scenario.quantityChange === undefined ? 'Volumen constante.' : `Volumen: ${num(scenario.quantityChange)} % de variación con la misma mezcla de productos.`}
      ${scenario.discountRate === undefined ? 'Se mantienen las tasas históricas.' : `Se aplica ${num(scenario.discountRate)} % de descuento a todas las operaciones.`}</p>` : ''}
    ${chart}
    ${view === 'table' || scenario ? table : `<details><summary>Ver valores</summary>${table}</details>`}
    <button type="button" class="nova-chat-action" data-export-chat="${turnIndex}:${artifactIndex}">Descargar CSV</button>
  </section>`;
}

export function chatPage({ chat, pending, error, draft }, { esc, icon }) {
  return `<div class="nova-analyst">
    <section class="nova-chat" aria-label="Conversación comercial">
      <header class="nova-chat-top"><div><h2>Conversación</h2><p>Nova Retail · Enero–marzo 2025</p></div>
      <button class="nova-secondary" id="reset-chat" type="button">Nueva conversación</button></header>
      <div class="nova-chat-messages" id="chat-log" role="log" aria-label="Mensajes de la conversación" tabindex="0">
        ${chat.length ? chat.map((turn, turnIndex) => `<article class="nova-message ${turn.role}">
          <span>${turn.role === 'user' ? 'Tú' : 'DataCore AI'}</span>
          ${turn.role === 'user' ? `<p>${esc(turn.text)}</p>` : turn.sections.map(section =>
            `<div class="nova-chat-section"><p>${esc(section.text)}</p></div>`).join('')}
          ${(turn.artifacts ?? []).map((result, index) => artifact(result, esc, turnIndex, index)).join('')}
          ${turn.role === 'assistant' ? `<button type="button" class="nova-chat-action" data-copy-chat="${turnIndex}">Copiar respuesta</button>` : ''}
        </article>`).join('') : `<div class="nova-welcome">${icon('asistente')}<h3>¿Qué quieres analizar?</h3>
          <p>Consulta productos, compara categorías o explora un escenario de precios.</p></div>`}
      </div>
      <div class="nova-chat-composer">
        ${pending ? '<p class="nova-chat-status" role="status"><i aria-hidden="true"></i> Analizando la consulta…</p>' : ''}
        ${error ? `<p class="nova-chat-error" role="alert">${esc(error)}</p>` : ''}
        <form id="chat-form" class="nova-chat-input">
          <label class="sr-only" for="chat-input">Pregunta sobre Nova Retail</label>
          <textarea id="chat-input" rows="2" maxlength="2000" placeholder="Escribe tu pregunta sobre Nova Retail…">${esc(draft)}</textarea>
          <button type="submit" aria-label="Enviar mensaje" ${pending ? 'disabled' : ''}>${icon('up')}</button>
        </form>
        ${!chat.length ? `<details class="nova-chat-examples"><summary>Ver ejemplos opcionales</summary><div class="nova-chat-pills">${examples.map(text => `<button type="button" data-suggest="${esc(text)}">${esc(text)}</button>`).join('')}</div></details>` : ''}
        <small>Groq procesa la conversación. La fuente histórica de la PWA no contiene existencias ni costos.</small>
      </div>
    </section>
    <aside class="nova-insights" aria-labelledby="insights-title">
      <header><h2 id="insights-title">Insights inteligentes</h2><p>Hallazgos del trimestre completo</p></header>
      ${findings.map(item => `<article><h3>${esc(item.label)}</h3><strong>${esc(item.value)}</strong>
        <p>${esc(item.detail)}</p><p class="nova-insight-recommendation">${esc(item.recommendation)}</p><button type="button" data-suggest="${esc(item.question)}" data-full-period aria-label="Analizar ${esc(item.label)}">Explorar en el chat ${icon('arrow')}</button></article>`).join('')}
    </aside>
  </div>`;
}

function csv(rows) {
  const escapeCsv = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  return '\uFEFF' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
}

function exportComparison({ periods, baseline, current, netDeltaPct, drivers, contributions }) {
  const usd = value => (value / 100).toFixed(2);
  return csv([
    ['Detalle', 'Indicador', ...periods, 'Variación', 'Variación %'],
    ...comparisonMetrics.map(metric => {
      const count = ['orders', 'units'].includes(metric);
      const format = count ? Number : usd;
      return ['Indicadores', labels[metric] + (count ? '' : ' USD'), format(baseline[metric]), format(current[metric]),
        format(current[metric] - baseline[metric]), metric === 'net' ? netDeltaPct : ''];
    }),
    ...(drivers ? Object.entries(driverLabels).map(([key, label]) => ['Descomposición', label + ' USD', '', '', usd(drivers[key]), '']) : []),
    ...Object.entries(contributions).flatMap(([dimension, rows]) => rows.map(row =>
      [dimensions[dimension], row.name, usd(row.baselineNet), usd(row.currentNet), usd(row.netDelta), ''])),
  ]);
}

export function exportArtifact(result) {
  if (result.kind === 'period_comparison') return exportComparison(result);
  const columns = result.scenario ? ['net', 'scenario', 'delta'] : [result.metric];
  if (result.view === 'distribution') columns.push('sharePct');
  const numbers = value => value ?? '';
  return csv([
    ['Grupo', ...columns.map(key => key === 'sharePct' ? 'Participación %' : labels[key] + (['units', 'orders'].includes(key) ? '' : ' USD'))],
    ...result.rows.map(row => [row.name, ...columns.map(key => {
      const value = row[key];
      if (value == null || ['units', 'orders', 'sharePct'].includes(key)) return numbers(value);
      return (value / 100).toFixed(2);
    })]),
  ]);
}
