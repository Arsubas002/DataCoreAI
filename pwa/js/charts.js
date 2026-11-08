import { money, dateLabel } from './data.js?v=orbit-noir-v5';
export function chart(data, id = 'revenue') {
  const mobile = globalThis.matchMedia?.('(max-width:760px)').matches;
  const width = mobile ? 420 : 860,
    height = mobile ? 255 : 310,
    left = mobile ? 40 : 50,
    right = 16,
    top = 28,
    base = height - 35;
  const max =
    Math.ceil(Math.max(...data.series, ...data.previous, 1) / 500) * 500;
  const x = (i) =>
      left + (i * (width - left - right)) / (data.series.length - 1),
    y = (v) => base - (v / max) * (base - top);
  const path = (values) =>
    values.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  const grid = [0, 0.5, 1]
    .map(
      (t) =>
        `<line x1="${left}" x2="${width - right}" y1="${y(max * t)}" y2="${y(max * t)}" class="grid-line"/><text x="${left - 10}" y="${y(max * t) + 4}" text-anchor="end">${max * t >= 1000 ? ((max * t) / 1000).toFixed(1) + 'k' : max * t}</text>`,
    )
    .join('');
  const labels = [0, Math.floor(data.dates.length / 2), data.dates.length - 1]
    .map(
      (i) =>
        `<text x="${x(i)}" y="${height - 7}" text-anchor="${i === 0 ? 'start' : i === data.dates.length - 1 ? 'end' : 'middle'}">${dateLabel(data.dates[i])}</text>`,
    )
    .join('');
  const barWidth = Math.max(
    2,
    ((width - left - right) / data.series.length) * 0.5,
  );
  return `<div class="chart-module"><div class="chart-controls"><div class="chart-segments" role="group" aria-label="Tipo de gráfico"><button type="button" data-chart-type="line" aria-pressed="true">Tendencia</button><button type="button" data-chart-type="bars" aria-pressed="false">Por día</button></div><label class="chart-compare"><input type="checkbox" data-chart-compare checked> Comparar períodos</label></div><div class="chart" data-chart="${id}" data-left="${left}" data-height="${height}" tabindex="0" role="group" aria-label="Ingresos diarios en soles. Explora con el dedo o las flechas del teclado."><svg viewBox="0 0 ${width} ${height}" aria-hidden="true">${grid}<path d="${path(data.previous)}" class="previous-line"/><path d="${path(data.series)}" class="data-line" pathLength="1"/><g class="chart-bars" visibility="hidden">${data.series.map((v, i) => `<rect x="${x(i) - barWidth / 2}" y="${y(v)}" width="${barWidth}" height="${base - y(v)}" rx="${Math.min(3, barWidth / 2)}"/>`).join('')}</g><g class="chart-cursor" visibility="hidden"><line x1="0" x2="0" y1="${top}" y2="${base}"/><circle r="5"/></g>${labels}</svg><output class="chart-tooltip" aria-live="polite" hidden></output></div><div class="chart-legend"><span><i></i>Actual</span><span class="previous-legend"><i class="previous"></i>Anterior</span><small>Pulsa o desliza para explorar</small></div></div>`;
}
export function bindCharts(root, data) {
  root.querySelectorAll('[data-chart]').forEach((el) => {
    const module = el.closest('.chart-module'),
      tooltip = el.querySelector('output'),
      cursor = el.querySelector('.chart-cursor');
    let selected = data.series.length - 1;
    function show(index) {
      selected = Math.max(0, Math.min(data.series.length - 1, index));
      const max =
          Math.ceil(Math.max(...data.series, ...data.previous, 1) / 500) * 500,
        width = el.querySelector('svg').viewBox.baseVal.width,
        left = Number(el.dataset.left),
        base = Number(el.dataset.height) - 35,
        x = left + (selected * (width - left - 16)) / (data.series.length - 1),
        y = base - (data.series[selected] / max) * (base - 28);
      cursor.setAttribute('visibility', 'visible');
      for (const attr of ['x1', 'x2'])
        cursor.querySelector('line').setAttribute(attr, x);
      cursor.querySelector('circle').setAttribute('cx', x);
      cursor.querySelector('circle').setAttribute('cy', y);
      tooltip.hidden = false;
      tooltip.innerHTML = `<span>${dateLabel(data.dates[selected])}</span><strong>${money(data.series[selected])}</strong>${module.querySelector('[data-chart-compare]').checked ? `<small>Anterior ${money(data.previous[selected])}</small>` : ''}`;
      tooltip.style.left = `${Math.max(23, Math.min(77, (x / width) * 100))}%`;
    }
    function track(e) {
      const r = el.getBoundingClientRect(),
        width = el.querySelector('svg').viewBox.baseVal.width,
        left = Number(el.dataset.left);
      show(
        Math.round(
          ((((e.clientX - r.left) / r.width) * width - left) /
            (width - left - 16)) *
            (data.series.length - 1),
        ),
      );
    }
    el.onpointerdown = (e) => {
      el.setPointerCapture(e.pointerId);
      track(e);
    };
    el.onpointermove = track;
    el.onpointerleave = () => {
      if (!el.matches(':focus')) {
        tooltip.hidden = true;
        cursor.setAttribute('visibility', 'hidden');
      }
    };
    el.onfocus = () => show(selected);
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
          const bars = button.dataset.chartType === 'bars';
          module
            .querySelectorAll('[data-chart-type]')
            .forEach((b) => b.setAttribute('aria-pressed', b === button));
          el.querySelector('.data-line').setAttribute(
            'visibility',
            bars ? 'hidden' : 'visible',
          );
          el.querySelector('.chart-bars').setAttribute(
            'visibility',
            bars ? 'visible' : 'hidden',
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
