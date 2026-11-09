import test from 'node:test';
import assert from 'node:assert/strict';
import { analytics, products } from '../js/data.js';
import {
  breakdown,
  branchTotals,
  cumulative,
  layoutTiles,
  calendar,
  treemap,
  scatter,
} from '../js/charts.js';
test('all chart representations reconcile to the same filtered revenue', () => {
  for (const days of [7, 30, 60])
    for (const branch of ['Todas', 'Centro', 'Norte', 'Sur', 'Sin asignar']) {
      const d = analytics(days, branch),
        cents = (x) => Math.round(x * 100);
      assert.equal(
        cents(breakdown(d).reduce((a, p) => a + p.value, 0)),
        cents(d.revenue),
      );
      assert.equal(
        cents(branchTotals(d).reduce((a, p) => a + p.value, 0)),
        cents(d.revenue),
      );
      assert.equal(cents(cumulative(d.series).at(-1)), cents(d.revenue));
      assert.ok(
        cumulative(d.series).every((v, i, a) => i === 0 || v >= a[i - 1]),
      );
      assert.ok(!/NaN|Infinity/.test(calendar(d) + treemap(d) + scatter(d)));
    }
});
test('treemap rectangles partition the space and match revenue proportions', () => {
  const items = analytics()
      .ranking.filter((p) => p.revenue > 0)
      .map((p) => ({ name: p.name, value: p.revenue })),
    total = items.reduce((a, p) => a + p.value, 0),
    tiles = layoutTiles(items);
  assert.equal(tiles.length, items.length);
  assert.ok(Math.abs(tiles.reduce((a, t) => a + t.w * t.h, 0) - 10000) < 1e-6);
  for (const t of tiles) {
    assert.ok(Math.abs((t.w * t.h) / 10000 - t.value / total) < 1e-8);
    assert.ok(
      t.x >= 0 && t.y >= 0 && t.x + t.w <= 100.00001 && t.y + t.h <= 100.00001,
    );
  }
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++) {
      const a = tiles[i],
        b = tiles[j];
      const overlapX = Math.max(
          0,
          Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
        ),
        overlapY = Math.max(
          0,
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
        );
      assert.ok(overlapX * overlapY < 1e-6);
    }
});
test('empty chart data and source limitations remain explicit', () => {
  const d = analytics(7, 'No existe');
  assert.equal(d.revenue, 0);
  for (const markup of [calendar(d), treemap(d), scatter(d)])
    assert.ok(!/NaN|Infinity/.test(markup));
  assert.match(calendar(d), /Sin datos de hora/);
  assert.match(scatter(d), /No se calcula rentabilidad/);
  assert.equal(products.length, 32);
});
