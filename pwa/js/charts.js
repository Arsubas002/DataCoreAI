import { products, categories, money } from "./data.js?v=atlas-sql-v1";
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const attrs = (label) =>
  `data-viz-tip="${esc(label)}" aria-label="${esc(label)}"`;
export function stockBreakdown(list = products) {
  return categories.map((name) => ({
    name,
    value: list
      .filter((p) => p.category === name)
      .reduce((n, p) => n + p.stock, 0),
  }));
}
export function layoutTiles(items, x = 0, y = 0, w = 100, h = 100) {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((a, p) => a + p.value, 0);
  let split = 1,
    sum = items[0].value;
  while (split < items.length - 1 && sum < total / 2)
    sum += items[split++].value;
  const ratio = sum / total;
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
function wrap(kind, body) {
  return `<div class="viz" data-viz="${kind}">${body}<output class="viz-tooltip" role="status" hidden></output></div>`;
}
function emptyChart(kind) {
  return wrap(
    kind,
    '<div class="empty-state"><h3>Sin cantidades para representar.</h3><p>Revisa el filtro o consulta el catálogo. No se han generado valores de sustitución.</p></div>',
  );
}
export function stockDonut(list = products) {
  const values = stockBreakdown(list),
    total = values.reduce((a, p) => a + p.value, 0);
  if (!total) return emptyChart("stock-donut");
  let offset = 0;
  const circles = values
    .map((p, i) => {
      const share = (p.value / total) * 100;
      const markup = `<circle cx="100" cy="100" r="76" fill="none" stroke="var(--cat-${i})" stroke-width="24" pathLength="100" stroke-dasharray="${share} ${100 - share}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`;
      offset += share;
      return markup;
    })
    .join("");
  return wrap(
    "stock-donut",
    `<div class="donut-layout"><svg viewBox="0 0 200 200" role="img" aria-label="Existencias originales por categoría; valores en la leyenda">${circles}<text x="100" y="99" class="donut-total" text-anchor="middle">${total}</text><text x="100" y="120" class="donut-caption" text-anchor="middle">unidades en el script</text></svg><div class="donut-legend">${values.map((p, i) => `<button class="category-breakdown-row" ${attrs(`${p.name}: ${p.value} unidades · ${((p.value / total) * 100).toFixed(1)}%`)}><i style="--color:var(--cat-${i})"></i><span>${p.name}</span><strong>${p.value}</strong></button>`).join("")}</div></div>`,
  );
}
export function stockMap(list = products) {
  const active = list
      .filter((p) => p.stock > 0)
      .sort((a, b) => b.stock - a.stock),
    values = active.slice(0, 5).map((p) => ({ name: p.name, value: p.stock }));
  const rest = active.slice(5).reduce((a, p) => a + p.stock, 0);
  if (rest > 0) values.push({ name: "Otras referencias", value: rest });
  const total = values.reduce((a, p) => a + p.value, 0),
    tiles = layoutTiles(values);
  if (!total) return emptyChart("stock-map");
  return wrap(
    "stock-map",
    `<div class="treemap">${tiles.map((p, i) => `<button ${attrs(`${p.name}: ${p.value} unidades · ${((p.value / total) * 100).toFixed(1)}%`)} style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;--color:var(--cat-${i})"><strong>${p.name}</strong><span>${p.value}<small> uds.</small></span></button>`).join("")}</div><p class="viz-note">Superficie proporcional a existencias del script. No representa ingresos ni stock actual.</p>`,
  );
}
export function priceStock(list = products) {
  if (!list.length) return emptyChart("price-stock");
  const maxPrice = Math.max(...list.map((p) => p.price), 1) * 1.12,
    maxStock = Math.max(...list.map((p) => p.stock), 1) * 1.15;
  return wrap(
    "price-stock",
    `<div class="scatter-plot" role="group" aria-label="Precio de catálogo y existencias originales"><span class="scatter-y">Existencias del script · 0–${Math.ceil(maxStock)}</span><div class="scatter-field">${list.map((p) => `<button ${attrs(`${p.name}: ${money(p.price)} · ${p.stock} unidades del script`)} style="left:${(p.price / maxPrice) * 90 + 5}%;bottom:${(p.stock / maxStock) * 84 + 8}%;--color:var(--cat-${categories.indexOf(p.category)})"><i></i></button>`).join("")}</div><span class="scatter-x">Precio de catálogo · S/ 0–${Math.ceil(maxPrice)}</span></div><p class="viz-note">Cada punto es una referencia original. Color por categoría. No calcula demanda o rentabilidad.</p>`,
  );
}
export function schemaMap() {
  return `<div class="schema-stage" role="group" aria-label="Mapa del esquema SQL original"><svg viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true"><path d="M78 72H300M78 308H300M300 72C400 72 410 140 522 140M300 308C430 308 400 140 522 140M300 308C430 308 430 340 522 340"/></svg><a href="#productos" class="schema-node recovered" style="--x:13%;--y:18%"><small>CATÁLOGO</small><strong>4</strong><span>Categorías</span></a><a href="#productos" class="schema-node recovered" style="--x:50%;--y:18%"><small>REFERENCIAS</small><strong>20</strong><span>Productos</span></a><a href="#clientes" class="schema-node recovered" style="--x:13%;--y:77%"><small>DIRECTORIO</small><strong>10</strong><span>Clientes</span></a><a href="#ventas" class="schema-node pending" style="--x:50%;--y:77%"><small>SIN HISTORIAL</small><strong>—</strong><span>Ventas</span></a><a href="#ventas" class="schema-node pending" style="--x:87%;--y:35%"><small>SIN HISTORIAL</small><strong>—</strong><span>Detalles</span></a><a href="#ventas" class="schema-node pending" style="--x:87%;--y:85%"><small>SIN HISTORIAL</small><strong>—</strong><span>Solicitudes</span></a></div><p class="viz-note">Líneas = relaciones declaradas en los scripts. No se han recuperado valores de claves IDENTITY ni historial de ventas.</p>`;
}
export function bindCharts(root) {
  root.querySelectorAll("[data-viz-tip]").forEach((el) => {
    const output = el.closest(".viz").querySelector("output");
    const show = () => {
      output.hidden = false;
      output.textContent = el.dataset.vizTip;
    };
    el.onpointerenter = show;
    el.onfocus = show;
    el.onclick = show;
    el.onpointerleave = () => {
      if (!el.matches(":focus")) output.hidden = true;
    };
    el.onblur = () => (output.hidden = true);
    el.onkeydown = (e) => {
      if (e.key === "Escape") output.hidden = true;
    };
  });
}
