/** Optional same-origin bridge. No SQL driver, service token or private key enters the PWA. */
const paths = Object.freeze({
  products: "products",
  categories: "categories",
  customers: "customers",
  inventory: "inventory",
  sales: "sales",
  reports: "reports",
  status: "source/status",
});
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.authorization;
  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ") ||
    authorization.length <= 7 ||
    authorization.length > 8199
  )
    return res.status(401).json({ error: { code: "authentication_required" } });
  const resource = req.query?.resource;
  if (typeof resource !== "string" || !Object.hasOwn(paths, resource))
    return res.status(400).json({ error: { code: "invalid_resource" } });
  let origin;
  try {
    origin = new URL(process.env.DATACORE_API_ORIGIN);
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/"
    )
      throw Error();
  } catch {
    return res.status(503).json({ error: { code: "backend_not_configured" } });
  }
  const url = new URL("/api/" + paths[resource], origin);
  const allowed = new Set([
    "q",
    "limit",
    "offset",
    "start",
    "end",
    "product_id",
    "category_id",
    "low_only",
  ]);
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === "resource") continue;
    if (!allowed.has(key) || typeof value !== "string" || value.length > 200)
      return res.status(400).json({ error: { code: "invalid_input" } });
    url.searchParams.set(key, value);
  }
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(url, {
      headers: { Authorization: authorization, Accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!upstream.ok) {
      const status = [401, 403, 422, 503].includes(upstream.status)
        ? upstream.status
        : 502;
      return res.status(status).json({
        error: {
          code:
            status === 401
              ? "authentication_required"
              : status === 403
                ? "insufficient_scope"
                : "backend_unavailable",
        },
      });
    }
    if (!upstream.headers.get("content-type")?.includes("application/json"))
      throw Error();
    const reader = upstream.body.getReader();
    let size = 0,
      chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1024 * 1024) {
        await reader.cancel();
        throw Error();
      }
      chunks.push(value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: { code: "backend_unavailable" } });
  } finally {
    clearTimeout(timeout);
  }
}
