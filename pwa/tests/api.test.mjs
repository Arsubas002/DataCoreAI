import test from "node:test";
import assert from "node:assert/strict";
import handler from "../../api/data.mjs";
async function run(req) {
  let status, body;
  const headers = {};
  const res = {
    setHeader(k, v) {
      headers[k] = v;
    },
    status(s) {
      status = s;
      return this;
    },
    json(v) {
      body = v;
      return this;
    },
  };
  await handler(
    { method: "GET", headers: {}, query: { resource: "products" }, ...req },
    res,
  );
  return { status, body, headers };
}
test("Vercel bridge denies anonymous requests and unsupported methods before any fetch", async () => {
  assert.equal((await run({})).status, 401);
  assert.equal((await run({ method: "POST" })).status, 405);
  assert.equal(
    (await run({ headers: { authorization: "Bearer " } })).status,
    401,
  );
  for (const resource of ["__proto__", "constructor", "toString"]) {
    assert.equal(
      (
        await run({
          headers: { authorization: "Bearer test-only" },
          query: { resource },
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await run({
        headers: { authorization: "Bearer test" },
        query: { resource: "http://attacker/" },
      })
    ).status,
    400,
  );
  assert.equal((await run({})).headers["Cache-Control"], "no-store");
});
test("bridge does not accept an unconfigured or insecure backend origin", async () => {
  const old = process.env.DATACORE_API_ORIGIN;
  try {
    delete process.env.DATACORE_API_ORIGIN;
    assert.equal(
      (await run({ headers: { authorization: "Bearer test" } })).status,
      503,
    );
    process.env.DATACORE_API_ORIGIN = "http://localhost:8000";
    assert.equal(
      (await run({ headers: { authorization: "Bearer test" } })).status,
      503,
    );
  } finally {
    if (old === undefined) delete process.env.DATACORE_API_ORIGIN;
    else process.env.DATACORE_API_ORIGIN = old;
  }
});

async function withBackend(fetchMock, check) {
  const previous = process.env.DATACORE_API_ORIGIN;
  const originalFetch = globalThis.fetch;
  process.env.DATACORE_API_ORIGIN = "https://backend.example/";
  globalThis.fetch = fetchMock;
  try {
    await check();
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.DATACORE_API_ORIGIN;
    else process.env.DATACORE_API_ORIGIN = previous;
  }
}

test("bridge forwards only the caller token to a fixed resource and preserves exact amounts", async () => {
  const calls = [];
  await withBackend(
    async (url, options) => {
      calls.push([url, options]);
      return Response.json({ data: [{ ProductoID: 9, Precio: "12.50" }] });
    },
    async () => {
      const result = await run({
        headers: {
          authorization: "Bearer test-only",
          cookie: "private=ignored",
        },
        query: { resource: "reports", start: "2026-01-01", end: "2026-01-02" },
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.data[0].Precio, "12.50");
      assert.equal(calls.length, 1);
      const [url, options] = calls[0];
      assert.equal(url.origin, "https://backend.example");
      assert.equal(url.pathname, "/api/reports");
      assert.equal(url.searchParams.get("start"), "2026-01-01");
      assert.deepEqual(options.headers, {
        Authorization: "Bearer test-only",
        Accept: "application/json",
      });
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
    },
  );
});

test("bridge rejects query injection, repeated values and oversized searches before contacting SQL API", async () => {
  let calls = 0;
  await withBackend(
    async () => {
      calls++;
      throw Error("Must not fetch");
    },
    async () => {
      for (const query of [
        { resource: "products", origin: "https://attacker.example" },
        { resource: "products", q: ["a", "b"] },
        { resource: "products", q: "x".repeat(201) },
      ]) {
        assert.equal(
          (await run({ headers: { authorization: "Bearer test-only" }, query }))
            .status,
          400,
        );
      }
      assert.equal(calls, 0);
    },
  );
});

test("bridge sanitizes upstream failures and enforces a one MiB response limit", async () => {
  for (const response of [
    new Response("PASSWORD=private", { status: 500 }),
    new Response("private HTML", { headers: { "Content-Type": "text/html" } }),
    Response.json({ data: "x".repeat(1024 * 1024) }),
  ]) {
    await withBackend(
      async () => response,
      async () => {
        const result = await run({
          headers: { authorization: "Bearer test-only" },
        });
        assert.equal(result.status, 502);
        assert.deepEqual(result.body, {
          error: { code: "backend_unavailable" },
        });
      },
    );
  }
});
