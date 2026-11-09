import {
  products,
  customers,
  categories,
  lowStock,
  money,
  number,
} from "./data.js?v=original-v2";
import { icon } from "./icons.js?v=original-v2";
import { art } from "./product-art.js?v=original-v2";
import { inventoryStats, quotation } from "./catalogue-math.js?v=original-v2";
import {
  healthRing,
  categoryBars,
  stockMap,
  stockDonut,
  priceStock,
  inventoryMatrix,
} from "./charts.js?v=original-v2";
export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const tag = (text) => `<span class="eyebrow">${text}</span>`;
const head = (title, detail, action = "") =>
  `<header class="section-heading"><div><h2>${title}</h2><p>${detail}</p></div>${action}</header>`;
const stateLabel = (p) =>
  p.stock === 0 ? "Agotado" : p.stock <= p.min ? "Por reponer" : "Disponible";
const arrowLink = (href, text) =>
  `<a class="text-link" href="#${href}">${text}${icon("arrow")}</a>`;
const chips = (items, attr, selected, label) =>
  `<div class="chips" role="group" aria-label="${label}">${items.map((item) => `<button ${attr}="${item}" aria-pressed="${item === selected}">${item}</button>`).join("")}</div>`;

function ranking() {
  const list = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5),
    max = list[0].stock;
  return `<div class="ranking">${list.map((p, i) => `<button class="ranking-row" data-product="${p.id}"><span class="rank-index">0${i + 1}</span><span class="rank-main"><strong>${p.name}</strong><span class="bar-track"><i style="width:${(p.stock / max) * 100}%"></i></span></span><span class="rank-value">${p.stock}<small>uds.</small></span>${icon("chevron")}</button>`).join("")}</div>`;
}

function home() {
  const s = inventoryStats();
  return `<div class="home-kicker">${tag("TU NEGOCIO / EN PERSPECTIVA")}<span class="live-note"><i></i>Catálogo de prueba SQL</span></div>
  <section class="overview-hero"><div class="overview-reading"><h1>Todo bajo<br><em>tu mirada.</em></h1><div class="stock-display"><strong>${s.units}</strong><span>unidades<br>en inventario</span></div><div class="overview-caption"><span>Una vista. Cada referencia.</span><a href="#inventario" aria-label="Explorar inventario" class="round-button">${icon("arrow")}</a></div></div><div class="health-observatory">${tag("01 / ESTADO DEL CATÁLOGO")}${healthRing()}<p class="viz-note">${s.healthy} de ${s.count} referencias por encima de su stock mínimo.</p></div></section>
  <section class="overview-lower"><div class="metric-ribbon"><a href="#productos"><span>Productos</span><strong>${products.length}<small>en ${categories.length} categorías</small></strong>${icon("arrow")}</a><a href="#clientes"><span>Clientes</span><strong>${customers.length}<small>en tu directorio</small></strong>${icon("arrow")}</a><div><span>Valor de catálogo</span><strong class="money-metric">${money(s.valueCents / 100)}</strong><small>Existencias × precio; no ingresos</small></div></div><a class="priority-link" href="#inventario" data-go-low><span class="priority-count">${lowStock.length}</span><span>${tag("MERECEN TU ATENCIÓN")}<strong>Hora de reponer.</strong><small>Una referencia está agotada.</small></span>${icon("arrow")}</a></section>
  <section class="category-strip" aria-label="Explorar categorías">${s.categories.map((c, i) => `<button data-category-route="${c.name}"><span class="category-index">0${i + 1}</span><strong>${c.name}</strong><span>${c.count} productos <i>·</i> ${c.units} uds.</span>${icon("arrow")}</button>`).join("")}</section>
  <div class="home-analysis"><section>${head("El peso de cada categoría.", "Comparación de unidades disponibles", arrowLink("reportes", "Explorar reportes"))}${categoryBars()}</section><section>${head("Donde más unidades hay.", "Las cinco referencias con mayor stock")}${ranking()}</section></div>`;
}

export function featureMarkup(p) {
  return `<div class="feature-copy">${tag("EN FOCO / " + p.category.toLocaleUpperCase("es"))}<h2>${p.name}</h2><p>Consulta precio, existencias y compara<br>con otras referencias del catálogo.</p><div><strong>${money(p.price)}</strong><span>${p.stock} unidades · ${stateLabel(p).toLowerCase()}</span></div><button class="button primary" data-product="${p.id}">Explorar producto ${icon("arrow")}</button></div><button class="feature-object" data-product="${p.id}" aria-label="Ver detalles de ${p.name}"><span class="object-orbit" aria-hidden="true"></span>${art(p, true)}</button><span class="feature-edition">DATACORE / ${p.code}</span>`;
}

function catalogue(s) {
  return `<header class="catalog-heading"><div>${tag("COLECCIÓN / " + products.length + " REFERENCIAS")}<h1>Productos<span>.</span></h1></div><button id="compare-open" class="button secondary">${icon("productos")}Comparar <span id="compare-count">${s.compare.size}</span></button></header>
  <section class="catalog-focus" id="catalog-focus">${featureMarkup(products.find((p) => s.category === "Todos" || p.category === s.category))}</section>
  <div class="catalog-tools">${chips(["Todos", ...categories], "data-category", s.category, "Filtrar categoría")}<label class="select-label"><span class="sr-only">Ordenar productos</span><select id="product-sort"><option value="name">Nombre</option><option value="price">Menor precio</option><option value="price-desc">Mayor precio</option><option value="stock">Menor stock</option></select></label></div><p id="catalog-count" class="results-count" aria-live="polite"></p><div id="product-grid" class="product-grid"></div>`;
}

export function productMarkup(p, selected) {
  return `<article class="product"><button class="product-open" data-product="${p.id}" aria-label="Ver detalles de ${p.name}"><span class="product-category">${p.category}<small>${p.code}</small></span>${art(p, true)}<h2>${p.name}</h2><span class="product-price">${money(p.price)}</span></button><div class="product-footer"><span class="stock-status ${p.stock <= p.min ? "low" : ""}"><i></i>${p.stock} uds.${p.stock <= p.min ? " · " + stateLabel(p) : ""}</span><label class="compare-label"><input type="checkbox" data-compare="${p.id}" ${selected ? "checked" : ""}>Comparar</label></div></article>`;
}

function clients(s) {
  const initials = [...new Set(customers.map((c) => c.name[0]))].sort(),
    list = customers
      .filter(
        (c) =>
          s.customerInitial === "Todos" || c.name.startsWith(s.customerInitial),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return `<section class="people-intro"><div>${tag("RELACIONES / TU DIRECTORIO")}<h1>Detrás de cada<br>nombre, <em>una persona.</em></h1><p>Tu directorio de prueba, organizado por nombre. Encuentra una ficha desde la búsqueda superior.</p></div><div class="directory-number"><strong>${customers.length}</strong><span>clientes<br>de prueba</span></div></section><div class="people-avatars" aria-hidden="true">${customers
    .slice(0, 6)
    .map(
      (c, i) =>
        `<span style="--order:${i}">${c.name
          .split(" ")
          .map((n) => n[0])
          .join("")}</span>`,
    )
    .join(
      "",
    )}<span class="avatar-rest">+${Math.max(0, customers.length - 6)}</span></div>
  <div class="directory-bar">${tag("A — Z / PERSONAS")}${chips(["Todos", ...initials], "data-initial", s.customerInitial, "Filtrar clientes por inicial")}</div><div class="client-directory">${list.map((c) => `<button class="client-row" data-client="${c.id}"><span class="client-initial">${c.name[0]}</span><span><strong>${c.name}</strong><small>${c.document}</small></span><span class="client-action">Ver ficha ${icon("arrow")}</span></button>`).join("")}</div><p class="data-caption">Directorio ficticio de SQL. Los contactos no se publican.</p>`;
}

function sales(s) {
  const q = quotation(s.quoteLines);
  const customer = customers.find((c) => c.id === s.quoteCustomer);
  return `<header class="sales-heading"><div>${tag("VENTAS / ESTUDIO DE COTIZACIÓN")}<h1>Del producto<br><em>a la posibilidad.</em></h1></div><span class="mode-badge">Simulación · sin registrar ventas</span></header>
  <div class="sales-studio"><section class="quote-workbench">${head("Construye una cotización.", "Con los precios y las existencias de prueba de SQL.")}<form id="quote-form"><label for="quote-product">Producto</label><select id="quote-product">${products.map((p) => `<option value="${p.code}" ${p.stock === 0 ? "disabled" : ""}>${p.name} · ${money(p.price)}${p.stock === 0 ? " · agotado" : ""}</option>`).join("")}</select><div class="quantity-and-add"><label for="quote-quantity">Cantidad<input type="number" id="quote-quantity" min="1" max="${products[0].stock}" value="1" required inputmode="numeric"></label><button class="button primary" type="submit">${icon("plus")} Añadir producto</button></div><p id="quote-help" class="field-help">${products[0].stock} unidades de prueba disponibles.</p><p id="quote-error" class="field-error" role="alert"></p></form><div class="quote-client"><label for="quote-customer">Preparada para</label><select id="quote-customer"><option value="">Seleccionar cliente</option>${customers.map((c) => `<option value="${c.id}" ${c.id === s.quoteCustomer ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div class="quote-explainer">${icon("inventario")}<p>Explora combinaciones y cantidades. Esta cotización no descuenta existencias ni registra una venta.</p></div></section>
  <section class="quote-paper" aria-label="Vista previa de la cotización"><div class="invoice-top"><strong>DataCore<span> AI</span></strong><span>COTIZACIÓN<br>DE PRUEBA</span></div><div class="invoice-person"><span>Preparada para</span><h2>${customer ? esc(customer.name) : "Tu próximo paso."}</h2><p>${customer ? esc(customer.document) : "Selecciona un cliente para exportar."}</p></div><div class="quote-items">${q.items.length ? q.items.map((p) => `<div class="quote-item"><div><strong>${p.name}</strong><small>${p.quantity} × ${money(p.price)}</small></div><span>${money(p.subtotalCents / 100)}</span><button data-remove-quote="${p.code}" aria-label="Quitar ${p.name}">${icon("close")}</button></div>`).join("") : `<div class="quote-empty">${icon("productos")}<h3>Aquí empieza<br>tu próxima combinación.</h3><p>Añade productos para ver el cálculo.</p></div>`}</div><div class="quote-total"><span>Importe estimado<small>${q.units} unidades</small></span><strong>${money(q.totalCents / 100)}</strong></div><button class="button invoice-export" id="quote-export" ${!q.items.length || !customer ? "disabled" : ""}>Exportar cotización CSV ${icon("down")}</button><p class="invoice-note">Cálculo transitorio. No es una venta registrada.</p></section></div>
  <section class="sales-history"><div>${tag("HISTORIAL DE VENTAS")}<h2>Un espacio para lo que viene.</h2><p>Los scripts contienen los productos y clientes de prueba, pero no incluyen ventas precargadas. No se calculan ingresos históricos a partir de esta simulación.</p></div><div class="backend-check"><button class="button secondary" data-check-backend>Comprobar integración ${icon("arrow")}</button><p class="backend-status" role="status"></p></div></section>`;
}

function inventory(s) {
  const summary = inventoryStats(),
    list = products
      .filter(
        (p) =>
          s.inventory === "Todos" ||
          (s.inventory === "Por reponer" ? p.stock <= p.min : p.stock > p.min),
      )
      .sort((a, b) => a.stock - b.stock);
  return `<section class="inventory-heading"><div>${tag("INVENTARIO / CADA UNIDAD IMPORTA")}<h1>Lo esencial,<br><em>bajo control.</em></h1></div><div class="inventory-total"><strong>${summary.units}</strong><span>unidades de prueba<br>en ${summary.count} referencias</span></div></section>
  <section class="inventory-observatory"><div class="matrix-heading">${tag("01 — 20 / MAPA DE DISPONIBILIDAD")}<span>Toca una posición para ver el producto.</span></div>${inventoryMatrix()}<div class="matrix-legend"><span><i class="healthy"></i>${summary.healthy} sobre el mínimo</span><span><i class="low"></i>${summary.low} con stock bajo</span><span><i class="empty"></i>${summary.empty} agotado</span></div></section>
  <section class="replenishment">${head("Primero, lo que necesita atención.", `${lowStock.length} referencias en el mínimo o por debajo`)}<div class="replenishment-rail">${[
    ...lowStock,
  ]
    .sort((a, b) => a.stock - b.stock)
    .map(
      (p) =>
        `<button class="replenishment-item" data-product="${p.id}"><span>${p.stock === 0 ? "AGOTADO" : "REPOSICIÓN"}</span>${art(p)}<strong>${p.name}</strong><div><b>${p.stock}</b><small>unidades / mín. ${p.min}</small></div>${icon("arrow")}</button>`,
    )
    .join("")}</div></section>
  <div class="inventory-register-heading"><h2>El detalle, unidad a unidad.</h2>${chips(["Todos", "Por reponer", "Disponibles"], "data-inventory", s.inventory, "Filtrar inventario")}</div><div class="inventory-list">${list.map((p) => `<button class="inventory-row" data-product="${p.id}"><span class="inventory-reference">${p.code.replace("DEMO-", "")}</span><span class="inventory-name"><strong>${p.name}</strong><small>${p.category} · mínimo ${p.min}</small></span><span class="inventory-track"><i style="width:${Math.min(100, (p.stock / Math.max(p.min * 4, 1)) * 100)}%"></i></span><span class="inventory-quantity">${p.stock}<small>unidades</small></span><span class="stock-status ${p.stock <= p.min ? "low" : ""}">${stateLabel(p)}</span>${icon("chevron")}</button>`).join("")}</div>`;
}

function reports(s) {
  const list = products.filter(
      (p) => s.reportCategory === "Todas" || p.category === s.reportCategory,
    ),
    stats = inventoryStats(list),
    valuation = s.reportMetric === "value";
  return `<header class="reports-heading"><div>${tag("REPORTES / OTRO ÁNGULO")}<h1>Los datos tienen<br><em>más de una lectura.</em></h1></div><label class="select-label"><span>Categoría del reporte</span><select id="report-category">${["Todas", ...categories].map((c) => `<option ${c === s.reportCategory ? "selected" : ""}>${c}</option>`).join("")}</select></label></header>
  <div class="report-lead"><div><span>Unidades</span><strong>${stats.units}</strong><small>${list.length} referencias.</small></div><div><span>Valor de catálogo</span><strong>${money(stats.valueCents / 100)}</strong><small>Existencias × precio. No es costo ni ingreso.</small></div><div class="report-export"><button class="button primary" id="export-csv">${icon("down")}Exportar CSV</button><button class="button secondary" id="print-report">Guardar vista como PDF ${icon("arrow")}</button></div></div>
  <section class="treemap-stage">${head("El espacio de cada referencia.", valuation ? "Participación en el valor de catálogo" : "Participación en unidades", `<div class="segmented" role="group" aria-label="Medida del gráfico"><button data-report-metric="units" aria-pressed="${!valuation}">Unidades</button><button data-report-metric="value" aria-pressed="${valuation}">Valor</button></div>`)}${stockMap(list, s.reportMetric)}</section>
  <div class="report-diptych"><section>${head("Categorías en perspectiva.", valuation ? "Valor de catálogo por categoría" : "Unidades por categoría")}${categoryBars(list, s.reportMetric)}</section><section class="report-distribution">${head("Así se reparte el inventario.", "Proporción de unidades por categoría")}${stockDonut(list)}</section></div><section class="report-scatter">${head("Precio y disponibilidad.", `Las ${list.length} referencias del filtro; consulta cada punto`)}${priceStock(list)}</section>
  <details class="data-details"><summary>Ver los datos del reporte ${icon("down")}</summary><div class="table-scroll"><table><thead><tr><th>Código</th><th>Producto</th><th>Precio</th><th>Existencias</th><th>Mínimo</th></tr></thead><tbody>${list.map((p) => `<tr><td>${p.code}</td><td>${p.name}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.min}</td></tr>`).join("")}</tbody></table></div></details><p class="data-caption">Datos de prueba de SQL. Los reportes de ventas y su evolución requieren un historial; no se sustituyen por cifras inventadas.</p>`;
}

function assistant(s) {
  return `<section class="assistant-page"><header class="assistant-header"><div>${tag("ASISTENTE / ESPACIO PARA PREGUNTAR")}<h1>Una pregunta.<br><em>Un nuevo ángulo.</em></h1></div><button id="clear-chat" class="button secondary" ${s.busy ? "disabled" : ""}>${icon("plus")}Nueva conversación</button></header><p class="assistant-disclosure"><span class="assistant-signal" aria-hidden="true"></span><span><strong>Modo local · Datos de prueba</strong>Consulta del catálogo, precios y existencias. Sin IA generativa conectada.</span></p><div class="conversation" id="conversation" role="log" aria-live="polite" aria-label="Conversación"></div><form class="composer" id="chat-form"><label for="chat-input" class="sr-only">Pregunta sobre los datos de prueba</label><textarea id="chat-input" rows="1" maxlength="2000" placeholder="¿Qué te gustaría saber?" enterkeyhint="send"></textarea><button type="submit" class="send-button" aria-label="Enviar pregunta">${icon("up")}</button><small>Pregunta con libertad. El asistente reconoce lo que no está en los datos.</small></form></section>`;
}

export function renderPage(page, state) {
  return {
    inicio: home,
    productos: catalogue,
    clientes: clients,
    ventas: sales,
    inventario: inventory,
    reportes: reports,
    asistente: assistant,
  }[page](state);
}
