import test from "node:test";
import assert from "node:assert/strict";
import { products, sales } from "../js/data.js";
import { inventoryStats, quotation } from "../js/catalogue-math.js";

test("inventory health and catalogue valuation reconcile all original SQL records in cents", () => {
  const s = inventoryStats();
  assert.deepEqual(
    [
      s.units,
      s.count,
      s.healthy,
      s.low,
      s.empty,
      s.healthyPercent,
      s.valueCents,
    ],
    [336, 20, 14, 5, 1, 70, 735050],
  );
  assert.deepEqual(
    s.categories.map((c) => [c.name, c.units, c.valueCents]),
    [
      ["Tecnología", 54, 310300],
      ["Papelería", 150, 58250],
      ["Hogar", 55, 164300],
      ["Accesorios", 77, 202200],
    ],
  );
  assert.equal(
    inventoryStats(products.filter((p) => p.category === "Papelería"))
      .valueCents,
    58250,
  );
});

test("quotations use exact fixture prices without changing inventory or inventing sales", () => {
  const before = JSON.stringify(products);
  const result = quotation([
    { code: "DEMO-001", quantity: 2 },
    { code: "DEMO-006", quantity: 3 },
  ]);
  assert.equal(result.totalCents, 15550);
  assert.equal(result.units, 5);
  assert.equal(result.items[1].priceCents, 850);
  assert.equal(result.items[1].subtotalCents, 2550);
  assert.equal(JSON.stringify(products), before);
  assert.deepEqual(sales, []);
});

test("quotes reject fractional quantities, unavailable stock, unknown codes and duplicate lines", () => {
  for (const lines of [
    [{ code: "DEMO-001", quantity: 0 }],
    [{ code: "DEMO-001", quantity: 1.5 }],
    [{ code: "DEMO-001", quantity: 16 }],
    [{ code: "DEMO-010", quantity: 1 }],
    [{ code: "invented", quantity: 1 }],
    [
      { code: "DEMO-001", quantity: 1 },
      { code: "DEMO-001", quantity: 1 },
    ],
  ])
    assert.throws(() => quotation(lines));
  assert.deepEqual(quotation([]), { items: [], units: 0, totalCents: 0 });
});
