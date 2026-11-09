import { products, customers, money } from "./data.js?v=atlas-sql-v1";
export function demoAnswer(question) {
  const q = question
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const mentioned = products.filter(
    (p) =>
      q.includes(
        p.name
          .toLocaleLowerCase("es")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .split(" ")[0],
      ) || q.includes(p.code.toLowerCase()),
  );
  const source =
    "\n\nFuente: datos de prueba definidos en sql/02_datos_prueba.sql. No es una consulta al SQL Server ni una respuesta de IA generativa.";
  if (/sucursal/.test(q))
    return (
      "El esquema SQL original no contiene una tabla o columna de sucursal. No puedo comparar ventas por sucursal sin ampliar ese modelo de forma autorizada." +
      source
    );
  if (/venta|ingreso|evoluci|periodo|rentabilidad|margen|mas vendido/.test(q))
    return (
      "No hay registros originales de Ventas ni DetalleVentas en los scripts recuperados. No puedo calcular ingresos, tendencias, el producto con más ventas o comparar períodos. Tampoco hay costos para calcular rentabilidad. La integración preparada deberá consultar el servidor original detrás de la API protegida." +
      source
    );
  if (/cliente/.test(q))
    return (
      `Directorio original · ${customers.length} clientes de prueba\n\n${customers.map((c) => `${c.name} · ${c.document}`).join("\n")}\n\nNo se recuperó una relación entre estos clientes y ventas concretas.` +
      source
    );
  if (/stock|inventario|disponibilidad|repon|repos|existencia|agot/.test(q)) {
    const list = mentioned.length
      ? mentioned
      : [...products]
          .sort((a, b) => a.stock - b.stock)
          .filter((p) => (/repon|repos|agot/.test(q) ? p.stock <= p.min : true))
          .slice(0, 8);
    return (
      "Existencias definidas en el script\n\n" +
      list
        .map(
          (p) =>
            `${p.name}: ${p.stock} unidades · mínimo ${p.min}${p.stock <= p.min ? " · Reposición" : ""}.`,
        )
        .join("\n") +
      "\n\nEstas cantidades no confirman disponibilidad actual." +
      source
    );
  }
  if (/precio|cuesta|compar|barat|caro/.test(q) || mentioned.length) {
    const list = mentioned.length
      ? mentioned
      : [...products].sort((a, b) => a.price - b.price).slice(0, 6);
    return (
      "Catálogo original\n\n" +
      list
        .map(
          (p) =>
            `${p.code} · ${p.name}: ${money(p.price)} · ${p.stock} unidades del script.`,
        )
        .join("\n") +
      source
    );
  }
  return (
    "Puedes escribir una pregunta abierta. En este modo solo puedo consultar de forma determinista los productos, precios, existencias y clientes definidos en los scripts originales. No hay un modelo de lenguaje conectado. Prueba “¿Qué productos deberían reponerse?” o busca un código como DEMO-002." +
    source
  );
}
export async function ask(question) {
  return demoAnswer(question);
}
