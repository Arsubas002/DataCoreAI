import { money, num } from './novaretail-data.js';
import { insights } from './nova-analysis.js';

const labels = {
  net: 'Ventas netas', gross: 'Ventas brutas', discount: 'Descuentos', units: 'Unidades',
  orders: 'Transacciones', ticket: 'Ticket medio', price: 'Precio unitario medio',
  scenario: 'Neto simulado', delta: 'Variación',
};
const headings = { facts: 'Hallazgos', calculations: 'Cálculos', recommendations: 'Recomendaciones' };
const examples = [
  '¿Cómo evolucionaron las ventas?',
  'Compara Moda y Deportes',
  '¿Qué pasa si subimos los precios un 10 %?',
];
const findings = insights();

function artifact(result, esc) {
  const { metric, rows, view, change, groups } = result;
  const columns = change === undefined ? [metric] : ['net', 'scenario', 'delta'];
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
  const chart = view === 'bar' ? `<div class="nova-bars">${rows.map(row => `<div class="nova-bar-row">
      <div class="nova-bar-top"><span>${esc(row.name)}</span><b>${format(row[metric])}</b></div>
      <div class="nova-bar-track" aria-hidden="true"><i style="width:${(100 * (row[metric] ?? 0) / maximum).toFixed(2)}%"></i></div></div>`).join('')}</div>`
    : view === 'line' ? `<svg class="nova-chat-line" viewBox="0 0 520 150" role="img" aria-label="${esc(title)} por fecha. Valores disponibles en la tabla.">
      <path d="M16 112H504" stroke="var(--line)"/>
      <polyline points="${points.map(point => point.join(',')).join(' ')}" stroke="var(--chart)" stroke-width="3" fill="none"/>
      ${points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${points.length > 15 ? 2 : 4}" fill="var(--chart)"/>`).join('')}
      <text x="16" y="138">${esc(rows[0].name)}</text>
      ${rows.length > 1 ? `<text x="504" y="138" text-anchor="end">${esc(rows.at(-1).name)}</text>` : ''}
    </svg>`
    : view === 'kpi' ? `<div class="nova-chat-kpis">${rows.map(row => `<div><span>${esc(row.name)}</span><strong>${format(row[metric])}</strong></div>`).join('')}</div>`
    : '';
  const scope = Object.values(result.filters).flat().map(esc).join(' · ');
  return `<section class="nova-chat-artifact"><h3>${title}</h3>
    <small>${scope || 'Enero–marzo 2025'}${groups > rows.length ? ` · ${rows.length} de ${groups} grupos` : ''}</small>
    ${change === undefined ? '' : `<p>Escenario de precio ${num(change)} %. Unidades y tasas de descuento constantes.</p>`}
    ${chart}
    ${view === 'line' ? `<details><summary>Ver valores</summary>${table}</details>` : view === 'table' || change !== undefined ? table : ''}
  </section>`;
}

export function chatPage({ chat, pending, error, draft }, { esc, icon }) {
  return `<div class="nova-analyst">
    <section class="nova-chat" aria-label="Conversación comercial">
      <header class="nova-chat-top"><div><h2>Conversación</h2><p>Nova Retail · Enero–marzo 2025</p></div>
      <button class="nova-secondary" id="reset-chat" type="button">Nueva conversación</button></header>
      <div class="nova-chat-messages" id="chat-log" role="log" aria-label="Mensajes de la conversación" tabindex="0">
        ${chat.length ? chat.map(turn => `<article class="nova-message ${turn.role}">
          <span>${turn.role === 'user' ? 'Tú' : 'DataCore AI'}</span>
          ${turn.role === 'user' ? `<p>${esc(turn.text)}</p>` : turn.sections.map(section =>
            `<div class="nova-chat-section"><h3>${headings[section.kind]}</h3><p>${esc(section.text)}</p></div>`).join('')}
          ${(turn.artifacts ?? []).map(result => artifact(result, esc)).join('')}
        </article>`).join('') : `<div class="nova-welcome">${icon('asistente')}<h3>¿Qué quieres analizar?</h3>
          <p>Consulta productos, compara categorías o explora un escenario de precios.</p></div>`}
      </div>
      <div class="nova-chat-composer">
        ${pending ? '<p class="nova-chat-status" role="status"><i aria-hidden="true"></i> Analizando la consulta…</p>' : ''}
        ${error ? `<p class="nova-chat-error" role="alert">${esc(error)}</p>` : ''}
        ${!chat.length ? `<div class="nova-chat-pills">${examples.map(text => `<button type="button" data-suggest="${esc(text)}">${esc(text)}</button>`).join('')}</div>` : ''}
        <form id="chat-form" class="nova-chat-input">
          <label class="sr-only" for="chat-input">Pregunta sobre Nova Retail</label>
          <textarea id="chat-input" rows="2" maxlength="2000" placeholder="Escribe tu pregunta sobre Nova Retail…">${esc(draft)}</textarea>
          <button type="submit" aria-label="Enviar mensaje" ${pending ? 'disabled' : ''}>${icon('up')}</button>
        </form>
        <small>Groq procesa la conversación. La fuente histórica de la PWA no contiene existencias ni costos.</small>
      </div>
    </section>
    <aside class="nova-insights" aria-labelledby="insights-title">
      <header><h2 id="insights-title">Insights inteligentes</h2><p>Hallazgos del trimestre completo</p></header>
      ${findings.map(item => `<article><h3>${esc(item.label)}</h3><strong>${esc(item.value)}</strong>
        <p>${esc(item.detail)}</p><button type="button" data-suggest="${esc(item.question)}" data-full-period aria-label="Analizar ${esc(item.label)}">Explorar en el chat ${icon('arrow')}</button></article>`).join('')}
    </aside>
  </div>`;
}
