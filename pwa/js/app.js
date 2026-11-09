import {
  products,
  customers,
  categories,
  lowStock,
  provenance,
  money,
  number,
  exportRows,
  toCsv,
} from "./data.js?v=atlas-sql-v1";
import { icon, pages } from "./icons.js?v=atlas-sql-v1";
import {
  stockDonut,
  stockMap,
  priceStock,
  schemaMap,
  bindCharts,
} from "./charts.js?v=atlas-sql-v1";
import { setupSheet, reducedMotion, spring } from "./motion.js?v=atlas-sql-v1";
import { ask } from "./assistant.js?v=atlas-sql-v1";
const view = document.querySelector("#view"),
  dialog = document.querySelector("#sheet"),
  sheet = setupSheet(dialog);
const state = {
  category: "Todos",
  sort: "name",
  inventory: "Todos",
  customerInitial: "Todos",
  reportCategory: "Todas",
  compare: new Set(),
  messages: [],
  busy: false,
  interacted: false,
};
let page = "inicio",
  renderedPage,
  animation;
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const totalStock = products.reduce((n, p) => n + p.stock, 0);
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
    } catch {}
  },
};
const navLink = (id) =>
  `<a href="#${id}" data-nav="${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(id)}<span>${pages[id]}</span>${id === "inventario" ? `<small>${lowStock.length}</small>` : ""}</a>`;
function navigation() {
  document.querySelector("#desktop-nav").innerHTML =
    `<div class="nav-cluster">${navLink("inicio")}</div><div class="nav-cluster"><p class="nav-group-label">REGISTROS</p>${["productos", "clientes", "ventas", "inventario"].map(navLink).join("")}</div><div class="nav-cluster"><p class="nav-group-label">PERSPECTIVAS</p>${["reportes", "asistente"].map(navLink).join("")}</div>`;
  document.querySelector("#mobile-nav").innerHTML =
    ["inicio", "productos", "ventas", "asistente"].map(navLink).join("") +
    `<button id="more-nav" ${["clientes", "inventario", "reportes"].includes(page) ? 'aria-current="page"' : ""}>${icon("more")}<span>Más</span></button>`;
  document.querySelector("#more-nav").onclick = () =>
    openSheet(
      "Más perspectivas.",
      "ATLAS / NAVEGACIÓN",
      `<nav class="more-links" aria-label="Más secciones">${["clientes", "inventario", "reportes"].map(navLink).join("")}</nav>`,
    );
}
function heading(index, title, subtitle, action = "") {
  return `<section class="page-heading"><div><span class="eyebrow">DATACORE / ${index}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</section>`;
}
function sectionHead(title, sub, action = "") {
  return `<header class="section-heading"><div><h2>${title}</h2><p>${sub}</p></div>${action}</header>`;
}
function art(p, large = false) {
  return `<div class="product-art ${p.color} ${large ? "large" : ""}">${icon(p.symbol)}</div>`;
}
function sourceBar() {
  return `<div class="source-bar"><span><i></i>Fuente: scripts SQL originales</span><button type="button" data-source-info>Sin conexión al servidor ${icon("arrow")}</button></div>`;
}
function ranking() {
  const sorted = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5),
    max = sorted[0].stock;
  return `<div class="ranking">${sorted.map((p, i) => `<button class="ranking-row" data-product="${p.id}"><span class="rank-index">0${i + 1}</span>${art(p)}<span class="rank-main"><strong>${p.name}</strong><span class="bar-track"><span style="width:${(p.stock / max) * 100}%"></span></span></span><span class="rank-value">${p.stock} uds. ${icon("chevron")}</span></button>`).join("")}</div>`;
}
function start() {
  return (
    heading(
      "01 / EL ORIGEN",
      "Los datos,<br><em>con memoria.</em>",
      "La fuente importa tanto como lo que nos cuenta.",
      `<button class="button secondary" data-source-info>Explorar la fuente ${icon("arrow")}</button>`,
    ) +
    sourceBar() +
    `
 <section class="consolidated-hero"><div class="source-folio hero-reading"><span class="eyebrow">CATÁLOGO ORIGINAL</span><div class="folio-number hero-value">${products.length}</div><h2>referencias.<br>Una sola fuente.</h2><p>Definidas en los scripts originales.<br>Sin mezclar las otras demos.</p><a href="#productos" class="folio-link">Abrir catálogo ${icon("arrow")}</a></div><div class="model-observatory"><header class="viz-heading"><span>MODELO / DATACOREAI</span><small>6 tablas declaradas</small></header>${schemaMap()}</div></section>
 <div class="metric-ribbon"><div><span>Unidades en el script</span><strong>${number(totalStock)}</strong></div><div><span>Categorías originales</span><strong>${categories.length}</strong></div><a href="#clientes"><span>Clientes de prueba</span><strong>${customers.length}<small> ver directorio ${icon("arrow")}</small></strong></a><a href="#ventas"><span>Historial de ventas</span><strong>—<small> no recuperado ${icon("arrow")}</small></strong></a></div>
 <div class="atlas-home-bottom"><section>${sectionHead("Las existencias, al frente.", "Ranking de cantidades definidas en el script", `<a href="#inventario" class="text-link">Inventario ${icon("arrow")}</a>`)}${ranking()}</section><section class="revenue-composition">${sectionHead("Un catálogo en cuatro partes.", "Distribución de unidades, no de ingresos")}${stockDonut()}</section></div>
 <a class="integrity-note" href="#ventas"><span class="integrity-symbol">—</span><span><strong>Un dato ausente también cuenta una historia.</strong><small>No hay ventas en los scripts recuperados. Los ingresos y tendencias permanecerán sin calcular hasta consultar la base original.</small></span>${icon("arrow")}</a>`
  );
}
function catalogue() {
  return (
    heading(
      "02 / REFERENCIAS",
      "El detalle<br><em>hace la diferencia.</em>",
      "Productos definidos en la fuente original. Precios y cantidades de prueba.",
      `<button id="compare-open" class="button secondary">${icon("productos")} Comparar <span id="compare-count">${state.compare.size}</span></button>`,
    ) +
    sourceBar() +
    `<div class="catalog-edition"><div><strong>${products.length}</strong><span>REFERENCIAS<br>SQL ORIGINAL</span></div><p>${categories.length} categorías.<br>Códigos DEMO-001 a DEMO-020.</p><span class="catalog-stamp">ATLAS / SQL<br>FUENTE ÚNICA</span></div><div class="catalog-tools"><p>Busca nombres, códigos y stock en la barra superior.</p><label class="select-label"><span class="sr-only">Ordenar productos</span><select id="product-sort"><option value="name">Nombre</option><option value="price">Menor precio</option><option value="stock">Menor stock</option></select></label></div><div class="chips" role="group" aria-label="Filtrar categoría">${["Todos", ...categories].map((c) => `<button data-category="${c}" aria-pressed="${state.category === c}">${c}</button>`).join("")}</div><p id="catalog-count" class="results-count" aria-live="polite"></p><div id="product-grid" class="product-grid"></div>`
  );
}
function renderProducts() {
  const list = products
    .filter((p) => state.category === "Todos" || p.category === state.category)
    .sort((a, b) =>
      state.sort === "name"
        ? a.name.localeCompare(b.name)
        : a[state.sort] - b[state.sort],
    );
  document.querySelector("#catalog-count").textContent =
    `${list.length} referencias · datos de prueba del script, no inventario en vivo`;
  document.querySelector("#product-grid").innerHTML = list
    .map(
      (p) =>
        `<article class="product"><button class="product-open" data-product="${p.id}" aria-label="Ver detalles de ${p.name}">${art(p, true)}<span class="product-category">${p.code} / ${p.category}</span><h2>${p.name}</h2><span class="product-price">${money(p.price)}</span></button><div class="product-footer"><span class="stock-status ${p.stock <= p.min ? "low" : ""}"><i></i>${p.stock} uds. del script${p.stock <= p.min ? " · Reponer" : ""}</span><label class="compare-label"><input type="checkbox" data-compare="${p.id}" ${state.compare.has(p.id) ? "checked" : ""}>Comparar</label></div></article>`,
    )
    .join("");
  bindProducts();
}
function clientsPage() {
  const initials = [...new Set(customers.map((c) => c.name[0]))].sort();
  const list = customers.filter(
    (c) =>
      state.customerInitial === "Todos" ||
      c.name.startsWith(state.customerInitial),
  );
  return (
    heading(
      "03 / PERSONAS",
      "Cada nombre,<br><em>un vínculo posible.</em>",
      "Los diez clientes ficticios definidos en el script original. Sin compras atribuidas.",
    ) +
    sourceBar() +
    `<div class="directory-heading"><strong>${customers.length}</strong><div><span>CLIENTES ORIGINALES</span><p>Documento de prueba como referencia.<br>Los valores de ClienteID no se han recuperado.</p></div></div><div class="chips directory-alphabet" role="group" aria-label="Filtrar clientes por inicial">${["Todos", ...initials].map((c) => `<button data-initial="${c}" aria-pressed="${state.customerInitial === c}">${c}</button>`).join("")}</div><div class="client-directory">${list.map((c) => `<button class="client-row" data-client="${c.id}"><span class="client-initial">${c.name[0]}</span><span><strong>${c.name}</strong><small>${c.document} · registro de prueba original</small></span><span class="client-action">Ver ficha ${icon("arrow")}</span></button>`).join("")}</div><p class="data-caption">No se publican correos ni teléfonos. El detalle de contacto del servidor requerirá permisos de Clientes.</p>`
  );
}
function unavailable(title = "El historial aún no está aquí.") {
  return `<section class="history-gap"><span class="gap-symbol" aria-hidden="true">—</span><div><span class="eyebrow">ORIGEN INCOMPLETO / VENTAS</span><h2>${title}</h2><p>Los scripts crean Ventas y DetalleVentas, pero no incluyen sus registros. Esto no significa que la base original tenga cero ventas.</p><div class="gap-metrics"><span>Ingresos <strong>—</strong></span><span>Operaciones <strong>—</strong></span><span>Variación <strong>—</strong></span></div><button class="button secondary" data-check-backend>Comprobar integración ${icon("arrow")}</button><p class="backend-status" role="status"></p></div></section>`;
}
function salesPage() {
  return (
    heading(
      "04 / OPERACIONES",
      "Antes de contar,<br><em>hay que conocer.</em>",
      "El modelo de ventas está recuperado. Su historial no está disponible.",
    ) +
    sourceBar() +
    unavailable() +
    `<section class="original-contract">${sectionHead("Una venta. Varios detalles.", "Relaciones declaradas, no operaciones recuperadas")}<div class="contract-flow"><div><span>dbo.Clientes</span><strong>ClienteID</strong></div>${icon("arrow")}<div><span>dbo.Ventas</span><strong>VentaID</strong><small>ClienteID · Fecha · Total</small></div>${icon("arrow")}<div><span>dbo.DetalleVentas</span><strong>DetalleVentaID</strong><small>VentaID · ProductoID · Cantidad</small></div></div><p class="viz-note">Las solicitudes de confirmación se relacionan con VentaID. Se conservan las claves y la idempotencia del diseño original.</p></section><details class="data-details"><summary>Fechas, filtros y sucursales</summary><p>No se han recuperado fechas de ventas. La API permite filtrar un intervalo inclusivo y productos/categorías cuando exista conexión. El esquema original no tiene sucursales: ese filtro no se ofrece ni se simula.</p></details>`
  );
}
function inventoryPage() {
  const list = products
    .filter(
      (p) =>
        state.inventory === "Todos" ||
        (state.inventory === "Por reponer"
          ? p.stock <= p.min
          : p.stock > p.min),
    )
    .sort((a, b) => a.stock - b.stock);
  return (
    heading(
      "05 / EXISTENCIAS",
      "Lo que había.<br><em>Lo que sabemos.</em>",
      "Cantidades exactas del script original. Sin confirmar disponibilidad actual.",
    ) +
    sourceBar() +
    `<div class="inventory-top"><div class="inventory-total"><strong>${totalStock}</strong><span>unidades en la fuente<br>no es una lectura en vivo</span></div><p class="inventory-callout"><span class="status-dot"></span><strong>${lowStock.length} referencias en el mínimo o por debajo</strong><br><span>Una referencia tiene cero existencias en el script.</span></p></div><section class="replenishment"><header><span class="eyebrow">ATENCIÓN / SEGÚN EL SCRIPT</span><h2>Una lectura de la reposición.</h2></header><div class="replenishment-rail">${[
      ...lowStock,
    ]
      .sort((a, b) => a.stock - b.stock)
      .map(
        (p) =>
          `<button class="replenishment-item" data-product="${p.id}"><span>${p.stock === 0 ? "AGOTADO EN EL SCRIPT" : "STOCK BAJO EN EL SCRIPT"}</span><strong>${p.name}</strong><div><b>${p.stock}</b><small>unidades / mín. ${p.min}</small></div>${icon("arrow")}</button>`,
      )
      .join(
        "",
      )}</div></section><div class="chips" role="group" aria-label="Filtrar inventario">${["Todos", "Por reponer", "Disponibles"].map((c) => `<button data-inventory="${c}" aria-pressed="${state.inventory === c}">${c}</button>`).join("")}</div><div class="inventory-list">${list.map((p) => `<button class="inventory-row" data-product="${p.id}">${art(p)}<span class="inventory-name"><strong>${p.name}</strong><small>${p.code} · mínimo ${p.min}</small></span><span class="inventory-track"><span class="${p.stock <= p.min ? "low" : ""}" style="width:${Math.min(100, (p.stock / Math.max(p.min * 4, 1)) * 100)}%"></span></span><span class="inventory-quantity">${p.stock}<small>del script</small></span><span class="stock-status ${p.stock <= p.min ? "low" : ""}">${p.stock <= p.min ? "Reponer" : "Disponible"}</span>${icon("chevron")}</button>`).join("")}</div>`
  );
}
function reportsPage() {
  const list = products.filter(
    (p) =>
      state.reportCategory === "Todas" || p.category === state.reportCategory,
  );
  return (
    heading(
      "06 / OBSERVATORIO",
      "Lo verificable,<br><em>a la vista.</em>",
      "Analítica de catálogo e inventario original. Sin ingresos o tendencias inventados.",
      `<label class="select-label"><span class="sr-only">Categoría del reporte</span><select id="report-category">${["Todas", ...categories].map((c) => `<option ${c === state.reportCategory ? "selected" : ""}>${c}</option>`).join("")}</select></label>`,
    ) +
    sourceBar() +
    `<section class="report-lead"><div><span class="eyebrow">EXISTENCIAS DEL SCRIPT / ${esc(state.reportCategory)}</span><h2>${list.reduce((n, p) => n + p.stock, 0)} unidades.<br><span>${list.length} referencias.</span></h2><p>Las cantidades corresponden al archivo original, no a una consulta actual.</p></div><div class="report-export"><button class="button primary" id="export-csv">${icon("down")} Exportar inventario CSV</button><button class="button secondary" id="print-report">Guardar vista como PDF ${icon("arrow")}</button><small>El CSV conserva el filtro y la procedencia.<br> El PDF usa la impresión del sistema.</small></div></section><section class="treemap-stage">${sectionHead("El espacio de cada referencia.", "Mapa de cantidades, no de ingresos")}${stockMap(list)}</section><div class="report-diptych"><section class="report-distribution">${sectionHead("La composición del inventario.", "Existencias por categoría")}${stockDonut(list)}</section><section>${sectionHead("Precio y existencias.", "Los dos valores disponibles en la fuente")}${priceStock(list)}</section></div><section class="report-sales-note">${unavailable("Los reportes financieros esperan al historial.")}</section><details class="data-details"><summary>Consultar detalle verificable</summary><div class="table-scroll"><table><thead><tr><th>Código</th><th>Producto</th><th>Precio</th><th>Existencias del script</th><th>Mínimo</th></tr></thead><tbody>${list.map((p) => `<tr><td>${p.code}</td><td>${p.name}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.min}</td></tr>`).join("")}</tbody></table></div></details>`
  );
}
function assistantPage() {
  return `<section class="assistant-page"><header class="assistant-header"><div><span class="eyebrow">07 / CONVERSACIÓN</span><h1>Una pregunta.<br><em>Una perspectiva.</em></h1></div><button id="clear-chat" class="button secondary" ${state.busy ? "disabled" : ""}>Nueva conversación</button></header><p class="assistant-disclosure">${icon("asistente")}<span><strong>Consulta local de scripts · Sin IA generativa</strong>Preguntas abiertas sobre la fuente original. No consulta SQL Server ni inventa ventas.</span></p><div class="conversation" id="conversation" role="log" aria-live="polite" aria-label="Conversación"></div><form class="composer" id="chat-form"><label for="chat-input" class="sr-only">Pregunta sobre los datos originales</label><textarea id="chat-input" rows="1" maxlength="2000" placeholder="Pregunta con tus palabras…" enterkeyhint="send"></textarea><button type="submit" class="send-button" aria-label="Enviar pregunta">${icon("up")}</button><small>Fuente original explícita. No hay un modelo de lenguaje conectado.</small></form></section>`;
}
function renderConversation() {
  const log = document.querySelector("#conversation");
  if (!log) return;
  log.innerHTML = state.messages.length
    ? state.messages
        .map(
          (m) =>
            `<article class="message ${m.role}"><span class="message-label">${m.role === "user" ? "Tú" : "DataCore / consulta local"}</span><p>${esc(m.text)}</p></article>`,
        )
        .join("")
    : `<div class="conversation-intro"><div class="assistant-orb">${icon("asistente")}</div><h2>La claridad<br><em>empieza preguntando.</em></h2><p>Explora el catálogo original, los precios o las existencias.<br> Las respuestas reconocen lo que falta.</p><div class="suggestions" ${state.interacted ? "hidden" : ""}>${["¿Qué productos deberían reponerse?", "¿Qué producto genera mayores ingresos?", "Muéstrame los clientes originales"].map((q) => `<button data-prompt="${q}">${q}${icon("arrow")}</button>`).join("")}</div></div>`;
  if (state.busy)
    log.insertAdjacentHTML(
      "beforeend",
      '<p class="processing" role="status">Consultando la copia del script…</p>',
    );
  log
    .querySelectorAll("[data-prompt]")
    .forEach((b) => (b.onclick = () => send(b.dataset.prompt)));
}
async function send(question) {
  if (state.busy || !question.trim()) return;
  state.interacted = true;
  state.messages.push({ role: "user", text: question.trim().slice(0, 2000) });
  state.busy = true;
  const input = document.querySelector("#chat-input");
  input.value = "";
  input.style.height = "auto";
  renderConversation();
  document.querySelector(".send-button").disabled = true;
  try {
    state.messages.push({ role: "assistant", text: await ask(question) });
  } catch {
    state.messages.push({
      role: "assistant",
      text: "No se pudo completar la consulta. No se generaron cifras de sustitución. Puedes volver a preguntar.",
    });
  } finally {
    state.busy = false;
    renderConversation();
    document.querySelector(".send-button")?.removeAttribute("disabled");
    document.querySelector(".message:last-child")?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion() ? "instant" : "smooth",
    });
  }
}
function openSheet(title, context, body) {
  document.querySelector("#sheet-context").textContent = context;
  document.querySelector("#sheet-body").innerHTML =
    `<h2 id="sheet-title">${title}</h2>${body}`;
  sheet.open();
  dialog
    .querySelectorAll("a")
    .forEach((a) => (a.onclick = () => sheet.close()));
}
function showSource() {
  openSheet(
    "Una fuente.<br>Sin sustituciones.",
    "TRAZABILIDAD",
    `<p class="product-description">Se recuperaron las definiciones de seis tablas y los datos de prueba declarados para 20 productos, cuatro categorías y 10 clientes.</p><div class="source-facts"><span>SQL Server conectado <strong>No</strong></span><span>Ventas originales recuperadas <strong>No</strong></span><span>Sucursales en el esquema <strong>No existen</strong></span><span>Claves IDENTITY originales <strong>No recuperadas</strong></span></div><div class="source-files">${Object.entries(
      provenance.files,
    )
      .map(
        ([file, hash]) =>
          `<div><strong>${file}</strong><code>SHA-256 ${hash.slice(0, 16)}…</code></div>`,
      )
      .join(
        "",
      )}</div><p class="data-caption">Las demos PWA e iOS anteriores están excluidas de esta vista. Los scripts originales permanecen sin cambios y no se han ejecutado.</p>`,
  );
}
function showProduct(id) {
  const p = products.find((p) => p.id === id);
  if (!p) return;
  openSheet(
    esc(p.name),
    p.code,
    `${art(p, true)}<p class="product-description">${p.description}</p><div class="detail-stats"><div><span>Precio del script</span><strong>${money(p.price)}</strong></div><div><span>Existencias del script</span><strong>${p.stock} uds.</strong></div><div><span>Categoría original</span><strong>${p.category}</strong></div><div><span>Stock mínimo</span><strong>${p.min} uds.</strong></div></div><p class="stock-status ${p.stock <= p.min ? "low" : ""}">${p.stock <= p.min ? "Reposición según el script" : "Por encima del mínimo en el script"}</p><p class="data-caption">Código ${p.code}. No se conoce su ProductoID en la base original. Fuente: sql/02_datos_prueba.sql.</p>`,
  );
}
function showClient(id) {
  const c = customers.find((c) => c.id === id);
  if (c)
    openSheet(
      esc(c.name),
      "CLIENTE ORIGINAL",
      `<div class="client-monogram">${c.name[0]}</div><div class="detail-stats"><div><span>Documento de prueba</span><strong>${c.document}</strong></div><div><span>Procedencia</span><strong>Script original</strong></div></div><p class="product-description">No se ha recuperado ClienteID ni una relación con ventas concretas. El contacto del servidor requiere acceso autenticado; no se publica en esta demo.</p>`,
    );
}
function compare() {
  const list = products.filter((p) => state.compare.has(p.id));
  if (list.length < 2) {
    toast("Selecciona dos o tres referencias para comparar.");
    return;
  }
  openSheet(
    "El detalle, lado a lado.",
    "CATÁLOGO DEL SCRIPT",
    `<div class="table-scroll"><table><thead><tr><th>Referencia</th>${list.map((p) => `<th>${p.name}</th>`).join("")}</tr></thead><tbody>${[
      ["Código", (p) => p.code],
      ["Precio", (p) => money(p.price)],
      ["Existencias del script", (p) => p.stock],
      ["Categoría", (p) => p.category],
    ]
      .map(
        ([label, value]) =>
          `<tr><th>${label}</th>${list.map((p) => `<td>${value(p)}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`,
  );
}
function bindProducts() {
  view
    .querySelectorAll("[data-product]")
    .forEach((b) => (b.onclick = () => showProduct(b.dataset.product)));
  view.querySelectorAll("[data-compare]").forEach(
    (b) =>
      (b.onchange = () => {
        const id = b.dataset.compare;
        if (b.checked && state.compare.size >= 3) {
          b.checked = false;
          toast("Compara hasta tres referencias.");
          return;
        }
        b.checked ? state.compare.add(id) : state.compare.delete(id);
        document.querySelector("#compare-count").textContent =
          state.compare.size;
      }),
  );
}
async function checkBackend(button) {
  const status = button.parentElement.querySelector(".backend-status");
  button.disabled = true;
  status.textContent = "Comprobando el acceso seguro…";
  try {
    const response = await fetch("/api/data?resource=status", {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403)
      status.textContent =
        "La integración requiere una sesión autorizada. No se ha consultado la base.";
    else if (!response.ok)
      status.textContent =
        "El backend SQL no está disponible. La copia del script se mantiene identificada.";
    else {
      const result = await response.json();
      status.textContent = result.data?.connected
        ? "El backend respondió. La lectura en vivo requiere cargar una sesión de datos autenticada; esta vista conserva su fuente de script."
        : "No se ha confirmado conexión a la base original.";
    }
  } catch {
    status.textContent =
      "No se pudo comprobar el backend. No se usaron datos de sustitución.";
  } finally {
    button.disabled = false;
  }
}
function csv() {
  const rows = exportRows().filter(
    (row, i) =>
      i === 0 ||
      state.reportCategory === "Todas" ||
      row[2] === state.reportCategory,
  );
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "datacore_sql_original_inventario.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("CSV de la fuente original preparado.");
}
let toastTimer;
function toast(text) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3500);
}
function render() {
  const changingPage = renderedPage !== page;
  const presented =
    animation?.playState === "running" ? getComputedStyle(view) : null;
  const entry = presented
    ? { opacity: presented.opacity, transform: presented.transform }
    : { opacity: 0.6, transform: "translateY(6px)" };
  document.title = `${pages[page]} · DataCore AI`;
  document.querySelector("#breadcrumb").textContent = pages[page];
  document.body.dataset.page = page;
  navigation();
  animation?.cancel();
  view.innerHTML = {
    inicio: start,
    productos: catalogue,
    clientes: clientsPage,
    ventas: salesPage,
    inventario: inventoryPage,
    reportes: reportsPage,
    asistente: assistantPage,
  }[page]();
  if (changingPage && !reducedMotion())
    animation = view.animate(
      [entry, { opacity: 1, transform: "translateY(0)" }],
      { duration: 180, easing: "ease-out" },
    );
  renderedPage = page;
  bindCharts(view);
  bindProducts();
  view
    .querySelectorAll("[data-source-info]")
    .forEach((b) => (b.onclick = showSource));
  view
    .querySelectorAll("[data-client]")
    .forEach((b) => (b.onclick = () => showClient(b.dataset.client)));
  view
    .querySelectorAll("[data-check-backend]")
    .forEach((b) => (b.onclick = () => checkBackend(b)));
  if (page === "productos") {
    renderProducts();
    document.querySelector("#product-sort").value = state.sort;
    document.querySelector("#product-sort").onchange = (e) => {
      state.sort = e.target.value;
      renderProducts();
    };
    view.querySelectorAll("[data-category]").forEach(
      (b) =>
        (b.onclick = () => {
          state.category = b.dataset.category;
          view
            .querySelectorAll("[data-category]")
            .forEach((c) => c.setAttribute("aria-pressed", c === b));
          renderProducts();
        }),
    );
    document.querySelector("#compare-open").onclick = compare;
  }
  view.querySelectorAll("[data-inventory]").forEach(
    (b) =>
      (b.onclick = () => {
        state.inventory = b.dataset.inventory;
        render();
      }),
  );
  view.querySelectorAll("[data-initial]").forEach(
    (b) =>
      (b.onclick = () => {
        state.customerInitial = b.dataset.initial;
        render();
      }),
  );
  document
    .querySelector("#report-category")
    ?.addEventListener("change", (e) => {
      state.reportCategory = e.target.value;
      render();
      document.querySelector("#report-category").focus();
    });
  document.querySelector("#export-csv")?.addEventListener("click", csv);
  document
    .querySelector("#print-report")
    ?.addEventListener("click", () => window.print());
  if (page === "asistente") {
    renderConversation();
    const input = document.querySelector("#chat-input");
    const interact = () => {
      state.interacted = true;
      document.querySelector(".suggestions")?.setAttribute("hidden", "");
    };
    input.onfocus = interact;
    input.oninput = () => {
      interact();
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 140) + "px";
    };
    document.querySelector("#chat-form").onsubmit = (e) => {
      e.preventDefault();
      send(input.value);
    };
    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send(input.value);
      }
    };
    document.querySelector("#clear-chat").onclick = () => {
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
    hash = decodeURIComponent(location.hash.slice(1)).toLocaleLowerCase("es");
  } catch {
    hash = "inicio";
  }
  page = pages[hash] ? hash : hash === "dashboard" ? "inicio" : "inicio";
  document.body.classList.toggle("chat-active", page === "asistente");
  render();
  window.scrollTo(0, 0);
}
document.querySelector("#sheet-close").innerHTML = icon("close");
document.querySelector("#sheet-close").onclick = sheet.close;
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  storage.set("datacore-atlas-theme", theme);
  const button = document.querySelector("#theme-toggle");
  button.innerHTML = icon(theme === "dark" ? "sun" : "moon");
  button.setAttribute(
    "aria-label",
    theme === "dark" ? "Activar modo claro" : "Activar modo oscuro",
  );
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#141613" : "#f3f0e8";
}
setTheme(
  storage.get(
    "datacore-atlas-theme",
    storage.get("datacore-orbit-theme", "dark"),
  ),
);
document.querySelector("#theme-toggle").onclick = () =>
  setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
function network() {
  document.querySelector("#network-status").textContent = navigator.onLine
    ? ""
    : "Sin conexión · copia del script disponible";
}
addEventListener("online", network);
addEventListener("offline", network);
network();
window.visualViewport?.addEventListener("resize", () => {
  document.body.classList.toggle(
    "keyboard-open",
    innerHeight - window.visualViewport.height > 140,
  );
  document.documentElement.style.setProperty(
    "--viewport-height",
    window.visualViewport.height + "px",
  );
});
addEventListener("hashchange", () => {
  route();
  view.focus({ preventScroll: true });
});
route();
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .catch(() => toast("No se pudo activar el modo offline."));
const searchInput = document.querySelector("#global-search"),
  searchPanel = document.querySelector("#global-results"),
  matches = document.querySelector("#search-matches");
const searchMotion = spring(
  (y) => (searchPanel.style.transform = `translateY(${y}px)`),
);
document.querySelector("#search-symbol").innerHTML = icon("search");
const normalize = (v) =>
  v
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
function closeSearch() {
  searchPanel.hidden = true;
  document.querySelector("#search-clear").hidden = !searchInput.value;
}
function search() {
  const q = normalize(searchInput.value.trim());
  document.querySelector("#search-clear").hidden = !q;
  if (!q) {
    closeSearch();
    return;
  }
  const stockQuery = /stock|inventario|repos|repon|agot/.test(q);
  const words = q
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          "stock",
          "inventario",
          "reposicion",
          "productos",
          "producto",
          "clientes",
          "cliente",
          "precio",
          "que",
          "del",
          "los",
          "las",
          "hay",
          "cuanto",
        ].includes(w),
    );
  let list = products.filter((p) =>
    words.length
      ? words.every((w) =>
          normalize(p.name + " " + p.code + " " + p.category).includes(w),
        )
      : stockQuery,
  );
  if (/repos|repon|agot/.test(q)) list = list.filter((p) => p.stock <= p.min);
  const people = customers.filter((c) =>
    normalize(c.name + " " + c.document).includes(q),
  );
  const links = Object.entries(pages).filter(
    ([id, label]) =>
      normalize(id + " " + label).includes(q) ||
      (stockQuery && id === "inventario"),
  );
  document.querySelector("#search-status").textContent =
    `${list.length} productos · ${people.length} clientes · fuente SQL de prueba`;
  matches.innerHTML =
    list
      .map(
        (p) =>
          `<button class="search-result" data-search-product="${p.id}">${art(p)}<span><strong>${p.name}</strong><small>${p.code} · ${money(p.price)} · ${p.stock} unidades del script</small></span>${icon("arrow")}</button>`,
      )
      .join("") +
    people
      .map(
        (c) =>
          `<button class="search-result" data-search-client="${c.id}">${icon("clientes")}<span><strong>${c.name}</strong><small>${c.document} · cliente de prueba</small></span>${icon("arrow")}</button>`,
      )
      .join("") +
    links
      .map(
        ([id, label]) =>
          `<a class="search-result search-route" href="#${id}">${icon(id)}<span><strong>${label}</strong><small>Abrir sección</small></span>${icon("arrow")}</a>`,
      )
      .join("") +
    (!list.length && !people.length && !links.length
      ? '<p class="search-empty">Sin coincidencias en la fuente original. Prueba “DEMO-002”, “Ana” o “stock”.</p>'
      : "");
  const opening = searchPanel.hidden;
  searchPanel.hidden = false;
  if (opening) {
    searchMotion.set(-8);
    searchMotion.to(0);
  }
  matches.querySelectorAll("[data-search-product]").forEach(
    (b) =>
      (b.onclick = () => {
        closeSearch();
        searchInput.blur();
        showProduct(b.dataset.searchProduct);
      }),
  );
  matches.querySelectorAll("[data-search-client]").forEach(
    (b) =>
      (b.onclick = () => {
        closeSearch();
        searchInput.blur();
        showClient(b.dataset.searchClient);
      }),
  );
  matches.querySelectorAll("a").forEach((a) => (a.onclick = closeSearch));
}
searchInput.oninput = search;
searchInput.onfocus = () => {
  if (searchInput.value) search();
};
document.querySelector("#search-clear").onclick = () => {
  searchInput.value = "";
  closeSearch();
  searchInput.focus();
};
searchInput.onkeydown = (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    matches.querySelector("button,a")?.focus();
  }
  if (e.key === "Escape") {
    closeSearch();
    searchInput.blur();
  }
};
searchPanel.onkeydown = (e) => {
  const items = [...matches.querySelectorAll("button,a")],
    index = items.indexOf(document.activeElement);
  if (e.key === "Escape") {
    searchInput.focus();
    closeSearch();
  }
  if (["ArrowUp", "ArrowDown"].includes(e.key) && items.length) {
    e.preventDefault();
    items[
      (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
    ].focus();
  }
};
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".global-search")) closeSearch();
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    searchInput.focus();
  }
});
addEventListener("hashchange", closeSearch);
