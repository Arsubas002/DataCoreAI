import test from "node:test";
import assert from "node:assert/strict";
import { products, categories } from "../js/data.js";
import {
  stockBreakdown,
  layoutTiles,
  stockDonut,
  stockMap,
  priceStock,
} from "../js/charts.js";
test("all inventory representations use the same original quantities and category filters", () => {
  for (const category of [null, ...categories]) {
    const list = products.filter((p) => !category || p.category === category),
      total = list.reduce((n, p) => n + p.stock, 0);
    assert.equal(
      stockBreakdown(list).reduce((n, p) => n + p.value, 0),
      total,
    );
    for (const html of [stockDonut(list), stockMap(list), priceStock(list)])
      assert.ok(!/NaN|Infinity/.test(html));
  }
});
test("treemap geometry preserves quantitative area without overlap", () => {
  const values = products
      .filter((p) => p.stock > 0)
      .map((p) => ({ name: p.name, value: p.stock })),
    tiles = layoutTiles(values),
    total = values.reduce((n, p) => n + p.value, 0);
  assert.ok(Math.abs(tiles.reduce((n, p) => n + p.w * p.h, 0) - 10000) < 1e-6);
  for (const p of tiles)
    assert.ok(Math.abs((p.w * p.h) / 10000 - p.value / total) < 1e-8);
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++) {
      const a = tiles[i],
        b = tiles[j],
        x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)),
        y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      assert.ok(x * y < 1e-6);
    }
});

test("empty original-data filters have a readable state and no invalid geometry", () => {
  for (const draw of [stockDonut, stockMap, priceStock]) {
    const html = draw([]);
    assert.match(html, /Sin cantidades para representar/);
    assert.ok(!/NaN|Infinity/.test(html));
  }
  assert.match(stockDonut([{ ...products[0], stock: 0 }]), /Sin cantidades/);
  assert.match(stockMap([{ ...products[0], stock: 0 }]), /Sin cantidades/);
});
