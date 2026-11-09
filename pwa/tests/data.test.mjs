import test from "node:test";
import assert from "node:assert/strict";
import {
  products,
  customers,
  categories,
  lowStock,
  sales,
  analytics,
  exportRows,
  toCsv,
  provenance,
} from "../js/data.js";
import { original } from "../js/sql-fixtures.js";
import { demoAnswer } from "../js/assistant.js";

test("public source is precisely the original SQL fixture catalogue, never the other demos", () => {
  assert.equal(products.length, 20);
  assert.equal(customers.length, 10);
  assert.equal(categories.length, 4);
  assert.equal(
    products.reduce((n, p) => n + p.stock, 0),
    336,
  );
  assert.equal(lowStock.length, 6);
  assert.equal(products.filter((p) => p.stock === 0).length, 1);
  assert.deepEqual(
    products.map((p) => p.code),
    Array.from(
      { length: 20 },
      (_, i) => "DEMO-" + String(i + 1).padStart(3, "0"),
    ),
  );
  assert.ok(products.every((p) => p.id === p.code));
  assert.ok(!JSON.stringify(original).includes("PWA-"));
  assert.ok(!JSON.stringify(original).includes("IOS-DEMO"));
  assert.equal(provenance.connected, false);
  assert.equal(provenance.salesRecovered, false);
  assert.equal(provenance.numericPrimaryKeysRecovered, false);
});
test("no missing sales are replaced with zero-valued or generated financial results", () => {
  assert.deepEqual(sales, []);
  for (const days of [7, 30, 60]) {
    const d = analytics(days);
    assert.equal(d.available, false);
    for (const key of ["revenue", "orders", "units", "ticket", "delta"])
      assert.equal(d[key], null);
    assert.deepEqual(d.series, []);
    assert.deepEqual(d.current, []);
    assert.ok(d.ranking.every((p) => p.revenue === null && p.units === null));
  }
});
test("public customer preview does not expose original contact fields", () => {
  assert.ok(
    customers.every(
      (c) => c.id === c.document && /^DEMO-C\d{3}$/.test(c.document),
    ),
  );
  for (const c of original.customers) {
    assert.equal("email" in c, false);
    assert.equal("phone" in c, false);
  }
});
test("export preserves source, exact prices, quantities and formula neutralization", () => {
  const rows = exportRows();
  assert.equal(rows.length, 21);
  assert.equal(rows.find((r) => r[0] === "DEMO-008")[3], "3.50");
  assert.equal(rows.find((r) => r[0] === "DEMO-010")[4], 0);
  assert.ok(
    rows
      .slice(1)
      .every((r) => String(r[6]).includes("no es inventario en vivo")),
  );
  const csv = toCsv([["=1+2", 'A"B', "a\nb", "@SUM(A1)"]]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\' =1+2"'));
  assert.ok(csv.includes('"A""B"'));
  assert.ok(csv.includes('"\' @SUM(A1)"'));
});
test("open questions return sourced facts or explicit missing-data explanations", () => {
  assert.match(
    demoAnswer("¿Qué productos deberían reponerse?"),
    /Mouse óptico: 4/,
  );
  assert.match(demoAnswer("precio DEMO-002"), /Mouse óptico/);
  assert.match(demoAnswer("clientes"), /Ana Torres/);
  for (const question of [
    "mayores ingresos",
    "evolución de ventas",
    "compara períodos",
  ])
    assert.match(demoAnswer(question), /No hay registros originales/);
  assert.match(
    demoAnswer("qué sucursal vende más"),
    /no contiene una tabla o columna de sucursal/,
  );
  assert.match(
    demoAnswer("una pregunta desconocida"),
    /No hay un modelo de lenguaje/,
  );
});

test("local price and category questions retain original prices and ordering", () => {
  const expensive = demoAnswer("¿Cuáles son los productos más caros?");
  assert.ok(
    expensive.indexOf("Cámara web") < expensive.indexOf("Mochila urbana"),
  );
  const paper = demoAnswer("Muéstrame productos de Papelería");
  assert.match(paper, /Cuaderno cuadriculado/);
  assert.ok(!paper.includes("Teclado USB"));
  assert.match(paper, /datos de prueba/);
});
