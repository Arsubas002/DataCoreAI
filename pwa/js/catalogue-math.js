import { products, categories } from "./data.js?v=original-v2";

export function inventoryStats(list = products) {
  const units = list.reduce((total, p) => total + p.stock, 0);
  const valueCents = list.reduce(
    (total, p) => total + p.stock * Math.round(p.price * 100),
    0,
  );
  const empty = list.filter((p) => p.stock === 0).length;
  const low = list.filter((p) => p.stock > 0 && p.stock <= p.min).length;
  const healthy = list.length - empty - low;
  return {
    units,
    valueCents,
    empty,
    low,
    healthy,
    count: list.length,
    healthyPercent: list.length ? Math.round((healthy / list.length) * 100) : 0,
    categories: categories.map((name) => {
      const items = list.filter((p) => p.category === name);
      return {
        name,
        count: items.length,
        units: items.reduce((n, p) => n + p.stock, 0),
        valueCents: items.reduce(
          (n, p) => n + p.stock * Math.round(p.price * 100),
          0,
        ),
      };
    }),
  };
}

/** A transient quotation, never a recorded sale or a mutation of SQL fixtures. */
export function quotation(lines) {
  if (!Array.isArray(lines) || lines.length > products.length)
    throw new Error("Cotización no válida.");
  const seen = new Set();
  const items = lines.map(({ code, quantity }) => {
    const product = products.find((p) => p.code === code);
    if (
      !product ||
      seen.has(code) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > product.stock
    )
      throw new Error("Revisa la cantidad y las existencias de prueba.");
    seen.add(code);
    const priceCents = Math.round(product.price * 100);
    return {
      ...product,
      quantity,
      priceCents,
      subtotalCents: priceCents * quantity,
    };
  });
  return {
    items,
    units: items.reduce((n, item) => n + item.quantity, 0),
    totalCents: items.reduce((n, item) => n + item.subtotalCents, 0),
  };
}
