import test from 'node:test';
import assert from 'node:assert/strict';
import { analytics, products, sales, exportRows, toCsv } from '../js/data.js';
import { demoAnswer } from '../js/assistant.js';
import handler from '../../api/assistant.mjs';
test('all periods reconcile to integer-cent sales, ranking and previous periods', () => {
  for (const days of [7, 30, 60])
    for (const branch of ['Todas', 'Centro', 'Norte', 'Sur']) {
      const d = analytics(days, branch);
      assert.equal(d.series.length, days);
      assert.equal(d.previous.length, days);
      assert.equal(
        Math.round(d.revenue * 100),
        d.current.reduce((a, s) => a + s.totalCents, 0),
      );
      assert.equal(
        Math.round(d.ranking.reduce((a, p) => a + p.revenue, 0) * 100),
        Math.round(d.revenue * 100),
      );
      assert.ok(
        d.current.every(
          (s) =>
            d.dates.includes(s.date) &&
            (branch === 'Todas' || s.branch === branch),
        ),
      );
      assert.ok(d.prior.every((s) => !d.dates.includes(s.date)));
      assert.equal(exportRows(d).length, d.current.length + 1);
      assert.equal(d.orders, d.current.length);
    }
});
test('CSV quotes strings, newlines and spreadsheet formula prefixes', () => {
  const csv = toCsv([['=1+2', 'A"B', 'a\nb', 12.3, '@SUM(A1)']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\' =1+2"'));
  assert.ok(csv.includes('"A""B"'));
  assert.ok(csv.includes('"a\nb"'));
  assert.ok(csv.includes('"\' @SUM(A1)"'));
});
test('inventory and demo replies are sourced and never claim connected AI', () => {
  assert.ok(
    demoAnswer('¿Qué productos necesitan reposición?', analytics()).includes(
      'Casaca urbana: 2',
    ),
  );
  assert.equal(products.filter((p) => p.stock <= p.min).length, 2);
  assert.equal(new Set(sales.map((s) => s.id)).size, sales.length);
  const d = analytics();
  assert.ok(demoAnswer('stock', d).includes('Casaca urbana: 2'));
  assert.ok(demoAnswer('comparar polo y jean', d).includes('Jean clásico'));
  assert.ok(demoAnswer('ventas', d).includes('no usa un modelo'));
  assert.ok(
    demoAnswer('¿Quién ganará mañana?', d).includes('no puedo interpretar'),
  );
});
test('server boundary rejects unsupported methods, invalid input and unconfigured access', () => {
  function request(method, body) {
    let status, payload;
    const res = {
      setHeader() {},
      status(s) {
        status = s;
        return this;
      },
      json(p) {
        payload = p;
        return this;
      },
    };
    handler({ method, body }, res);
    return { status, payload };
  }
  assert.equal(request('GET').status, 405);
  assert.equal(request('POST', { message: '' }).status, 400);
  assert.equal(request('POST', { message: 'x'.repeat(2001) }).status, 400);
  assert.equal(request('POST', { message: 'ventas' }).status, 503);
});
