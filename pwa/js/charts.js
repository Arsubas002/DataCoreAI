import { money, dateLabel, categories } from './data.js?v=atlas-v7.1';
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export const cumulative = (values) => {
  let total = 0;
  return values.map((v) => +(total += Math.round(v * 100) / 100).toFixed(2));
};
export function breakdown(data) {
  return categories.map((name) => ({
    name,
    value:
      Math.round(
        data.ranking
          .filter((p) => p.category === name)
          .reduce((a, p) => a + p.revenue * 100, 0),
      ) / 100,
  }));
}
export function branchTotals(data) {
  return ['Centro', 'Norte', 'Sur', 'Sin asignar'].map((name) => ({
    name,
    value:
      data.current
        .filter((s) => s.branch === name)
        .reduce((a, s) => a + s.totalCents, 0) / 100,
  }));
}
export function layoutTiles(items, x = 0, y = 0, w = 100, h = 100) {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((a, p) => a + p.value, 0);
  let split = 1,
    subtotal = items[0].value;
  while (split < items.length - 1 && subtotal < total / 2) {
    subtotal += items[split++].value;
  }
  const ratio = subtotal / total;
  return w >= h
    ? [
        ...layoutTiles(items.slice(0, split), x, y, w * ratio, h),
        ...layoutTiles(
          items.slice(split),
          x + w * ratio,
          y,
          w * (1 - ratio),
          h,
        ),
      ]
    : [
        ...layoutTiles(items.slice(0, split), x, y, w, h * ratio),
        ...layoutTiles(
          items.slice(split),
          x,
          y + h * ratio,
          w,
          h * (1 - ratio),
        ),
      ];
}
function tip(label) {
  return `data-viz-tip="${esc(label)}" aria-label="${esc(label)}"`;
}
function wrap(type, body) {
  return `<div class="viz" data-viz="${type}">${body}<output class="viz-tooltip" role="status" hidden></output></div>`;
}
export function donut(data) {
  const values = breakdown(data),
    total = data.revenue;
  let offset = 0;
  const paths = values
    .map((p, i) => {
      const share = total ? (p.value / total) * 100 : 0;
      const circle = share
        ? `<circle cx="100" cy="100" r="76" fill="none" stroke="var(--cat-${i % 8})" stroke-width="25" pathLength="100" stroke-dasharray="${share} ${100 - share}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`
        : '';
      offset += share;
      return circle;
    })
    .join('');
  return wrap(
    'donut',
    `<div class="donut-layout"><svg viewBox="0 0 200 200" role="img" aria-label="Distribución de ingresos por categoría; valores en la leyenda"><circle cx="100" cy="100" r="76" fill="none" stroke="var(--soft)" stroke-width="25"/>${paths}<text x="100" y="96" class="donut-total" text-anchor="middle">${values.filter((p) => p.value > 0).length}</text><text x="100" y="118" class="donut-caption" text-anchor="middle">categorías con ventas</text></svg><div class="donut-legend">${values.map((p, i) => `<button class="category-breakdown-row" ${tip(`${p.name}: ${money(p.value)} · ${total ? ((p.value / total) * 100).toFixed(1) : 0}%`)}><i style="--color:var(--cat-${i % 8})"></i><span>${p.name}</span><strong>${total ? ((p.value / total) * 100).toFixed(1) : 0}%</strong></button>`).join('')}</div></div>`,
  );
}
export function columns(data) {
  const values = branchTotals(data),
    max = Math.max(...values.map((p) => p.value), 1);
  return wrap(
    'columns',
    `<div class="column-plot">${values.map((p, i) => `<button class="column-item" ${tip(`${p.name}: ${money(p.value)}`)}><span class="column-value">${money(p.value)}</span><span class="column-track"><span style="height:${Math.max(1, (p.value / max) * 100)}%;--color:var(--cat-${i})"></span></span><strong>${p.name}</strong></button>`).join('')}</div>`,
  );
}
export function calendar(data) {
  const max = Math.max(...data.series, ...data.previous, 1),
    first = new Date(data.dates[0] + 'T12:00:00Z').getUTCDay();
  const pad = (first + 6) % 7;
  return wrap(
    'calendar',
    `<div class="calendar-weekdays">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<span>${d}</span>`).join('')}</div><div class="calendar-grid">${'<span></span>'.repeat(pad)}${data.dates.map((date, i) => `<button ${tip(`${dateLabel(date)}: ${money(data.series[i])}`)} style="--intensity:${0.1 + (data.series[i] / max) * 0.9}"><span>${Number(date.slice(-2))}</span><i></i></button>`).join('')}</div><p class="viz-note">Intensidad = ingresos del día. Sin datos de hora en las fuentes.</p>`,
  );
}
export function treemap(data) {
  const active = data.ranking.filter((p) => p.revenue > 0);
  const values = active
    .slice(0, 6)
    .map((p) => ({ name: p.name, value: p.revenue }));
  const rest = active.slice(6).reduce((a, p) => a + p.revenue, 0);
  if (rest)
    values.push({ name: `Otros ${active.length - 6} productos`, value: rest });
  const tiles = layoutTiles(values);
  return wrap(
    'treemap',
    `<div class="treemap">${tiles.map((p, i) => `<button class="${p.w < 14 || p.h < 18 ? 'tiny-tile' : ''}" ${tip(`${p.name}: ${money(p.value)} · ${((p.value / (data.revenue || 1)) * 100).toFixed(1)}%`)} style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;--color:var(--cat-${i})"><strong>${p.w < 14 || p.h < 18 ? String(i + 1).padStart(2, '0') : p.name}</strong><span>${((p.value / (data.revenue || 1)) * 100).toFixed(1)}%</span></button>`).join('')}</div><div class="tile-legend">${values.map((p, i) => `<button ${tip(`${p.name}: ${money(p.value)}`)}><i style="--color:var(--cat-${i})">${String(i + 1).padStart(2, '0')}</i><span>${p.name}</span><strong>${((p.value / (data.revenue || 1)) * 100).toFixed(1)}%</strong></button>`).join('')}</div>${!tiles.length ? '<p class="empty-state">No hay ventas en este período.</p>' : ''}<p class="viz-note">Superficie proporcional a ingresos · seis líderes y el resto agrupado.</p>`,
  );
}
export function scatter(data) {
  const active = data.ranking.filter((p) => p.units > 0),
    maxPrice = Math.max(...active.map((p) => p.price), 1) * 1.1,
    maxUnits = Math.max(...active.map((p) => p.units), 1) * 1.15;
  return wrap(
    'scatter',
    `<div class="scatter-plot" role="group" aria-label="Relación entre precio y unidades vendidas"><span class="scatter-y">Unidades vendidas · 0–${Math.ceil(maxUnits)}</span><div class="scatter-field">${active.map((p, i) => `<button ${tip(`${p.name}: ${money(p.price)} · ${p.units} unidades · Ingresos ${money(p.revenue)}`)} style="left:${(p.price / maxPrice) * 94 + 3}%;bottom:${(p.units / maxUnits) * 86 + 5}%;--color:var(--cat-${categories.indexOf(p.category) % 8})"><i></i></button>`).join('')}</div><span class="scatter-x">Precio · S/ 0–${Math.ceil(maxPrice)}</span></div><p class="viz-note">Cada punto es un producto con ventas; color por categoría. No se calcula rentabilidad: no hay costos.</p>`,
  );
}
export function sparkline(series) {
  const max = Math.max(...series, 1);
  return `<svg viewBox="0 0 120 30" class="sparkline" role="img" aria-label="Tendencia diaria del período"><path d="${series.map((v, i) => `${i ? 'L' : 'M'}${(i / (series.length - 1)) * 120} ${28 - (v / max) * 25}`).join(' ')}"/></svg>`;
}
export function chart(data, id = 'revenue') {
  const mobile = globalThis.matchMedia?.('(max-width:760px)').matches,
    w = mobile ? 420 : 900,
    h = mobile ? 275 : 360,
    left = 45,
    base = h - 35,
    top = 20;
  const current = cumulative(data.series),
    previous = cumulative(data.previous),
    max = Math.max(...current, ...previous, 1) * 1.05;
  const x = (i) => left + (i * (w - left - 30)) / (data.series.length - 1),
    y = (v) => base - (v / max) * (base - top),
    path = (arr) =>
      arr.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  return `<div class="chart-module"><div class="chart-controls"><div class="chart-segments" role="group" aria-label="Modo de evolución"><button data-chart-type="line" aria-pressed="true">Acumulado</button><button data-chart-type="bars" aria-pressed="false">Diario</button></div><label class="chart-compare"><input type="checkbox" data-chart-compare checked> Comparar períodos</label></div><div class="chart" data-chart="${id}" tabindex="0" role="group" aria-label="Ventas acumuladas en soles. Explora con las flechas o el dedo."><svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${[0, 0.5, 1].map((t) => `<line x1="${left}" x2="${w - 15}" y1="${y(max * t)}" y2="${y(max * t)}" class="grid-line"/><text class="chart-axis-label" data-scale="${t}" x="${left - 8}" y="${y(max * t) + 4}" text-anchor="end">${((max * t) / 1000).toFixed(1)}k</text>`).join('')}<path class="area-fill" d="${path(current)} L${x(current.length - 1)} ${base} L${left} ${base}Z"/><path class="previous-line" d="${path(previous)}"/><path class="data-line" d="${path(current)}"/><g class="chart-bars" visibility="hidden">${data.series.map((v, i) => `<rect x="${x(i) - Math.max(3, ((w - left - 30) / data.series.length) * 0.55) / 2}" y="${base - (v / Math.max(...data.series, ...data.previous, 1)) * (base - top)}" width="${Math.max(3, ((w - left - 30) / data.series.length) * 0.55)}" height="${(v / Math.max(...data.series, ...data.previous, 1)) * (base - top)}"/>`).join('')}</g><g class="chart-cursor" visibility="hidden"><line y1="${top}" y2="${base}"/><circle r="5"/></g>${[0, Math.floor(data.dates.length / 2), data.dates.length - 1].map((i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="${i === 0 ? 'start' : i === data.dates.length - 1 ? 'end' : 'middle'}">${dateLabel(data.dates[i])}</text>`).join('')}</svg><output class="chart-tooltip" aria-live="polite" hidden></output></div><div class="chart-legend"><span><i></i>Actual</span><span class="previous-legend"><i class="previous"></i>Anterior</span><small>Desliza para explorar</small></div></div>`;
}
export function bindCharts(root, data) {
  root.querySelectorAll('[data-viz-tip]').forEach((el) => {
    const viz = el.closest('.viz'),
      output = viz.querySelector('output');
    const show = () => {
      output.textContent = el.dataset.vizTip;
      output.hidden = false;
    };
    el.onpointerenter = show;
    el.onfocus = show;
    el.onclick = show;
    el.onblur = () => (output.hidden = true);
    el.onkeydown = (e) => {
      if (e.key === 'Escape') output.hidden = true;
    };
    el.onpointerleave = () => {
      if (!el.matches(':focus')) output.hidden = true;
    };
  });
  root.querySelectorAll('[data-chart]').forEach((el) => {
    const module = el.closest('.chart-module'),
      tooltip = el.querySelector('output'),
      cursor = el.querySelector('.chart-cursor');
    let selected = data.series.length - 1,
      mode = 'line';
    const current = cumulative(data.series),
      prior = cumulative(data.previous);
    const w = el.querySelector('svg').viewBox.baseVal.width,
      h = el.querySelector('svg').viewBox.baseVal.height,
      base = h - 35;
    const show = (i) => {
      selected = Math.max(0, Math.min(data.series.length - 1, i));
      const values = mode === 'line' ? current : data.series,
        prev = mode === 'line' ? prior : data.previous,
        max =
          mode === 'line'
            ? Math.max(...current, ...prior, 1) * 1.05
            : Math.max(...data.series, ...data.previous, 1);
      const x = 45 + (selected * (w - 75)) / (data.series.length - 1),
        y = base - (values[selected] / max) * (base - 20);
      cursor.setAttribute('visibility', 'visible');
      for (const attr of ['x1', 'x2'])
        cursor.querySelector('line').setAttribute(attr, x);
      cursor.querySelector('circle').setAttribute('cx', x);
      cursor.querySelector('circle').setAttribute('cy', y);
      tooltip.hidden = false;
      tooltip.innerHTML = `<span>${dateLabel(data.dates[selected])} · ${mode === 'line' ? 'Acumulado' : 'Diario'}</span><strong>${money(values[selected])}</strong>${module.querySelector('[data-chart-compare]').checked ? `<small>Anterior ${money(prev[selected])}</small>` : ''}`;
      tooltip.style.left = `${Math.max(23, Math.min(77, (x / w) * 100))}%`;
    };
    const track = (e) => {
      const r = el.getBoundingClientRect();
      show(
        Math.round(
          ((((e.clientX - r.left) / r.width) * w - 45) / (w - 75)) *
            (data.series.length - 1),
        ),
      );
    };
    el.onpointerdown = (e) => {
      el.setPointerCapture(e.pointerId);
      track(e);
    };
    el.onpointermove = track;
    el.onfocus = () => show(selected);
    el.onpointerleave = () => {
      if (!el.matches(':focus')) {
        tooltip.hidden = true;
        cursor.setAttribute('visibility', 'hidden');
      }
    };
    el.onkeydown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        show(
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? data.series.length - 1
              : selected + (e.key === 'ArrowRight' ? 1 : -1),
        );
      }
    };
    module.querySelectorAll('[data-chart-type]').forEach(
      (button) =>
        (button.onclick = () => {
          mode = button.dataset.chartType;
          const bars = mode === 'bars';
          module
            .querySelectorAll('[data-chart-type]')
            .forEach((b) => b.setAttribute('aria-pressed', b === button));
          el.querySelector('.chart-bars').setAttribute(
            'visibility',
            bars ? 'visible' : 'hidden',
          );
          el.querySelector('.data-line').setAttribute(
            'visibility',
            bars ? 'hidden' : 'visible',
          );
          el.querySelector('.area-fill').setAttribute(
            'visibility',
            bars ? 'hidden' : 'visible',
          );
          el.querySelector('.previous-line').style.display =
            !module.querySelector('[data-chart-compare]').checked ? 'none' : '';
          const previousValues = bars ? data.previous : prior;
          const scale = bars
            ? Math.max(...data.series, ...data.previous, 1)
            : Math.max(...current, ...prior, 1) * 1.05;
          el.querySelector('.previous-line').setAttribute(
            'd',
            previousValues
              .map(
                (v, i) =>
                  `${i ? 'L' : 'M'}${45 + (i * (w - 75)) / (data.series.length - 1)} ${base - (v / scale) * (base - 20)}`,
              )
              .join(' '),
          );
          tooltip.hidden = true;
          module.querySelector('.previous-legend').hidden =
            !module.querySelector('[data-chart-compare]').checked;
          const axisMax = bars
            ? Math.max(...data.series, ...data.previous, 1)
            : Math.max(...current, ...prior, 1) * 1.05;
          el.querySelectorAll('.chart-axis-label').forEach(
            (label) =>
              (label.textContent =
                ((axisMax * Number(label.dataset.scale)) / 1000).toFixed(1) +
                'k'),
          );
          el.setAttribute(
            'aria-label',
            bars
              ? 'Ingresos diarios en soles. Usa las flechas para explorar.'
              : 'Ventas acumuladas en soles. Usa las flechas para explorar.',
          );
        }),
    );
    module.querySelector('[data-chart-compare]').onchange = (e) => {
      el.querySelector('.previous-line').style.display = e.target.checked
        ? ''
        : 'none';
      module.querySelector('.previous-legend').hidden = !e.target.checked;
      tooltip.hidden = true;
    };
  });
}
