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
} from "./data.js?v=original-v2";
import { icon, pages } from "./icons.js?v=original-v2";
import { bindCharts } from "./charts.js?v=original-v2";
import {
  renderPage,
  productMarkup,
  featureMarkup,
  esc,
} from "./views.js?v=original-v2";
import { art } from "./product-art.js?v=original-v2";
import { quotation } from "./catalogue-math.js?v=original-v2";
import { setupSheet, reducedMotion, spring } from "./motion.js?v=original-v2";
import { ask } from "./assistant.js?v=original-v2";
const view = document.querySelector("#view"),
  dialog = document.querySelector("#sheet"),
  sheet = setupSheet(dialog);
const state = {
  category: "Todos",
  sort: "name",
  inventory: "Todos",
  customerInitial: "Todos",
  reportCategory: "Todas",
  reportMetric: "units",
  quoteLines: [],
  quoteCustomer: "",
  quoteProduct: products[0].code,
  compare: new Set(),
  messages: [],
  busy: false,
  interacted: false,
};
let page = "inicio",
  renderedPage,
  animation;
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
  `<a href="#${id}" title="${pages[id]}" data-nav="${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(id)}<span>${pages[id]}</span>${id === "inventario" ? `<small>${lowStock.length}</small>` : ""}</a>`;
function navigation() {
  document.querySelector("#desktop-nav").innerHTML =
    `<div class="nav-cluster">${navLink("inicio")}</div><div class="nav-cluster"><p class="nav-group-label">REGISTROS</p>${["productos", "clientes", "ventas", "inventario"].map(navLink).join("")}</div><div class="nav-cluster"><p class="nav-group-label">PERSPECTIVAS</p>${["reportes", "asistente"].map(navLink).join("")}</div>`;
  document.querySelector("#mobile-nav").innerHTML =
    ["inicio", "productos", "ventas", "asistente"]
      .map(navLink)
      .join("")
      .replace("Asistente IA</span>", "Asistente</span>") +
    `<button id="more-nav" ${["clientes", "inventario", "reportes"].includes(page) ? 'aria-current="page"' : ""}>${icon("more")}<span>Más</span></button>`;
  document.querySelector("#more-nav").onclick = () =>
    openSheet(
      "Tu espacio.",
      "DATACORE / NAVEGACIÓN",
      `<nav class="more-links" aria-label="Más secciones">${["clientes", "inventario", "reportes"].map(navLink).join("")}</nav>`,
    );
}
function renderProducts() {
  const list = products
    .filter((p) => state.category === "Todos" || p.category === state.category)
    .sort((a, b) =>
      state.sort === "name"
        ? a.name.localeCompare(b.name)
        : state.sort === "price-desc"
          ? b.price - a.price
          : a[state.sort] - b[state.sort],
    );
  document.querySelector("#catalog-count").textContent =
    `${list.length} productos · catálogo de prueba`;
  document.querySelector("#product-grid").innerHTML = list
    .map((p) => productMarkup(p, state.compare.has(p.id)))
    .join("");
  const focused = products.find(
    (p) => state.category === "Todos" || p.category === state.category,
  );
  document.querySelector("#catalog-focus").innerHTML = featureMarkup(focused);
  bindProducts();
}
function bindQuotation() {
  const form = document.querySelector("#quote-form"),
    selection = document.querySelector("#quote-product"),
    quantity = document.querySelector("#quote-quantity"),
    error = document.querySelector("#quote-error");
  selection.value = state.quoteProduct;
  const validate = () => {
    const product = products.find((p) => p.code === selection.value);
    const inQuote =
      state.quoteLines.find((p) => p.code === selection.value)?.quantity || 0;
    const remaining = product.stock - inQuote,
      amount = Number(quantity.value);
    quantity.max = String(remaining);
    const valid =
      Number.isInteger(amount) && amount >= 1 && amount <= remaining;
    quantity.setAttribute("aria-invalid", String(!valid));
    form.querySelector('button[type="submit"]').disabled = !valid;
    document.querySelector("#quote-help").textContent =
      `${money(product.price)} por unidad · ${remaining} unidades de prueba disponibles para esta cotización.`;
    error.textContent = valid
      ? ""
      : remaining === 0
        ? "Ya incluiste todas las unidades de prueba de este producto."
        : `Usa una cantidad entera entre 1 y ${remaining}.`;
    return valid;
  };
  selection.onchange = () => {
    state.quoteProduct = selection.value;
    quantity.value = "1";
    validate();
  };
  quantity.oninput = validate;
  validate();
  form.onsubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const code = selection.value,
      amount = Number(quantity.value),
      existing = state.quoteLines.find((p) => p.code === code);
    const next = existing
      ? state.quoteLines.map((p) =>
          p.code === code ? { code, quantity: p.quantity + amount } : p,
        )
      : [...state.quoteLines, { code, quantity: amount }];
    try {
      quotation(next);
      state.quoteLines = next;
      render();
      document.querySelector("#quote-product").focus({ preventScroll: true });
      toast("Producto añadido a la cotización de prueba.");
    } catch (e) {
      error.textContent = e.message;
    }
  };
  document.querySelector("#quote-customer").onchange = (e) => {
    state.quoteCustomer = e.target.value;
    render();
    document.querySelector("#quote-customer").focus({ preventScroll: true });
  };
  view.querySelectorAll("[data-remove-quote]").forEach(
    (button) =>
      (button.onclick = () => {
        state.quoteLines = state.quoteLines.filter(
          (p) => p.code !== button.dataset.removeQuote,
        );
        render();
        document.querySelector("#quote-product").focus({ preventScroll: true });
        toast("Producto retirado de la cotización.");
      }),
  );
  document.querySelector("#quote-export").onclick = () => {
    const result = quotation(state.quoteLines),
      customer = customers.find((c) => c.id === state.quoteCustomer);
    if (!result.items.length || !customer) return;
    const rows = [
      ["Cotización de prueba · No es una venta registrada"],
      ["Cliente", customer.name],
      ["Documento", customer.document],
      [],
      ["Código", "Producto", "Cantidad", "Precio PEN", "Subtotal PEN"],
      ...result.items.map((p) => [
        p.code,
        p.name,
        p.quantity,
        (p.priceCents / 100).toFixed(2),
        (p.subtotalCents / 100).toFixed(2),
      ]),
      [],
      ["Total PEN", (result.totalCents / 100).toFixed(2)],
      ["Fuente", "sql/02_datos_prueba.sql"],
      ["Estado", "Simulación; no modifica existencias ni registra ventas."],
    ];
    downloadCsv(rows, "datacore_cotizacion_de_prueba.csv");
    toast("Cotización de prueba preparada.");
  };
}
function downloadCsv(rows, name) {
  const url = URL.createObjectURL(
      new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderConversation() {
  const log = document.querySelector("#conversation");
  if (!log) return;
  log.innerHTML = state.messages.length
    ? state.messages
        .map((message) => {
          const parts =
            message.role === "assistant"
              ? message.text.split("\n\nFuente:")
              : [message.text];
          return `<article class="message ${message.role}"><span class="message-label">${message.role === "user" ? "Tú" : "DataCore / consulta local"}</span><p>${esc(parts[0])}</p>${parts[1] ? '<small class="message-source">Datos de prueba de SQL · Consulta local, sin IA generativa.</small>' : ""}</article>`;
        })
        .join("")
    : `<div class="conversation-intro"><div class="assistant-orb">${icon("asistente")}</div><h2>Tu catálogo.<br><em>Una conversación abierta.</em></h2><p>Productos, precios, existencias y comparaciones.<br>Escribe lo que necesitas saber.</p><div class="suggestions" ${state.interacted ? "hidden" : ""}>${["¿Qué productos deberían reponerse?", "Compara el Teclado USB y el Mouse óptico", "Muéstrame los clientes originales"].map((question) => `<button data-prompt="${question}">${question}${icon("arrow")}</button>`).join("")}</div></div>`;
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
    "Datos de prueba.<br>La base original.",
    "TRAZABILIDAD",
    `<p class="product-description">Esta demo utiliza los datos de prueba originales de SQL: 20 productos, cuatro categorías y 10 clientes. No modifica la base de datos.</p><div class="source-facts"><span>SQL Server conectado <strong>No</strong></span><span>Ventas originales recuperadas <strong>No</strong></span><span>Sucursales en el esquema <strong>No existen</strong></span><span>Claves IDENTITY originales <strong>No recuperadas</strong></span></div><div class="source-files">${Object.entries(
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
    "COMPARACIÓN / DATOS DE PRUEBA",
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
  button.setAttribute("aria-busy", "true");
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
    button.removeAttribute("aria-busy");
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
  view.innerHTML = renderPage(page, state);
  if (changingPage && !reducedMotion())
    animation = view.animate(
      [entry, { opacity: 1, transform: "translateY(0)" }],
      { duration: 180, easing: "ease-out" },
    );
  renderedPage = page;
  bindCharts(view);
  if (page === "ventas") bindQuotation();
  view.querySelectorAll("[data-report-metric]").forEach(
    (button) =>
      (button.onclick = () => {
        state.reportMetric = button.dataset.reportMetric;
        render();
        view
          .querySelector(`[data-report-metric="${state.reportMetric}"]`)
          .focus({ preventScroll: true });
      }),
  );
  view.querySelectorAll("[data-category-route]").forEach(
    (button) =>
      (button.onclick = () => {
        state.category = button.dataset.categoryRoute;
        location.hash = "productos";
      }),
  );
  view
    .querySelector("[data-go-low]")
    ?.addEventListener("click", () => (state.inventory = "Por reponer"));
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
        view
          .querySelector(`[data-inventory="${state.inventory}"]`)
          .focus({ preventScroll: true });
      }),
  );
  view.querySelectorAll("[data-initial]").forEach(
    (b) =>
      (b.onclick = () => {
        state.customerInitial = b.dataset.initial;
        render();
        view
          .querySelector(`[data-initial="${state.customerInitial}"]`)
          .focus({ preventScroll: true });
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
document
  .querySelectorAll(".chrome-source")
  .forEach((button) => (button.onclick = showSource));
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
    theme === "dark" ? "#0d1726" : "#f2f5fa";
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
    : "Sin conexión · demo disponible";
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
// Native PDF printing includes the current filtered table, then restores its state.
let printDetails = [];
addEventListener("beforeprint", () => {
  printDetails = [...view.querySelectorAll("details:not([open])")];
  printDetails.forEach((detail) => {
    detail.open = true;
  });
});
addEventListener("afterprint", () => {
  printDetails.forEach((detail) => {
    detail.open = false;
  });
  printDetails = [];
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
