import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { products, customers, categories, provenance } from "../js/data.js";
import { original } from "../js/sql-fixtures.js";

test("every recovered product retains the exact original SQL business fields", () => {
  const sql = fs.readFileSync(
    new URL("../../sql/02_datos_prueba.sql", import.meta.url),
    "utf8",
  );
  const rows = [
    ...sql.matchAll(
      /\(N'(DEMO-\d+)', N'([^']+)', N'([^']+)', ([\d.]+), (\d+)\)/g,
    ),
  ];
  assert.equal(rows.length, 20);
  for (const m of rows) {
    const p = products.find((p) => p.code === m[1]);
    assert.ok(p);
    assert.deepEqual(
      [p.name, p.category, p.price, p.stock, p.min],
      [m[2], m[3], +m[4], +m[5], 5],
    );
  }
  const clientRows = [
    ...sql.matchAll(/\(N'(DEMO-C\d+)', N'([^']+)', N'([^']+)', N'([^']+)'\)/g),
  ];
  assert.equal(clientRows.length, 10);
  for (const m of clientRows) {
    assert.equal(customers.find((c) => c.document === m[1]).name, m[2]);
  }
});
test("all source hashes match canonical original SQL and category relationships resolve", () => {
  for (const [name, digest] of Object.entries(provenance.files)) {
    const data = fs
      .readFileSync(new URL("../../sql/" + name, import.meta.url), "utf8")
      .replaceAll("\r\n", "\n");
    assert.equal(createHash("sha256").update(data).digest("hex"), digest);
  }
  assert.equal(new Set(products.map((p) => p.code)).size, 20);
  assert.equal(new Set(customers.map((c) => c.document)).size, 10);
  assert.ok(products.every((p) => categories.includes(p.category)));
  assert.deepEqual(original.categories, [
    "Tecnología",
    "Papelería",
    "Hogar",
    "Accesorios",
  ]);
});
test("original table and foreign-key contracts are present without invented branches", () => {
  const schema =
    fs.readFileSync(
      new URL("../../sql/01_crear_base_y_tablas.sql", import.meta.url),
      "utf8",
    ) +
    fs.readFileSync(
      new URL("../../sql/03_solicitudes_ventas.sql", import.meta.url),
      "utf8",
    );
  for (const table of [
    "Categorias",
    "Productos",
    "Clientes",
    "Ventas",
    "DetalleVentas",
    "VentasSolicitudes",
  ])
    assert.ok(schema.includes("CREATE TABLE dbo." + table));
  for (const relation of [
    "REFERENCES dbo.Categorias(CategoriaID)",
    "REFERENCES dbo.Clientes(ClienteID)",
    "REFERENCES dbo.Ventas(VentaID)",
    "REFERENCES dbo.Productos(ProductoID)",
  ])
    assert.ok(schema.includes(relation));
  assert.ok(schema.includes("VersionFila ROWVERSION"));
  assert.ok(
    schema.includes("SolicitudID UNIQUEIDENTIFIER NOT NULL PRIMARY KEY"),
  );
  assert.equal(schema.includes("SucursalID"), false);
});
