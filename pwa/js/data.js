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
products.forEach(p => { p.code = 'PWA-' + String(p.id).padStart(3, '0'); p.source = 'PWA · catálogo visual'; });
products.push(...[
  {
    "id": 101,
    "code": "DEMO-001",
    "name": "Teclado USB",
    "category": "Tecnología",
    "price": 65,
    "stock": 15,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 102,
    "code": "DEMO-002",
    "name": "Mouse óptico",
    "category": "Tecnología",
    "price": 35,
    "stock": 4,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 103,
    "code": "DEMO-003",
    "name": "Audífonos",
    "category": "Tecnología",
    "price": 89,
    "stock": 12,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 104,
    "code": "DEMO-004",
    "name": "Memoria USB 32 GB",
    "category": "Tecnología",
    "price": 28,
    "stock": 20,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 105,
    "code": "DEMO-005",
    "name": "Cámara web",
    "category": "Tecnología",
    "price": 120,
    "stock": 3,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 106,
    "code": "DEMO-006",
    "name": "Cuaderno cuadriculado",
    "category": "Papelería",
    "price": 8.5,
    "stock": 40,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 107,
    "code": "DEMO-007",
    "name": "Bolígrafo azul",
    "category": "Papelería",
    "price": 1.5,
    "stock": 80,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 108,
    "code": "DEMO-008",
    "name": "Resaltador amarillo",
    "category": "Papelería",
    "price": 3.5,
    "stock": 5,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 109,
    "code": "DEMO-009",
    "name": "Carpeta oficio",
    "category": "Papelería",
    "price": 4.2,
    "stock": 25,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 110,
    "code": "DEMO-010",
    "name": "Bloc de notas",
    "category": "Papelería",
    "price": 6.5,
    "stock": 0,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 111,
    "code": "DEMO-011",
    "name": "Taza cerámica",
    "category": "Hogar",
    "price": 18,
    "stock": 18,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 112,
    "code": "DEMO-012",
    "name": "Lámpara de escritorio",
    "category": "Hogar",
    "price": 75,
    "stock": 4,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 113,
    "code": "DEMO-013",
    "name": "Organizador de mesa",
    "category": "Hogar",
    "price": 32,
    "stock": 10,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 114,
    "code": "DEMO-014",
    "name": "Botella reutilizable",
    "category": "Hogar",
    "price": 24,
    "stock": 16,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 115,
    "code": "DEMO-015",
    "name": "Reloj de pared",
    "category": "Hogar",
    "price": 45,
    "stock": 7,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 116,
    "code": "DEMO-016",
    "name": "Mochila urbana",
    "category": "Accesorios",
    "price": 98,
    "stock": 9,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 117,
    "code": "DEMO-017",
    "name": "Estuche escolar",
    "category": "Accesorios",
    "price": 15,
    "stock": 22,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 118,
    "code": "DEMO-018",
    "name": "Soporte para celular",
    "category": "Accesorios",
    "price": 22,
    "stock": 2,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 119,
    "code": "DEMO-019",
    "name": "Cable USB C",
    "category": "Accesorios",
    "price": 19,
    "stock": 30,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 120,
    "code": "DEMO-020",
    "name": "Alfombrilla para mouse",
    "category": "Accesorios",
    "price": 14,
    "stock": 14,
    "min": 5,
    "color": "slate",
    "symbol": "productos",
    "source": "SQL · catálogo original",
    "description": "Producto ficticio del catálogo original. Existencias de referencia; no se encontró historial de ventas para este catálogo."
  },
  {
    "id": 201,
    "code": "IOS-DEMO-001",
    "name": "Cuaderno Studio",
    "category": "Oficina",
    "price": 49.9,
    "stock": 24,
    "min": 5,
    "color": "cream",
    "symbol": "productos",
    "source": "iOS · contrato demo-v1",
    "description": "Producto ficticio recuperado del contrato de la demo iOS. Código prefijado para evitar colisiones con el catálogo SQL."
  },
  {
    "id": 202,
    "code": "IOS-DEMO-002",
    "name": "Lámpara Focus",
    "category": "Oficina",
    "price": 129.9,
    "stock": 4,
    "min": 5,
    "color": "cream",
    "symbol": "productos",
    "source": "iOS · contrato demo-v1",
    "description": "Producto ficticio recuperado del contrato de la demo iOS. Código prefijado para evitar colisiones con el catálogo SQL."
  },
  {
    "id": 203,
    "code": "IOS-DEMO-003",
    "name": "Botella Flow",
    "category": "Accesorios",
    "price": 69.9,
    "stock": 0,
    "min": 3,
    "color": "cream",
    "symbol": "productos",
    "source": "iOS · contrato demo-v1",
    "description": "Producto ficticio recuperado del contrato de la demo iOS. Código prefijado para evitar colisiones con el catálogo SQL."
  },
  {
    "id": 204,
    "code": "IOS-DEMO-004",
    "name": "Organizador Grid",
    "category": "Accesorios",
    "price": 89.9,
    "stock": 12,
    "min": 4,
    "color": "cream",
    "symbol": "productos",
    "source": "iOS · contrato demo-v1",
    "description": "Producto ficticio recuperado del contrato de la demo iOS. Código prefijado para evitar colisiones con el catálogo SQL."
  },
  {
    "id": 205,
    "code": "IOS-DEMO-005",
    "name": "Mochila Transit",
    "category": "Accesorios",
    "price": 199.9,
    "stock": 3,
    "min": 3,
    "color": "cream",
    "symbol": "productos",
    "source": "iOS · contrato demo-v1",
    "description": "Producto ficticio recuperado del contrato de la demo iOS. Código prefijado para evitar colisiones con el catálogo SQL."
  },
  {
    "id": 206,
    "code": "IOS-DEMO-006",
    "name": "Bolígrafo Orbit",
    "category": "Oficina",
    "price": 19.9,
    "stock": 40,
    "min": 10,
    "color": "cream",
    "symbol": "productos",
    "source": "iOS · contrato demo-v1",
    "description": "Producto ficticio recuperado del contrato de la demo iOS. Código prefijado para evitar colisiones con el catálogo SQL."
  }
]);
export const customers = [
  {
    "id": "DEMO-C001",
    "name": "Ana Torres"
  },
  {
    "id": "DEMO-C002",
    "name": "Luis Pérez"
  },
  {
    "id": "DEMO-C003",
    "name": "María Gómez"
  },
  {
    "id": "DEMO-C004",
    "name": "Carlos Ruiz"
  },
  {
    "id": "DEMO-C005",
    "name": "Laura Díaz"
  },
  {
    "id": "DEMO-C006",
    "name": "Pedro Castro"
  },
  {
    "id": "DEMO-C007",
    "name": "Sofía Rojas"
  },
  {
    "id": "DEMO-C008",
    "name": "Diego Vargas"
  },
  {
    "id": "DEMO-C009",
    "name": "Elena Mora"
  },
  {
    "id": "DEMO-C010",
    "name": "Jorge Silva"
  }
];
export const categories = [...new Set(products.map(p=>p.category))];
export const lowStock = products.filter(p=>p.stock <= p.min);
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
            (day * 5 + j * 2 + Math.floor(day / 6) + (j % 3)) % 6
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
sales.push(...[
  {
    "id": "demo-sale-1-line-0",
    "orderId": "demo-sale-1",
    "date": "2026-11-01",
    "branch": "Sin asignar",
    "productId": 201,
    "quantity": 2,
    "totalCents": 9980,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-1-line-1",
    "orderId": "demo-sale-1",
    "date": "2026-11-01",
    "branch": "Sin asignar",
    "productId": 206,
    "quantity": 3,
    "totalCents": 5970,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-2-line-0",
    "orderId": "demo-sale-2",
    "date": "2026-11-02",
    "branch": "Sin asignar",
    "productId": 202,
    "quantity": 1,
    "totalCents": 12990,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-3-line-0",
    "orderId": "demo-sale-3",
    "date": "2026-11-03",
    "branch": "Sin asignar",
    "productId": 204,
    "quantity": 2,
    "totalCents": 17980,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-4-line-0",
    "orderId": "demo-sale-4",
    "date": "2026-11-04",
    "branch": "Sin asignar",
    "productId": 205,
    "quantity": 1,
    "totalCents": 19990,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-4-line-1",
    "orderId": "demo-sale-4",
    "date": "2026-11-04",
    "branch": "Sin asignar",
    "productId": 201,
    "quantity": 1,
    "totalCents": 4990,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-5-line-0",
    "orderId": "demo-sale-5",
    "date": "2026-11-05",
    "branch": "Sin asignar",
    "productId": 203,
    "quantity": 2,
    "totalCents": 13980,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-5-line-1",
    "orderId": "demo-sale-5",
    "date": "2026-11-05",
    "branch": "Sin asignar",
    "productId": 206,
    "quantity": 2,
    "totalCents": 3980,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-6-line-0",
    "orderId": "demo-sale-6",
    "date": "2026-11-06",
    "branch": "Sin asignar",
    "productId": 201,
    "quantity": 3,
    "totalCents": 14970,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-6-line-1",
    "orderId": "demo-sale-6",
    "date": "2026-11-06",
    "branch": "Sin asignar",
    "productId": 204,
    "quantity": 1,
    "totalCents": 8990,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-7-line-0",
    "orderId": "demo-sale-7",
    "date": "2026-11-07",
    "branch": "Sin asignar",
    "productId": 202,
    "quantity": 1,
    "totalCents": 12990,
    "source": "iOS · contrato demo-v1"
  },
  {
    "id": "demo-sale-7-line-1",
    "orderId": "demo-sale-7",
    "date": "2026-11-07",
    "branch": "Sin asignar",
    "productId": 206,
    "quantity": 4,
    "totalCents": 7960,
    "source": "iOS · contrato demo-v1"
  }
]);
sales.sort((a,b)=>b.date.localeCompare(a.date));
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
    orders: new Set(current.map(s=>s.orderId || s.id)).size,
    ticket: current.length ? revenue / new Set(current.map(s=>s.orderId || s.id)).size : 0,
    delta: priorRevenue ? ((revenue - priorRevenue) / priorRevenue) * 100 : null,
    series: dates.map((date) => sum(current.filter((s) => s.date === date))),
    previous: previous.map((date) => sum(prior.filter((s) => s.date === date))),
    ranking,
  };
}
export function exportRows(data) {
  return [
    ['Fecha', 'Pedido demo', 'Sucursal', 'Producto', 'Unidades', 'Importe PEN', 'Referencia', 'Fuente'],
    ...data.current.map((s) => [
      s.date,
      s.orderId || s.id,
      s.branch,
      products.find((p) => p.id === s.productId).name,
      s.quantity,
      (s.totalCents / 100).toFixed(2),
      products.find(p=>p.id===s.productId).code,
      s.source || 'PWA · historial generado',
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
