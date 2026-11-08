import {
  products,
  analytics,
  money,
  number,
  dateLabel,
  exportRows,
  toCsv,
  snapshot,
} from './data.js?v=editorial-search-v2';
import { icon, pages } from './icons.js?v=editorial-search-v2';
import { chart, bindCharts } from './charts.js?v=editorial-search-v2';
import {
  setupSheet,
  reducedMotion,
  spring,
} from './motion.js?v=editorial-search-v2';
import { ask } from './assistant.js?v=editorial-search-v2';
const view = document.querySelector('#view'),
  dialog = document.querySelector('#sheet'),
  sheet = setupSheet(dialog);
const state = {
  days: 30,
  branch: 'Todas',
  query: '',
  category: 'Todos',
  sort: 'name',
  compare: new Set(),
  inventory: 'Todos',
  messages: [],
  busy: false,
  interacted: false,
};
const storage = {
  get(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Private browsing may disable storage. */
    }
  },
};
let page = 'inicio',
  data = analytics(),
  viewAnimation;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const change = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const delta = (value) =>
  `<span class="delta ${value < 0 ? 'negative' : ''}">${value >= 0 ? '↗' : '↘'} ${change(value)}</span>`;
const navLink = (id) =>
  `<a href="#${id}" data-nav="${id}" ${page === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${pages[id]}</span>${id === 'inventario' ? '<small>2</small>' : ''}</a>`;
function navigation() {
  document.querySelector('#desktop-nav').innerHTML = Object.keys(pages)
    .map(navLink)
    .join('');
  document.querySelector('#mobile-nav').innerHTML =
    ['inicio', 'productos', 'ventas', 'asistente'].map(navLink).join('') +
    `<button id="more-nav" ${['inventario', 'reportes'].includes(page) ? 'aria-current="page"' : ''}>${icon('more')}<span>Más</span></button>`;
  document.querySelector('#more-nav').onclick = () =>
    openSheet(
      'Más para tu negocio',
      'NAVEGACIÓN',
      `<nav class="more-links" aria-label="Más secciones">${['inventario', 'reportes'].map(navLink).join('')}</nav>`,
    );
}
function filters() {
  return `<div class="filters"><label class="select-label"><span class="sr-only">Período</span><select id="period"><option value="7" ${state.days === 7 ? 'selected' : ''}>Últimos 7 días</option><option value="30" ${state.days === 30 ? 'selected' : ''}>Últimos 30 días</option><option value="60" ${state.days === 60 ? 'selected' : ''}>Últimos 60 días</option></select></label><label class="select-label branch-select"><span class="sr-only">Sucursal</span><select id="branch">${['Todas', 'Centro', 'Norte', 'Sur'].map((b) => `<option ${b === state.branch ? 'selected' : ''}>${b}</option>`).join('')}</select></label></div>`;
}
function heading(eyebrow, title, subtitle, controls = '') {
  return `<section class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${controls}</section>`;
}
function sectionHead(title, sub = '', action = '') {
  return `<header class="section-heading"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${action}</header>`;
}
function productArt(p, large = false) {
  return `<div class="product-art ${p.color} ${large ? 'large' : ''}">${icon(p.symbol)}</div>`;
}
function bars(items, metric = 'revenue') {
  const max = Math.max(...items.map((p) => p[metric]), 1);
  return `<div class="ranking">${items.map((p, i) => `<button class="ranking-row" data-product="${p.id}"><span class="rank-index">${String(i + 1).padStart(2, '0')}</span>${productArt(p)}<span class="rank-main"><strong>${p.name}</strong><span class="bar-track"><span style="width:${(p[metric] / max) * 100}%"></span></span></span><span class="rank-value">${metric === 'revenue' ? money(p.revenue) : number(p.units) + ' uds.'}${icon('chevron')}</span></button>`).join('')}</div>`;
}
function recent(rows) {
  return `<div class="transactions">${rows
    .slice(0, 6)
    .map((s) => {
      const p = products.find((p) => p.id === s.productId);
      return `<div class="transaction">${productArt(p)}<div><strong>${p.name}</strong><small>${s.id} · ${s.branch} · ${dateLabel(s.date)}</small></div><div class="transaction-value"><strong>${money(s.totalCents / 100)}</strong><small>${s.quantity} ${s.quantity === 1 ? 'unidad' : 'unidades'}</small></div></div>`;
    })
    .join('')}</div>`;
}
function start() {
  return (
    heading(
      'PERSPECTIVA / 07 NOV 2026',
      'Tu negocio.<br><span>En una sola mirada.</span>',
      'Las señales que importan. El espacio para decidir.',
      filters(),
    ) +
    `
  <section class="business-canvas" aria-label="Resumen ejecutivo">
    <div class="canvas-intro"><span class="section-kicker">01 / Ingresos del período</span><div class="hero-value">${money(data.revenue)}</div><p>${delta(data.delta)} <span>vs. período anterior</span></p><div class="canvas-baseline"><span>Antes</span><strong>${money(data.priorRevenue)}</strong></div><a class="text-link" href="#ventas">Entender la tendencia ${icon('arrow')}</a></div>
    <div class="canvas-chart">${chart(data, 'home')}</div>
    <div class="canvas-footer"><div><span>Operaciones</span><strong>${number(data.orders)}</strong></div><div><span>Ticket promedio</span><strong>${money(data.ticket)}</strong></div><div><span>Unidades vendidas</span><strong>${number(data.units)}</strong></div><p>Una vista de ${state.days} días.<br>Solo datos ficticios.</p></div>
  </section>
  <a class="attention-ribbon" href="#inventario"><span class="attention-count">02</span><span><strong>Un poco de atención, más disponibilidad.</strong><small>Jean clásico y Casaca urbana necesitan reposición.</small></span><span class="ribbon-action">Revisar stock ${icon('arrow')}</span></a>
  <div class="editorial-grid"><section class="performance-column">${sectionHead('Lo esencial se reconoce.', '02 / Productos por ingresos', `<a class="text-link" href="#productos">Explorar catálogo ${icon('arrow')}</a>`)}${bars(data.ranking.slice(0, 4))}</section><section class="movement-column">${sectionHead('El negocio no se detiene.', '03 / Últimos movimientos', `<a class="text-link" href="#ventas">Ver ventas ${icon('arrow')}</a>`)}${recent(data.current.slice(0, 4))}</section></div>`
  );
}
function catalogue() {
  return (
    heading(
      'COLECCIÓN · 06 REFERENCIAS',
      'El catálogo, al detalle.',
      'Encuentra, explora y compara lo que vendes.',
      `<button class="button secondary" id="compare-open">${icon('productos')} Comparar <span id="compare-count">${state.compare.size}</span></button>`,
    ) +
    `
<div class="catalog-tools"><p>Usa la búsqueda superior para encontrar una referencia o consultar su stock.</p><label class="select-label"><span class="sr-only">Ordenar productos</span><select id="product-sort"><option value="name">Nombre</option><option value="price">Menor precio</option><option value="stock">Menor stock</option></select></label></div><div class="chips" role="group" aria-label="Filtrar categoría">${['Todos', 'Textil', 'Moda', 'Calzado', 'Accesorios'].map((c) => `<button data-category="${c}" aria-pressed="${state.category === c}">${c}</button>`).join('')}</div><p id="catalog-count" class="results-count" aria-live="polite"></p><div id="product-grid" class="product-grid"></div>`
  );
}
function renderProducts() {
  let list = products.filter(
    (p) =>
      (state.category === 'Todos' || p.category === state.category) &&
      p.name
        .toLocaleLowerCase('es')
        .includes(state.query.toLocaleLowerCase('es')),
  );
  list.sort((a, b) =>
    state.sort === 'name'
      ? a.name.localeCompare(b.name)
      : a[state.sort] - b[state.sort],
  );
  document.querySelector('#catalog-count').textContent =
    `${list.length} ${list.length === 1 ? 'producto' : 'productos'} · Catálogo ficticio`;
  document.querySelector('#product-grid').innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<article class="product"><button class="product-open" data-product="${p.id}" aria-label="Ver detalles de ${p.name}">${productArt(p, true)}<span class="product-category">${p.category}</span><h2>${p.name}</h2><span class="product-price">${money(p.price)}</span></button><div class="product-footer"><span class="stock-status ${p.stock <= p.min ? 'low' : ''}"><i></i>${p.stock <= p.min ? 'Stock bajo' : p.stock + ' disponibles'}</span><label class="compare-label"><input type="checkbox" data-compare="${p.id}" ${state.compare.has(p.id) ? 'checked' : ''}> Comparar</label></div></article>`,
        )
        .join('')
    : `<div class="empty-state"><h2>Sin coincidencias</h2><p>Prueba con otro nombre o cambia la categoría.</p><button class="button secondary" id="clear-search">Limpiar filtros</button></div>`;
  bindProducts();
  document.querySelector('#clear-search')?.addEventListener('click', () => {
    state.query = '';
    state.category = 'Todos';
    render();
  });
}
function salesPage() {
  return (
    heading(
      'ANÁLISIS COMERCIAL',
      'Una historia de crecimiento.',
      'Explora el ritmo de tus ventas, día a día.',
      filters(),
    ) +
    `<div class="sales-summary"><div><span>Ingresos</span><strong>${money(data.revenue)}</strong>${delta(data.delta)}</div><div><span>Período anterior</span><strong>${money(data.priorRevenue)}</strong><small>Misma duración · ${state.days} días</small></div><div><span>Operaciones</span><strong>${number(data.orders)}</strong><small>${number(data.units)} unidades vendidas</small></div></div><section class="trend-section">${sectionHead('Una perspectiva diaria', 'Ingresos en soles · comparación de períodos')}${chart(data, 'sales')}</section><div class="editorial-grid"><section>${sectionHead('Rendimiento por producto', 'Ingresos del período seleccionado')}${bars(data.ranking)}</section><section>${sectionHead('Movimientos recientes', 'Operaciones ficticias · más recientes primero')}${recent(data.current)}</section></div>`
  );
}
function inventoryPage() {
  const stock = products.reduce((a, p) => a + p.stock, 0);
  return (
    heading(
      'DISPONIBILIDAD',
      'Todo en su lugar.',
      'Las existencias de hoy. Las decisiones de mañana.',
    ) +
    `<div class="inventory-top"><div class="inventory-total"><strong>${stock}</strong><span>unidades disponibles<br>en ${products.length} referencias</span></div><p class="inventory-callout"><span class="status-dot"></span><strong>2 productos necesitan reposición</strong><br><span>Existencias iguales o inferiores al mínimo.</span></p></div><div class="chips" role="group" aria-label="Filtrar inventario">${['Todos', 'Por reponer', 'Disponibles'].map((c) => `<button data-inventory="${c}" aria-pressed="${state.inventory === c}">${c}</button>`).join('')}</div><div class="inventory-list">${products
      .filter(
        (p) =>
          state.inventory === 'Todos' ||
          (state.inventory === 'Por reponer'
            ? p.stock <= p.min
            : p.stock > p.min),
      )
      .sort((a, b) => a.stock - b.stock)
      .map(
        (p) =>
          `<button class="inventory-row" data-product="${p.id}">${productArt(p)}<span class="inventory-name"><strong>${p.name}</strong><small>${p.category} · Mínimo ${p.min} uds.</small></span><span class="inventory-track"><span style="width:${(p.stock / 20) * 100}%;" class="${p.stock <= p.min ? 'low' : ''}"></span></span><span class="inventory-quantity">${p.stock}<small>unidades</small></span><span class="stock-status ${p.stock <= p.min ? 'low' : ''}">${p.stock <= p.min ? 'Reponer' : 'Disponible'}</span>${icon('chevron')}</button>`,
      )
      .join(
        '',
      )}</div><p class="data-caption">Instantánea ficticia del 7 de noviembre de 2026. Consultar no modifica existencias.</p>`
  );
}
function reportsPage() {
  return (
    heading(
      'INTELIGENCIA COMERCIAL',
      'Los datos, con sentido.',
      'Del detalle a la visión completa.',
      filters(),
    ) +
    `<section class="report-lead"><div><span class="eyebrow">RESUMEN DEL PERÍODO</span><h2>${money(data.revenue)}<br><span>en ${number(data.orders)} operaciones.</span></h2><p>${delta(data.delta)} frente al período anterior.</p></div><div class="report-export"><button class="button primary" id="export-csv">${icon('down')} Exportar CSV</button><button class="button secondary" id="print-report">Guardar como PDF ${icon('arrow')}</button><small>Solo datos ficticios del filtro actual.<br> PDF mediante el diálogo de impresión.</small></div></section><section class="trend-section">${sectionHead('Actual frente a anterior', 'Misma duración. Una comparación más útil.')}${chart(data, 'reports')}</section><div class="editorial-grid"><section>${sectionHead('Participación por categoría', 'Distribución de ingresos del período')}<div class="category-breakdown">${[
      'Textil',
      'Moda',
      'Calzado',
      'Accesorios',
    ]
      .map((c, i) => {
        const value = data.ranking
            .filter((p) => p.category === c)
            .reduce((a, p) => a + p.revenue, 0),
          pct = data.revenue ? (value / data.revenue) * 100 : 0;
        return `<div class="category-breakdown-row"><span class="category-index">0${i + 1}</span><div><strong>${c}</strong><div class="bar-track"><span style="width:${pct}%"></span></div></div><span>${pct.toFixed(1)}%<small>${money(value)}</small></span></div>`;
      })
      .join(
        '',
      )}</div></section><aside class="report-note"><span class="eyebrow">UNA LECTURA RÁPIDA</span><h2>${data.ranking[0].name}</h2><p>Lidera los ingresos del período con ${money(data.ranking[0].revenue)} y ${data.ranking[0].units} unidades vendidas.</p><p>Esta comparación usa ventas ficticias. No incluye costos ni permite inferir utilidad.</p><a href="#productos" class="text-link">Explorar productos ${icon('arrow')}</a></aside></div><details class="data-details"><summary>Consultar datos diarios y metodología</summary><p>Una fila por día. Ingresos calculados en céntimos enteros a partir de operaciones ficticias. La comparación usa los ${state.days} días inmediatamente anteriores.</p><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Ingresos actuales</th><th>Ingresos anteriores</th></tr></thead><tbody>${data.dates.map((d, i) => `<tr><td>${dateLabel(d)}</td><td>${money(data.series[i])}</td><td>${money(data.previous[i])}</td></tr>`).join('')}</tbody></table></div></details>`
  );
}
function assistantPage() {
  return `<section class="assistant-page"><header class="assistant-header"><div><div class="eyebrow">UN ESPACIO PARA PREGUNTAR</div><h1>Conversa con tus datos.</h1></div><button class="button secondary" id="clear-chat" ${state.busy ? 'disabled' : ''}>Nueva conversación</button></header><p class="assistant-disclosure">${icon('asistente')} <span><strong>Modo demostración · Sin IA conectada</strong> Respuestas locales sobre datos ficticios. Puedes escribir libremente.</span></p><div id="conversation" class="conversation" role="log" aria-label="Conversación" aria-live="polite"></div><form class="composer" id="chat-form"><label class="sr-only" for="chat-input">Pregunta sobre productos, inventario, precios o ventas</label><textarea id="chat-input" maxlength="2000" rows="1" placeholder="¿Qué te gustaría saber?" enterkeyhint="send"></textarea><button class="send-button" type="submit" aria-label="Enviar pregunta">${icon('up')}</button><small>Demostración local. Sin datos reales ni acceso a tu negocio.</small></form></section>`;
}
function renderConversation() {
  const log = document.querySelector('#conversation');
  if (!log) return;
  log.innerHTML = state.messages.length
    ? state.messages
        .map(
          (m) =>
            `<article class="message ${m.role}"><span class="message-label">${m.role === 'user' ? 'Tú' : 'DataCore · Demo'}</span><p>${escape(m.text)}</p></article>`,
        )
        .join('')
    : `<div class="conversation-intro"><div class="assistant-orb">${icon('asistente')}</div><h2>Una buena decisión<br>empieza con una pregunta.</h2><p>Explora tu catálogo, compara precios o revisa las ventas.<br> La pregunta la eliges tú.</p><div class="suggestions" ${state.interacted ? 'hidden' : ''}>${['¿Qué productos necesitan reposición?', 'Compara el polo y el jean', '¿Cómo van las ventas?'].map((q) => `<button data-prompt="${q}">${q}${icon('arrow')}</button>`).join('')}</div></div>`;
  if (state.busy)
    log.insertAdjacentHTML(
      'beforeend',
      '<div class="processing" role="status">Calculando con datos de demostración…</div>',
    );
  document
    .querySelectorAll('[data-prompt]')
    .forEach((b) => (b.onclick = () => send(b.dataset.prompt)));
}
async function send(question) {
  if (state.busy || !question.trim()) return;
  const input = document.querySelector('#chat-input');
  const q = question.trim().slice(0, 2000);
  state.interacted = true;
  state.messages.push({ role: 'user', text: q });
  state.busy = true;
  input.value = '';
  input.style.height = 'auto';
  renderConversation();
  document.querySelector('.send-button').disabled = true;
  document.querySelector('#clear-chat').disabled = true;
  try {
    const answer = await ask(q, data);
    state.messages.push({ role: 'assistant', text: answer });
  } catch (error) {
    state.messages.push({
      role: 'assistant',
      text: `No se pudo completar la consulta. ${error.message} Tu pregunta sigue en la conversación; puedes enviarla de nuevo.`,
    });
  } finally {
    state.busy = false;
    renderConversation();
    document.querySelector('.send-button')?.removeAttribute('disabled');
    document.querySelector('#clear-chat')?.removeAttribute('disabled');
    document.querySelector('.message:last-child')?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion() ? 'instant' : 'smooth',
    });
  }
}
function openSheet(title, context, body) {
  document.querySelector('#sheet-context').textContent = context;
  document.querySelector('#sheet-body').innerHTML =
    `<h2 id="sheet-title">${title}</h2>${body}`;
  sheet.open();
  dialog
    .querySelectorAll('a')
    .forEach((a) => (a.onclick = () => sheet.close()));
}
function showProduct(id) {
  const p = products.find((p) => p.id === id),
    performance = data.ranking.find((r) => r.id === id);
  openSheet(
    escape(p.name),
    p.category,
    `${productArt(p, true)}<p class="product-description">${p.description}</p><div class="detail-stats"><div><span>Precio</span><strong>${money(p.price)}</strong></div><div><span>Existencias</span><strong>${p.stock} uds.</strong></div><div><span>Ingresos del período</span><strong>${money(performance.revenue)}</strong></div><div><span>Unidades vendidas</span><strong>${performance.units}</strong></div></div><p class="stock-status ${p.stock <= p.min ? 'low' : ''}">${p.stock <= p.min ? 'Reposición recomendada' : 'Disponible'} · Mínimo ${p.min} unidades</p><p class="data-caption">Referencia DEMO-00${p.id} · Datos ficticios</p>`,
  );
}
function compareProducts() {
  const list = products.filter((p) => state.compare.has(p.id));
  if (list.length < 2) {
    toast('Selecciona al menos dos productos para comparar.');
    return;
  }
  openSheet(
    'Una comparación clara.',
    'CATÁLOGO FICTICIO',
    `<div class="table-scroll"><table><thead><tr><th>Producto</th>${list.map((p) => `<th>${p.name}</th>`).join('')}</tr></thead><tbody><tr><th>Precio</th>${list.map((p) => `<td>${money(p.price)}</td>`).join('')}</tr><tr><th>Stock</th>${list.map((p) => `<td>${p.stock} uds.</td>`).join('')}</tr><tr><th>Categoría</th>${list.map((p) => `<td>${p.category}</td>`).join('')}</tr></tbody></table></div>`,
  );
}
function bindProducts() {
  view
    .querySelectorAll('[data-product]')
    .forEach((b) => (b.onclick = () => showProduct(Number(b.dataset.product))));
  view.querySelectorAll('[data-compare]').forEach(
    (b) =>
      (b.onchange = () => {
        const id = Number(b.dataset.compare);
        if (b.checked && state.compare.size >= 3) {
          b.checked = false;
          toast('Puedes comparar hasta tres productos.');
          return;
        }
        b.checked ? state.compare.add(id) : state.compare.delete(id);
        document.querySelector('#compare-count').textContent =
          state.compare.size;
      }),
  );
}
function csv() {
  const blob = new Blob([toCsv(exportRows(data))], {
      type: 'text/csv;charset=utf-8',
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `datacore_demo_ventas_${state.days}dias_${state.branch.toLowerCase()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Exportación de demostración preparada.');
}
let toastTimer;
function toast(text) {
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}
function render() {
  data = analytics(state.days, state.branch);
  document.title = `${pages[page]} · DataCore AI`;
  document.querySelector('#breadcrumb').textContent = pages[page];
  navigation();
  viewAnimation?.cancel();
  view.innerHTML = {
    inicio: start,
    productos: catalogue,
    ventas: salesPage,
    inventario: inventoryPage,
    reportes: reportsPage,
    asistente: assistantPage,
  }[page]();
  if (!reducedMotion())
    viewAnimation = view.animate(
      [
        { opacity: 0.6, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 180, easing: 'ease-out' },
    );
  document.querySelector('#period')?.addEventListener('change', (e) => {
    state.days = Number(e.target.value);
    render();
    document.querySelector('#period').focus();
  });
  document.querySelector('#branch')?.addEventListener('change', (e) => {
    state.branch = e.target.value;
    render();
    document.querySelector('#branch').focus();
  });
  bindCharts(view, data);
  bindProducts();
  if (page === 'productos') {
    renderProducts();
    document.querySelector('#product-sort').value = state.sort;
    document.querySelector('#product-sort').onchange = (e) => {
      state.sort = e.target.value;
      renderProducts();
    };
    view.querySelectorAll('[data-category]').forEach(
      (b) =>
        (b.onclick = () => {
          state.category = b.dataset.category;
          view
            .querySelectorAll('[data-category]')
            .forEach((c) => c.setAttribute('aria-pressed', c === b));
          renderProducts();
        }),
    );
    document.querySelector('#compare-open').onclick = compareProducts;
  }
  view.querySelectorAll('[data-inventory]').forEach(
    (b) =>
      (b.onclick = () => {
        state.inventory = b.dataset.inventory;
        render();
      }),
  );
  document.querySelector('#export-csv')?.addEventListener('click', csv);
  document
    .querySelector('#print-report')
    ?.addEventListener('click', () => window.print());
  if (page === 'asistente') {
    renderConversation();
    const input = document.querySelector('#chat-input');
    document.querySelector('#chat-form').onsubmit = (e) => {
      e.preventDefault();
      send(input.value);
    };
    input.onfocus = () => {
      state.interacted = true;
      document.querySelector('.suggestions')?.setAttribute('hidden', '');
    };
    input.oninput = () => {
      if (input.value.trim()) {
        state.interacted = true;
        document.querySelector('.suggestions')?.setAttribute('hidden', '');
      }
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send(input.value);
      }
    };
    document.querySelector('#clear-chat').onclick = () => {
      state.messages = [];
      state.interacted = false;
      renderConversation();
      input.focus();
    };
  }
}
function route() {
  let hash;
  try {
    hash = decodeURIComponent(location.hash.slice(1)).toLowerCase();
  } catch {
    hash = 'inicio';
  }
  const aliases = { dashboard: 'inicio', 'asistente ia': 'asistente' };
  page = pages[hash] ? hash : aliases[hash] || 'inicio';
  document.body.classList.toggle('chat-active', page === 'asistente');
  render();
  window.scrollTo(0, 0);
}
document.querySelector('#sheet-close').innerHTML = icon('close');
document.querySelector('#sheet-close').onclick = sheet.close;
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  storage.set('datacore-theme', theme);
  const toggle = document.querySelector('#theme-toggle');
  toggle.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  toggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro',
  );
  document.querySelector('meta[name="theme-color"]').content =
    theme === 'dark' ? '#0e121c' : '#f0f2f6';
}
setTheme(
  storage.get(
    'datacore-theme',
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  ),
);
document.querySelector('#theme-toggle').onclick = () =>
  setTheme(
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
  );
function network() {
  const status = document.querySelector('#network-status');
  status.textContent = navigator.onLine ? '' : 'Sin conexión · Demo disponible';
}
addEventListener('online', network);
addEventListener('offline', network);
network();
window.visualViewport?.addEventListener('resize', () => {
  const keyboard = innerHeight - window.visualViewport.height > 140;
  document.body.classList.toggle('keyboard-open', keyboard);
  document.documentElement.style.setProperty(
    '--viewport-height',
    `${window.visualViewport.height}px`,
  );
});
addEventListener('hashchange', () => {
  route();
  view.focus({ preventScroll: true });
});
route();
if ('serviceWorker' in navigator)
  navigator.serviceWorker
    .register('./sw.js')
    .catch(() =>
      toast('No se pudo activar el modo offline. Puedes seguir navegando.'),
    );

const searchInput = document.querySelector('#global-search');
const searchPanel = document.querySelector('#global-results');
const searchMatches = document.querySelector('#search-matches');
const searchMotion = spring(
  (y) => (searchPanel.style.transform = `translateY(${y}px)`),
  0,
);
document.querySelector('#search-symbol').innerHTML = icon('search');
function closeSearch() {
  searchPanel.hidden = true;
  document.querySelector('#search-clear').hidden = !searchInput.value;
}
function searchGlobal() {
  const normalize = (value) =>
    value
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const query = normalize(searchInput.value.trim());
  document.querySelector('#search-clear').hidden = !query;
  if (!query) {
    closeSearch();
    return;
  }
  const stockQuery = /stock|inventario|repon|repos|agot/.test(query);
  const words = query
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          'que',
          'del',
          'los',
          'las',
          'con',
          'hay',
          'stock',
          'inventario',
          'productos',
          'producto',
          'cuanto',
          'cual',
          'precio',
          'reposicion',
        ].includes(w),
    );
  let matched = products.filter((p) =>
    words.length
      ? words.every((w) => normalize(p.name + ' ' + p.category).includes(w))
      : stockQuery,
  );
  if (/repon|repos|agot/.test(query))
    matched = matched.filter((p) => p.stock <= p.min);
  const links = Object.entries(pages).filter(
    ([id, label]) =>
      normalize(label + ' ' + id).includes(query) ||
      (stockQuery && id === 'inventario'),
  );
  document.querySelector('#search-status').textContent =
    `${matched.length} productos · ${links.length} secciones · Datos ficticios`;
  searchMatches.innerHTML =
    matched
      .map(
        (p) =>
          `<button type="button" class="search-result" data-search-product="${p.id}">${productArt(p)}<span><strong>${p.name}</strong><small>${p.category} · ${money(p.price)} · ${p.stock} unidades${p.stock <= p.min ? ' · Reponer' : ''}</small></span>${icon('arrow')}</button>`,
      )
      .join('') +
    links
      .map(
        ([id, label]) =>
          `<a class="search-result search-route" href="#${id}">${icon(id)}<span><strong>${label}</strong><small>Abrir sección</small></span>${icon('arrow')}</a>`,
      )
      .join('') +
    (!matched.length && !links.length
      ? '<div class="search-empty">Sin coincidencias. Prueba “jean”, “stock” o “ventas”.</div>'
      : '');
  const opening = searchPanel.hidden;
  searchPanel.hidden = false;
  if (opening) {
    searchMotion.set(-8);
    searchMotion.to(0);
  }
  searchMatches.querySelectorAll('[data-search-product]').forEach(
    (button) =>
      (button.onclick = () => {
        closeSearch();
        searchInput.blur();
        showProduct(Number(button.dataset.searchProduct));
      }),
  );
  searchMatches.querySelectorAll('a').forEach((a) => (a.onclick = closeSearch));
}
searchInput.addEventListener('input', searchGlobal);
searchInput.addEventListener('focus', () => {
  if (searchInput.value) searchGlobal();
});
document.querySelector('#search-clear').onclick = () => {
  searchInput.value = '';
  closeSearch();
  searchInput.focus();
};
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    searchMatches.querySelector('button,a')?.focus();
  }
  if (event.key === 'Escape') {
    closeSearch();
    searchInput.blur();
  }
});
searchPanel.addEventListener('keydown', (event) => {
  const items = [...searchMatches.querySelectorAll('button,a')],
    index = items.indexOf(document.activeElement);
  if (event.key === 'Escape') {
    searchInput.focus();
    closeSearch();
  }
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    items[
      (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
        items.length
    ]?.focus();
  }
});
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.global-search')) closeSearch();
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});
window.addEventListener('hashchange', closeSearch);
