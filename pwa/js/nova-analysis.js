import { catalog, categories, channels, shops, transactions, totals, groupBy, money, pct } from './novaretail-data.js';

const fields = {
  product: catalog.map(item => item.name),
  category: categories,
  channel: channels,
  shop: shops,
  month: ['2025-01', '2025-02', '2025-03'],
  discount: [0, 5, 10, 15],
};
const dimensions = {
  ...Object.fromEntries(['product', 'category', 'channel', 'shop'].map(key => [key, row => row[key]])),
  month: row => row.date.slice(0, 7),
  day: row => row.date,
  discount: row => (row.discount * 100) + ' %',
};
const metrics = ['net', 'gross', 'discount', 'units', 'orders', 'ticket', 'price'];
const views = ['none', 'table', 'bar', 'line', 'kpi'];
const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const queryOptions = { fields, metrics, group: ['total', ...Object.keys(dimensions)], views };

function select(records, filters = {}) {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) throw new Error('invalid_filters');
  const predicates = Object.entries(filters).map(([key, values]) => {
    if (!Object.hasOwn(fields, key) || !Array.isArray(values) || values.length < 1 || values.length > fields[key].length) {
      throw new Error('invalid_filter');
    }
    const normalized = new Set(values.map(normalize));
    if ([...normalized].some(value => !fields[key].some(option => normalize(option) === value))) {
      throw new Error('unknown_filter_value');
    }
    return row => normalized.has(normalize(key === 'discount' ? row.discount * 100 : dimensions[key](row)));
  });
  return records.filter(row => predicates.every(matches => matches(row)));
}

export function analyze(query, context = {}) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw new Error('invalid_query');
  const { group = 'total', metric = 'net', filters = {}, view = 'none', change, order, limit } = query;
  if (!queryOptions.group.includes(group) || !metrics.includes(metric) || !views.includes(view)
      || (order !== undefined && !['asc', 'desc'].includes(order))
      || (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 31))
      || (change !== undefined && (!Number.isFinite(change) || change < -100 || change > 100 || metric !== 'net'))) {
    throw new Error('invalid_query_options');
  }
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) throw new Error('invalid_filters');
  const scope = query.replaceContext === true ? filters : { ...context, ...filters };
  const records = select(transactions, scope);
  function aggregate(rows) {
    if (change === undefined) return null;
    return rows.reduce((sum, row) => {
      const price = Math.round(row.price * (100 + change));
      const gross = price * row.quantity;
      return sum + gross - Math.floor((gross * Math.round(row.discount * 100) + 50) / 100);
    }, 0);
  }
  const buckets = group === 'total' ? [{ name: 'Total', ...totals(records) }] : groupBy(records, dimensions[group]);
  const scenarios = new Map();
  if (change !== undefined) {
    const key = group === 'total' ? () => 'Total' : dimensions[group];
    for (const record of records) {
      const name = key(record);
      const bucket = scenarios.get(name) ?? [];
      bucket.push(record);
      scenarios.set(name, bucket);
    }
  }
  const rows = buckets.map(row => {
    const item = {
      ...row,
      ticket: row.orders ? Math.round(row.net / row.orders) : null,
      price: row.units ? Math.round(row.gross / row.units) : null,
    };
    if (change !== undefined) {
      item.scenario = aggregate(scenarios.get(row.name) ?? []);
      item.delta = item.scenario - row.net;
    }
    return item;
  });
  const temporal = group === 'day' || group === 'month';
  rows.sort((a, b) => (order ? (order === 'asc' ? 1 : -1) * (a[metric] - b[metric])
    : temporal || group === 'discount' ? a.name.localeCompare(b.name) : b[metric] - a[metric])
    || a.name.localeCompare(b.name, 'es'));
  if (temporal) {
    const chronological = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    chronological.forEach((row, index) => {
      const previous = chronological[index - 1]?.[metric];
      row.periodChangePct = previous > 0 && row[metric] !== null
        ? Math.round((row[metric] / previous - 1) * 10000) / 100 : null;
    });
  }
  const shown = rows.slice(0, limit ?? (group === 'day' ? 90 : 31));
  if (temporal && view === 'line') shown.sort((a, b) => a.name.localeCompare(b.name));
  return { group, metric, filters: scope, view, change, matches: records.length, groups: rows.length, rows: shown };
}

export function insights() {
  const monthly = analyze({ group: 'month' }).rows;
  const previous = monthly.at(-2);
  const latest = monthly.at(-1);
  const change = (latest.net - previous.net) / previous.net;
  const byCategory = categories.map(category => {
    const rows = analyze({ group: 'month', filters: { category: [category] } }).rows;
    return { category, growth: (rows.at(-1).net - rows.at(-2).net) / rows.at(-2).net };
  }).sort((a, b) => b.growth - a.growth);
  const leading = byCategory[0];
  const lowest = analyze({ group: 'product', metric: 'units', order: 'asc', limit: 1 }).rows[0];
  return [
    { label: 'Ventas de marzo frente a febrero', value: pct(change), detail: money(latest.net) + ' frente a ' + money(previous.net), question: '¿Qué categorías, tiendas y canales explican el cambio de ventas netas de febrero a marzo de 2025?' },
    { label: leading.growth >= 0 ? 'Mayor crecimiento mensual por categoría' : 'Mejor variación mensual por categoría', value: leading.category, detail: pct(leading.growth) + ' en ingresos netos de febrero a marzo', question: '¿Qué explica la variación de ' + leading.category + ' de febrero a marzo y qué acciones medibles sugieres?' },
    { label: 'Producto con menos unidades vendidas', value: lowest.name, detail: lowest.units + ' unidades de enero a marzo', question: 'Analiza el desempeño de ' + lowest.name + ' frente a su categoría y sugiere un experimento de promoción.' },
  ];
}
