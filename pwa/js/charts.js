import { money, dateLabel } from './data.js';
export function chart(data, id = 'revenue') {
  const mobile = globalThis.matchMedia?.('(max-width: 760px)').matches;
  const width = mobile ? 420 : 900,
    height = mobile ? 235 : 290,
    left = mobile ? 38 : 52,
    right = 12,
    top = 22,
    bottom = 35;
  const max =
      Math.ceil(Math.max(...data.series, ...data.previous, 1) / 500) * 500,
    base = height - bottom;
  const x = (i) =>
      left + (i * (width - left - right)) / (data.series.length - 1),
    y = (v) => base - (v / max) * (base - top);
  const path = (values) =>
    values
      .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
      .join(' ');
  const grid = [0, 0.5, 1]
    .map(
      (t) =>
        `<line x1="${left}" x2="${width - right}" y1="${y(max * t)}" y2="${y(max * t)}" class="grid-line"/><text x="${left - 12}" y="${y(max * t) + 4}" text-anchor="end">${max * t >= 1000 ? ((max * t) / 1000).toFixed(1) + 'k' : max * t}</text>`,
    )
    .join('');
  const labels = [0, Math.floor(data.dates.length / 2), data.dates.length - 1]
    .map(
      (i) =>
        `<text x="${x(i)}" y="${height - 6}" text-anchor="${i === 0 ? 'start' : i === data.dates.length - 1 ? 'end' : 'middle'}">${dateLabel(data.dates[i])}</text>`,
    )
    .join('');
  return `<div class="chart" data-chart="${id}" data-left="${left}" data-height="${height}" tabindex="0" role="group" aria-label="Ingresos en soles por día. Usa las flechas para explorar los valores."><svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><linearGradient id="fill-${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".13"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${path(data.previous)}" class="previous-line"/><path d="${path(data.series)} L${x(data.series.length - 1)} ${base} L${left} ${base}Z" fill="url(#fill-${id})"/><path d="${path(data.series)}" class="data-line"/><g class="chart-cursor" visibility="hidden"><line x1="0" x2="0" y1="${top}" y2="${base}"/><circle r="5"/></g>${labels}</svg><output class="chart-tooltip" aria-live="polite" hidden></output></div><div class="chart-legend"><span><i></i>Período actual</span><span><i class="previous"></i>Período anterior</span><small>Desliza para explorar</small></div>`;
}
export function bindCharts(root, data) {
  root.querySelectorAll('[data-chart]').forEach((el) => {
    const tooltip = el.querySelector('output'),
      cursor = el.querySelector('.chart-cursor');
    let selected = data.series.length - 1;
    function show(index) {
      selected = Math.max(0, Math.min(data.series.length - 1, index));
      const max =
        Math.ceil(Math.max(...data.series, ...data.previous, 1) / 500) * 500;
      const width = el.querySelector('svg').viewBox.baseVal.width,
        left = Number(el.dataset.left),
        height = Number(el.dataset.height),
        base = height - 35;
      const x =
          left + (selected * (width - left - 12)) / (data.series.length - 1),
        y = base - (data.series[selected] / max) * (base - 22);
      cursor.setAttribute('visibility', 'visible');
      cursor.querySelector('line').setAttribute('x1', x);
      cursor.querySelector('line').setAttribute('x2', x);
      cursor.querySelector('circle').setAttribute('cx', x);
      cursor.querySelector('circle').setAttribute('cy', y);
      tooltip.hidden = false;
      tooltip.textContent = `${dateLabel(data.dates[selected])} · ${money(data.series[selected])} · Anterior ${money(data.previous[selected])}`;
      tooltip.style.left = `${Math.max(22, Math.min(78, (x / width) * 100))}%`;
    }
    function track(e) {
      const rect = el.getBoundingClientRect(),
        width = el.querySelector('svg').viewBox.baseVal.width,
        left = Number(el.dataset.left);
      show(
        Math.round(
          ((((e.clientX - rect.left) / rect.width) * width - left) /
            (width - left - 12)) *
            (data.series.length - 1),
        ),
      );
    }
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || e.isPrimary) {
        el.setPointerCapture(e.pointerId);
        track(e);
      }
    });
    el.addEventListener('pointermove', track);
    el.addEventListener('pointerleave', () => {
      if (!el.matches(':focus')) {
        tooltip.hidden = true;
        cursor.setAttribute('visibility', 'hidden');
      }
    });
    el.addEventListener('focus', () => show(selected));
    el.addEventListener('keydown', (e) => {
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
    });
  });
}
