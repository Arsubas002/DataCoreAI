import { products, categories, money, number } from "./data.js?v=original-v2";
import { inventoryStats } from "./catalogue-math.js?v=original-v2";
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const tip = (label) =>
  `data-viz-tip="${esc(label)}" aria-label="${esc(label)}"`;
const wrap = (kind, body) =>
  `<div class="viz" data-viz="${kind}">${body}<output class="viz-tooltip" role="status" hidden></output></div>`;
const empty = (kind) =>
  wrap(
    kind,
    '<div class="empty-state"><h3>Sin cantidades para representar.</h3><p>Prueba otra categoría para explorar los datos de prueba.</p></div>',
  );
export function stockBreakdown(list = products) {
  return inventoryStats(list).categories.map((c) => ({
    name: c.name,
    value: c.units,
  }));
}
export function layoutTiles(items, x = 0, y = 0, w = 100, h = 100) {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((sum, p) => sum + p.value, 0);
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
export function healthRing(list = products) {
  const s = inventoryStats(list);
  if (!list.length) return empty("health");
  let offset = 0;
  const slices = [
    { name: "Sobre el mínimo", value: s.healthy, cls: "healthy" },
    { name: "Stock bajo", value: s.low, cls: "low" },
    { name: "Agotado", value: s.empty, cls: "empty" },
  ];
  const arcs = slices
    .map((p) => {
      const share = (p.value / list.length) * 100,
        visible = Math.max(0, share - 1.6),
        html = `<circle class="health-${p.cls}" cx="140" cy="140" r="112" pathLength="100" stroke-dasharray="${visible} ${100 - visible}" stroke-dashoffset="${-offset}" transform="rotate(-90 140 140)"/>`;
      offset += share;
      return html;
    })
    .join("");
  return wrap(
    "health",
    `<div class="health-ring"><svg viewBox="0 0 280 280" role="img" aria-label="${s.healthy} de ${list.length} productos por encima de su mínimo"><circle class="health-track" cx="140" cy="140" r="128"/>${arcs}<circle class="health-track inner" cx="140" cy="140" r="92"/></svg><div class="health-center"><strong>${s.healthyPercent}<small>%</small></strong><span>sobre el mínimo</span></div></div><div class="health-legend">${slices.map((p) => `<button ${tip(`${p.name}: ${p.value} de ${list.length} productos`)}><i class="health-${p.cls}"></i><span>${p.name}</span><strong>${p.value}</strong></button>`).join("")}</div>`,
  );
}
export function stockDonut(list = products) {
  const values = stockBreakdown(list),
    total = values.reduce((n, p) => n + p.value, 0);
  if (!total) return empty("stock-donut");
  let offset = 0;
  const circles = values
    .map((p, i) => {
      const share = (p.value / total) * 100,
        html = `<circle cx="110" cy="110" r="80" fill="none" stroke="var(--cat-${i})" stroke-width="22" pathLength="100" stroke-dasharray="${share} ${100 - share}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"/>`;
      offset += share;
      return html;
    })
    .join("");
  return wrap(
    "stock-donut",
    `<div class="donut-layout"><svg viewBox="0 0 220 220" role="img" aria-label="Distribución de ${total} unidades por categoría; detalle en la leyenda">${circles}<text x="110" y="110" class="donut-total" text-anchor="middle">${total}</text><text x="110" y="132" class="donut-caption" text-anchor="middle">unidades</text></svg><div class="donut-legend">${values.map((p, i) => `<button class="category-breakdown-row" ${tip(`${p.name}: ${p.value} unidades · ${((p.value / total) * 100).toFixed(1)}%`)}><i style="--color:var(--cat-${i})"></i><span>${p.name}</span><strong>${p.value}</strong></button>`).join("")}</div></div>`,
  );
}
export function categoryBars(list = products, metric = "units") {
  const values = inventoryStats(list).categories.filter((c) => c.count),
    value = (c) => (metric === "value" ? c.valueCents : c.units),
    max = Math.max(1, ...values.map(value));
  return wrap(
    "category-bars",
    `<div class="category-columns">${values
      .map((c) => {
        const i = categories.indexOf(c.name);
        return `<button class="category-column" ${tip(`${c.name}: ${metric === "value" ? money(c.valueCents / 100) + " al precio de catálogo" : c.units + " unidades"}`)}><strong>${metric === "value" ? money(c.valueCents / 100) : c.units}</strong><span class="column-space"><i style="height:${(value(c) / max) * 100}%;--color:var(--cat-${i})"></i></span><span>${c.name}</span></button>`;
      })
      .join("")}</div>`,
  );
}
export function stockMap(list = products, metric = "units") {
  const active = list
      .filter((p) => p.stock > 0)
      .map((p) => ({
        ...p,
        value:
          metric === "value" ? p.stock * Math.round(p.price * 100) : p.stock,
      }))
      .sort((a, b) => b.value - a.value),
    values = active.slice(0, 5).map((p) => ({ name: p.name, value: p.value })),
    rest = active.slice(5).reduce((n, p) => n + p.value, 0);
  if (rest) values.push({ name: "Otras referencias", value: rest });
  const total = values.reduce((n, p) => n + p.value, 0);
  if (!total) return empty("stock-map");
  const label = (p) =>
    `${p.name}: ${metric === "value" ? money(p.value / 100) + " al precio de catálogo" : p.value + " unidades"} · ${((p.value / total) * 100).toFixed(1)}%`;
  return wrap(
    "stock-map",
    `<div class="treemap">${layoutTiles(values)
      .map(
        (p, i) =>
          `<button ${tip(label(p))} style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;--color:var(--tile-${i})"><span class="tile-index">0${i + 1}</span><strong>${esc(p.name)}</strong><span class="tile-value">${metric === "value" ? money(p.value / 100) : number(p.value)}<small>${metric === "value" ? "valor de catálogo" : "unidades"}</small></span></button>`,
      )
      .join(
        "",
      )}</div><div class="treemap-key">${values.map((p, i) => `<button ${tip(label(p))}><i style="--color:var(--tile-${i})"></i>${esc(p.name)}</button>`).join("")}</div>`,
  );
}
export function priceStock(list = products) {
  if (!list.length) return empty("price-stock");
  const maxPrice =
      Math.ceil(Math.max(...list.map((p) => p.price), 1) / 25) * 25,
    maxStock = Math.ceil(Math.max(...list.map((p) => p.stock), 1) / 20) * 20;
  return wrap(
    "price-stock",
    `<div class="scatter-plot" role="group" aria-label="Relación de precio y existencias"><div class="scatter-y"><span>Existencias</span><small>máx. ${maxStock}</small></div><div class="scatter-field"><svg class="scatter-axes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M8 10V90H92" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg><span class="scatter-midline" aria-hidden="true"></span>${list.map((p) => `<button ${tip(`${p.name}: ${money(p.price)} · ${p.stock} unidades del script`)} style="left:${(p.price / maxPrice) * 84 + 8}%;bottom:${(p.stock / maxStock) * 80 + 10}%;--color:var(--cat-${categories.indexOf(p.category)})"><i></i></button>`).join("")}</div><div class="scatter-x"><span>0</span><span>Precio de catálogo</span><span>S/ ${maxPrice}</span></div></div><p class="viz-note">Un punto, una referencia. Las cantidades son las de prueba de SQL.</p>`,
  );
}
export function inventoryMatrix(list = products) {
  return `<div class="inventory-matrix" role="group" aria-label="Estado de ${list.length} productos">${list.map((p, i) => `<button class="matrix-cell ${p.stock === 0 ? "empty" : p.stock <= p.min ? "low" : "healthy"}" data-product="${p.id}" aria-label="${esc(p.name)}: ${p.stock} unidades, ${p.stock === 0 ? "agotado" : p.stock <= p.min ? "stock bajo" : "sobre el mínimo"}"><span>${String(i + 1).padStart(2, "0")}</span><strong>${p.stock}</strong><small>${p.stock === 0 ? "Agotado" : p.stock <= p.min ? "Bajo" : "Bien"}</small></button>`).join("")}</div>`;
}
export function bindCharts(root) {
  root.querySelectorAll("[data-viz-tip]").forEach((el) => {
    const output = el.closest(".viz").querySelector("output"),
      show = (event) => {
        output.hidden = false;
        output.textContent = el.dataset.vizTip;
        const container = el.closest(".viz").getBoundingClientRect();
        const target = el.getBoundingClientRect();
        output.style.width = Math.min(320, container.width - 16) + "px";
        const box = output.getBoundingClientRect();
        const x = event?.clientX || target.left + target.width / 2;
        const y = event?.clientY || target.top + target.height / 2;
        output.style.left =
          Math.max(
            8,
            Math.min(
              container.width - box.width - 8,
              x - container.left - box.width / 2,
            ),
          ) + "px";
        output.style.top =
          Math.max(
            8,
            Math.min(
              container.height - box.height - 8,
              y - container.top - box.height - 12,
            ),
          ) + "px";
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
