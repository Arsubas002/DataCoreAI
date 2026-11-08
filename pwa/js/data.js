// Dataset ficticio compartido: todos los indicadores se derivan de estas ventas.
export const snapshot = '2026-11-07';
export const products = [
  {
    id: 1,
    name: 'Polo algodón',
    category: 'Textil',
    price: 39.9,
    stock: 12,
    min: 5,
    color: 'sage',
    symbol: 'shirt',
    description:
      'Algodón suave, corte esencial. Una pieza que funciona todos los días.',
  },
  {
    id: 2,
    name: 'Jean clásico',
    category: 'Textil',
    price: 89.9,
    stock: 4,
    min: 5,
    color: 'blue',
    symbol: 'jeans',
    description:
      'Denim de corte recto y acabado índigo. El equilibrio entre comodidad y estructura.',
  },
  {
    id: 3,
    name: 'Casaca urbana',
    category: 'Moda',
    price: 149.9,
    stock: 2,
    min: 5,
    color: 'sand',
    symbol: 'jacket',
    description:
      'Una capa ligera para la ciudad. Silueta relajada y detalles funcionales.',
  },
  {
    id: 4,
    name: 'Camisa lino',
    category: 'Moda',
    price: 69.9,
    stock: 8,
    min: 5,
    color: 'cream',
    symbol: 'shirt',
    description:
      'Textura natural y líneas limpias. Ligera, fresca y fácil de combinar.',
  },
  {
    id: 5,
    name: 'Zapatillas urbanas',
    category: 'Calzado',
    price: 189.9,
    stock: 6,
    min: 5,
    color: 'slate',
    symbol: 'shoe',
    description: 'Diseño versátil, suela cómoda y una silueta contemporánea.',
  },
  {
    id: 6,
    name: 'Mochila ejecutiva',
    category: 'Accesorios',
    price: 119.9,
    stock: 16,
    min: 5,
    color: 'rose',
    symbol: 'bag',
    description:
      'Lo esencial, organizado. Compartimentos prácticos para moverte con libertad.',
  },
];
const branches = ['Centro', 'Norte', 'Sur'];
export const sales = Array.from({ length: 120 }, (_, day) => {
  const date = new Date(`${snapshot}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - day);
  return Array.from(
    {
      length: Math.max(2, Math.round(6 - day / 35 + Math.sin(day * 0.61) * 2)),
    },
    (_, j) => {
      const product =
          products[
            (day * 5 + j * 2 + Math.floor(day / 6) + (j % 3)) % products.length
          ],
        quantity = 1 + ((day + j) % 3);
      return {
        id: `DEMO-${5000 - day * 8 - j}`,
        date: date.toISOString().slice(0, 10),
        branch: branches[(day + j) % 3],
        productId: product.id,
        quantity,
        totalCents: Math.round(product.price * 100) * quantity,
      };
    },
  );
}).flat();
export const money = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(value);
export const number = (value) => new Intl.NumberFormat('es-PE').format(value);
export const dateLabel = (date) =>
  new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
export function analytics(days = 30, branch = 'Todas') {
  const end = new Date(`${snapshot}T12:00:00Z`);
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - days + 1 + i);
    return d.toISOString().slice(0, 10);
  });
  const previous = dates.map((date) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  });
  const filter = (list) =>
    sales.filter(
      (s) =>
        list.includes(s.date) && (branch === 'Todas' || s.branch === branch),
    );
  const current = filter(dates),
    prior = filter(previous);
  const sum = (rows) => rows.reduce((a, s) => a + s.totalCents, 0) / 100;
  const revenue = sum(current),
    priorRevenue = sum(prior);
  const units = current.reduce((a, s) => a + s.quantity, 0);
  const ranking = products
    .map((p) => ({
      ...p,
      units: current
        .filter((s) => s.productId === p.id)
        .reduce((a, s) => a + s.quantity, 0),
      revenue: sum(current.filter((s) => s.productId === p.id)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
  return {
    dates,
    current,
    prior,
    revenue,
    priorRevenue,
    units,
    orders: current.length,
    ticket: current.length ? revenue / current.length : 0,
    delta: priorRevenue ? ((revenue - priorRevenue) / priorRevenue) * 100 : 0,
    series: dates.map((date) => sum(current.filter((s) => s.date === date))),
    previous: previous.map((date) => sum(prior.filter((s) => s.date === date))),
    ranking,
  };
}
export function exportRows(data) {
  return [
    ['Fecha', 'Pedido demo', 'Sucursal', 'Producto', 'Unidades', 'Importe PEN'],
    ...data.current.map((s) => [
      s.date,
      s.id,
      s.branch,
      products.find((p) => p.id === s.productId).name,
      s.quantity,
      (s.totalCents / 100).toFixed(2),
    ]),
  ];
}
export function toCsv(rows) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map(
            (value) =>
              '"' +
              String(value)
                .replace(/^[=+\-@\t\r]/, "' $&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(','),
      )
      .join('\r\n')
  );
}
