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
const views = ['none', 'table', 'bar', 'line', 'kpi', 'distribution'];
const comparisonGroups = ['category', 'product', 'channel', 'shop'];
const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const queryOptions = { fields, metrics, group: ['total', ...Object.keys(dimensions)], views, comparisonGroups };

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
  const { group = 'total', metric = 'net', filters = {}, view = 'none', change, quantityChange, discountRate, order, limit } = query;
  const scenario = Object.fromEntries(Object.entries({ change, quantityChange, discountRate }).filter(([, value]) => value !== undefined));
  const simulated = Object.keys(scenario).length > 0;
  const validPct = (value, min) => value === undefined || (Number.isFinite(value) && value >= min && value <= 100);
  if (!queryOptions.group.includes(group) || !metrics.includes(metric) || !views.includes(view)
      || (order !== undefined && !['asc', 'desc'].includes(order))
      || (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 31))
      || (simulated && metric !== 'net') || !validPct(change, -100) || !validPct(quantityChange, -100) || !validPct(discountRate, 0)) {
    throw new Error('invalid_query_options');
  }
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) throw new Error('invalid_filters');
  const scope = query.replaceContext === true ? filters : { ...context, ...filters };
  const records = select(transactions, scope);
  function aggregate(rows) {
    const net = rows.reduce((sum, row) => {
      const price = Math.round(row.price * (100 + (change ?? 0)));
      const gross = price * row.quantity;
      const rate = discountRate ?? Math.round(row.discount * 100);
      return sum + gross - Math.round(gross * (rate / 100));
    }, 0);
    return Math.round(net * (1 + (quantityChange ?? 0) / 100));
  }
  const buckets = group === 'total' ? [{ name: 'Total', ...totals(records) }] : groupBy(records, dimensions[group]);
  const scenarios = new Map();
  if (simulated) {
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
    if (simulated) {
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
  if (view === 'distribution') {
    const total = rows.reduce((sum, row) => sum + (row[metric] ?? 0), 0);
    rows.forEach(row => { row.sharePct = total > 0 ? 100 * (row[metric] ?? 0) / total : null; });
  }
  const shown = rows.slice(0, limit ?? (group === 'day' ? 90 : 31));
  if (temporal && view === 'line') shown.sort((a, b) => a.name.localeCompare(b.name));
  return { group, metric, filters: scope, view, ...(simulated ? { scenario } : {}), matches: records.length, groups: rows.length, rows: shown };
}

export function comparePeriods(query, context = {}) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw new Error('invalid_comparison');
  const { periods, groups = ['category'], filters = {}, replaceContext = false } = query;
  if (!Array.isArray(periods) || periods.length !== 2 || periods.some(period => !fields.month.includes(period))
      || periods[0] >= periods[1]) {
    throw new Error('invalid_comparison_periods');
  }
  if (!Array.isArray(groups) || groups.length === 0 || new Set(groups).size !== groups.length
      || groups.some(group => !comparisonGroups.includes(group))) {
    throw new Error('invalid_comparison_groups');
  }
  if (!filters || typeof filters !== 'object' || Array.isArray(filters) || Object.hasOwn(filters, 'month')
      || typeof replaceContext !== 'boolean') {
    throw new Error('invalid_comparison_filters');
  }

  const scope = replaceContext ? { ...filters } : { ...context, ...filters };
  delete scope.month;
  const records = select(transactions, { ...scope, month: periods });
  const [baselineRows, currentRows] = periods.map(period => records.filter(row => dimensions.month(row) === period));
  const baseline = comparisonSummary(periods[0], baselineRows);
  const current = comparisonSummary(periods[1], currentRows);
  if (!baseline.orders || !current.orders) {
    return {
      periods, filters: scope, coverage: 'no_matches', baseline, current,
      netDelta: null, netDeltaPct: null, drivers: null, contributions: {},
    };
  }

  const netDelta = current.net - baseline.net;
  // Change the number of orders first at the baseline ticket. The remainder is
  // the change in average ticket evaluated at the current order count.
  const orderCountEffect = Math.round((current.orders - baseline.orders) * baseline.net / baseline.orders);
  return {
    periods,
    filters: scope,
    coverage: 'comparable',
    baseline,
    current,
    netDelta,
    netDeltaPct: baseline.net > 0 ? Math.round(netDelta * 10000 / baseline.net) / 100 : null,
    drivers: { orderCountEffect, averageTicketEffect: netDelta - orderCountEffect },
    contributions: Object.fromEntries(groups.map(group => [group, compareGroups(baselineRows, currentRows, dimensions[group])])),
  };
}

function comparisonSummary(month, records) {
  if (!records.length) return { month, net: null, gross: null, discount: null, units: null, orders: 0, ticket: null };
  const summary = totals(records);
  return { month, ...summary, ticket: Math.round(summary.net / summary.orders) };
}

function compareGroups(baselineRows, currentRows, key) {
  const baseline = new Map(groupBy(baselineRows, key).map(row => [row.name, row.net]));
  const current = new Map(groupBy(currentRows, key).map(row => [row.name, row.net]));
  const names = new Set([...baseline.keys(), ...current.keys()]);
  return [...names].map(name => {
    const baselineNet = baseline.get(name) ?? 0;
    const currentNet = current.get(name) ?? 0;
    return { name, baselineNet, currentNet, netDelta: currentNet - baselineNet };
  }).sort((a, b) => Math.abs(b.netDelta) - Math.abs(a.netDelta) || a.name.localeCompare(b.name, 'es'));
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
  const leader = analyze({ group: 'category', view: 'distribution', limit: 1 }).rows[0];
  return [
    { label: 'Concentración de ingresos', value: pct(leader.sharePct / 100), detail: leader.name + ' representa ' + money(leader.net) + ' del neto trimestral.', recommendation: 'Contrasta la participación por canal antes de asignar presupuesto.', question: '¿Qué tan concentrados están los ingresos por categoría y canal y cómo lo medirías?' },
    { label: 'Ventas de marzo frente a febrero', value: pct(change), detail: money(latest.net) + ' frente a ' + money(previous.net), recommendation: 'Separa el efecto del volumen y el ticket antes de ajustar promociones.', question: '¿Qué categorías, tiendas y canales explican el cambio de ventas netas de febrero a marzo de 2025?' },
    { label: leading.growth >= 0 ? 'Mayor crecimiento mensual por categoría' : 'Mejor variación mensual por categoría', value: leading.category, detail: pct(leading.growth) + ' en ingresos netos de febrero a marzo', recommendation: 'Comprueba si el cambio se concentra en una tienda o un canal.', question: '¿Qué explica la variación de ' + leading.category + ' de febrero a marzo y qué acciones medibles sugieres?' },
    { label: 'Producto con menos unidades vendidas', value: lowest.name, detail: lowest.units + ' unidades de enero a marzo', recommendation: 'Compara su facturación y precio antes de probar una promoción.', question: 'Analiza el desempeño de ' + lowest.name + ' frente a su categoría y sugiere un experimento de promoción.' },
  ];
}
