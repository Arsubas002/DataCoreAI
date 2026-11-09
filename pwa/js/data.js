import { original } from "./sql-fixtures.js?v=atlas-sql-v1";
export const provenance = Object.freeze(original.provenance);
export const categories = Object.freeze(original.categories);
export const customers = original.customers.map((c) => ({
  id: c.document,
  name: c.name,
  document: c.document,
}));
const visual = {
  Tecnología: { color: "slate", symbol: "technology" },
  Papelería: { color: "cream", symbol: "book" },
  Hogar: { color: "sage", symbol: "home" },
  Accesorios: { color: "sand", symbol: "bag" },
};
export const products = original.products.map((p) => ({
  ...p,
  id: p.code,
  price: Number(p.price),
  ...visual[p.category],
  source: "sql/02_datos_prueba.sql · datos de prueba originales",
  description:
    "Referencia definida en el script SQL original. No representa una consulta al servidor ni confirma existencias actuales.",
}));
export const lowStock = products.filter((p) => p.stock <= p.min);
// Missing history is not the same as an empty, successfully queried database.
export const sales = [];
export const snapshot = null;
export const money = (value) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        maximumFractionDigits: 2,
      }).format(value);
export const number = (value) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("es-PE").format(value);
export const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("es-PE", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(value + "T12:00:00Z"))
    : "Sin fecha recuperada";
export function analytics(days = 30, branch = "Todas") {
  return {
    available: false,
    reason:
      "Los scripts originales no incluyen registros de Ventas ni DetalleVentas. Falta conectar el SQL Server original.",
    days,
    branch,
    dates: [],
    current: [],
    prior: [],
    series: [],
    previous: [],
    revenue: null,
    priorRevenue: null,
    units: null,
    orders: null,
    ticket: null,
    delta: null,
    ranking: products.map((p) => ({ ...p, units: null, revenue: null })),
  };
}
export function catalogueComposition() {
  return categories.map((name) => ({
    name,
    value: products.filter((p) => p.category === name).length,
  }));
}
export function exportRows() {
  return [
    [
      "Código original",
      "Producto",
      "Categoría",
      "Precio PEN",
      "Existencias del script",
      "Stock mínimo",
      "Fuente",
    ],
    ...products.map((p) => [
      p.code,
      p.name,
      p.category,
      p.price.toFixed(2),
      p.stock,
      p.min,
      "sql/02_datos_prueba.sql · no es inventario en vivo",
    ]),
  ];
}
export function toCsv(rows) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+\-@\t\r]/, "' $&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
