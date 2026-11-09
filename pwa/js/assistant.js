import { products, customers, money, number } from './data.js?v=atlas-v7.1';
// Honest deterministic demo, deliberately distinct from a connected model.
export function demoAnswer(question, data) {
  const q = question
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const mentioned = products.filter((p) =>
    q.includes(p.name.toLowerCase().split(' ')[0]),
  );
  if (/cliente/.test(q))
    return `Clientes ficticios recuperados del catálogo SQL\n\n${customers.map((c) => c.id + ' · ' + c.name).join('\n')}\n\nNo se encontró una relación cliente–venta. No se atribuyen compras a estos clientes.`;
  if (/compar|diferencia/.test(q)) {
    const list = mentioned.length >= 2 ? mentioned : data.ranking.slice(0, 2);
    return `Comparación del catálogo ficticio\n\n${list.map((p) => `${p.name}: ${money(p.price)} · ${p.stock} unidades disponibles.`).join('\n')}\n\nLos valores son de demostración; no representan una recomendación generada por IA.`;
  }
  if (/stock|inventario|repon|repos|agot|existencia/.test(q)) {
    const list = mentioned.length
      ? mentioned
      : products.filter((p) => p.stock <= p.min);
    return `Disponibilidad de demostración\n\n${list.map((p) => `${p.name}: ${p.stock} unidades · mínimo ${p.min}${p.stock <= p.min ? ' · Reponer' : ''}.`).join('\n')}\n\nEl inventario representa una instantánea ficticia, no un almacén conectado.`;
  }
  if (/venta|vendid|ingreso|rendimiento/.test(q))
    return `Resumen del período seleccionado\n\nIngresos: ${money(data.revenue)}\nOperaciones: ${number(data.orders)}\nUnidades: ${number(data.units)}\nProducto con más ingresos: ${data.ranking[0].name}.\n\nFuente: ventas ficticias del período y sucursal seleccionados. Este cálculo es local y no usa un modelo de lenguaje.`;
  if (/precio|cuesta|caro|barato/.test(q) || mentioned.length) {
    const list = mentioned.length
      ? mentioned
      : [...products].sort((a, b) => a.price - b.price);
    return `Precios del catálogo de demostración\n\n${list.map((p) => `${p.name}: ${money(p.price)}.`).join('\n')}\n\nPrecios ficticios en soles peruanos.`;
  }
  return 'Puedes escribir cualquier pregunta. En esta demostración solo puedo calcular consultas sencillas sobre el catálogo, precios, stock, ventas y comparaciones. No hay un modelo de IA conectado y no puedo interpretar con fiabilidad esta pregunta.\n\nPrueba con “¿Qué productos necesitan reposición?” o reformula tu consulta. Una integración futura deberá procesarse en el servidor.';
}
export async function ask(question, data, { signal } = {}) {
  // The public client has no provider key and never calls Groq directly.
  // Capability discovery must explicitly enable server mode; demo stays offline.
  if (globalThis.datacoreServerAssistant === true) {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
      signal,
    });
    if (!response.ok)
      throw new Error('El asistente no pudo responder. Inténtalo de nuevo.');
    const result = await response.json();
    if (typeof result.answer !== 'string')
      throw new Error('Respuesta no válida del servidor.');
    return result.answer;
  }
  return demoAnswer(question, data);
}
