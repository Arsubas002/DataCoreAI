"""Pruebas aisladas: no sockets de negocio, SQL ni proveedores externos."""

import json
from pathlib import Path
from unittest import TestCase, mock
from fastapi.testclient import TestClient
from pydantic import ValidationError
from api.datacore_api.main import create_app
from api.datacore_api.models import Snapshot
from api.datacore_api.repository import DemoRepository
from api.datacore_api.security import Principal, RateLimiter, demo_principal

ROOT = Path(__file__).resolve().parents[2]


class APITests(TestCase):
    def setUp(self):
        self.app = create_app(limiter=RateLimiter(limit=1000))
        self.client = TestClient(self.app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def test_shared_fixtures_are_identical_and_typed(self):
        expected = (ROOT / "contracts/demo-v1.json").read_bytes()
        for path in [
            "api/datacore_api/resources/demo-v1.json",
            "ios/Packages/DataCoreDomain/Sources/DataCoreDomain/Resources/demo-v1.json",
        ]:
            self.assertEqual((ROOT / path).read_bytes(), expected)
        self.assertEqual(Snapshot.model_validate_json(expected).currency, "PEN")

    def test_summary_matches_ledger_and_daily_counts(self):
        value = self.client.get("/v1/dashboard").json()
        self.assertEqual(value["revenue_minor"], 134770)
        self.assertEqual(
            value["revenue_minor"], sum(d["revenue_minor"] for d in value["daily"])
        )
        self.assertEqual(value["sales_count"], 7)
        self.assertEqual(value["stock_units"], 83)
        self.assertEqual(value["alert_count"], 3)
        self.assertEqual(len(value["daily"]), 7)

    def test_period_is_inclusive_and_empty_is_zero(self):
        value = self.client.get("/v1/dashboard?start=2026-11-01&end=2026-11-01").json()
        self.assertEqual(value["revenue_minor"], 15950)
        self.assertEqual(value["sales_count"], 1)
        empty = self.client.get("/v1/dashboard?start=2026-12-01&end=2026-12-02").json()
        self.assertEqual(empty["revenue_minor"], 0)
        self.assertEqual(len(empty["daily"]), 2)

    def test_invalid_periods_and_unbounded_queries(self):
        for query in [
            "start=2026-11-08&end=2026-11-01",
            "start=2020-01-01&end=2026-11-07",
            "start=not-date",
        ]:
            self.assertEqual(self.client.get("/v1/dashboard?" + query).status_code, 422)
        self.assertEqual(
            self.client.get("/v1/products", params={"q": "x" * 121}).status_code, 422
        )

    def test_product_search_category_and_literal_sql_text(self):
        response = self.client.get(
            "/v1/products", params={"q": "cuaderno", "category": "Oficina"}
        )
        self.assertEqual([p["id"] for p in response.json()], ["p1"])
        self.assertEqual(
            self.client.get(
                "/v1/products", params={"q": "'; DROP TABLE productos--"}
            ).json(),
            [],
        )

    def test_inventory_includes_minimum_equality_and_out(self):
        self.assertEqual(
            {p["id"] for p in self.client.get("/v1/inventory?state=low").json()},
            {"p2", "p3", "p5"},
        )
        self.assertEqual(
            [p["id"] for p in self.client.get("/v1/inventory?state=out").json()], ["p3"]
        )
        self.assertEqual(self.client.get("/v1/inventory?state=SQL").status_code, 422)

    def test_preview_uses_catalog_prices_and_never_persists(self):
        before = self.client.get("/v1/snapshot").json()
        preview = self.client.post(
            "/v1/sales/preview",
            json={
                "lines": [
                    {"product_id": "p1", "quantity": 2},
                    {"product_id": "p6", "quantity": 3},
                ]
            },
        ).json()
        self.assertEqual(preview["total_minor"], 15950)
        self.assertFalse(preview["persisted"])
        self.assertEqual(before, self.client.get("/v1/snapshot").json())

    def test_preview_rejects_empty_duplicate_price_override_and_bad_quantities(self):
        invalid = [
            [],
            [{"product_id": "p1", "quantity": 25}],
            [{"product_id": "p3", "quantity": 1}],
            [{"product_id": "missing", "quantity": 1}],
            [{"product_id": "p1", "quantity": 1}, {"product_id": "p1", "quantity": 2}],
            [{"product_id": "p1", "quantity": 1, "unit_price_minor": 1}],
        ]
        invalid += [
            [{"product_id": "p1", "quantity": q}] for q in [True, 0, -1, 1.5, "2", 1000]
        ]
        for lines in invalid:
            with self.subTest(lines=lines):
                self.assertEqual(
                    self.client.post(
                        "/v1/sales/preview", json={"lines": lines}
                    ).status_code,
                    422,
                )

    def test_reports_and_sales_match_same_period(self):
        report = self.client.get("/v1/reports?start=2026-11-02&end=2026-11-03").json()
        sales = self.client.get("/v1/sales?start=2026-11-02&end=2026-11-03").json()
        self.assertEqual(report["summary"]["sales_count"], len(sales))
        self.assertEqual(report["summary"]["revenue_minor"], 30970)
        self.assertEqual(len(report["inventory"]), 6)

    def test_assistant_whitelist_sources_and_no_model(self):
        for question in ["revenue", "average", "top_products", "stock_alerts"]:
            result = self.client.post("/v1/assistant", json={"question": question})
            self.assertEqual(result.status_code, 200)
            self.assertFalse(result.json()["generative"])
            self.assertEqual(len(result.json()["sources"]), 3)
        for body in [
            {"question": "DROP TABLE"},
            {"question": "revenue", "sql": "select 1"},
            {"prompt": "secret"},
        ]:
            self.assertEqual(
                self.client.post("/v1/assistant", json=body).status_code, 422
            )

    def test_assistant_empty_average_is_undefined(self):
        result = self.client.post(
            "/v1/assistant",
            json={"question": "average", "start": "2026-12-01", "end": "2026-12-02"},
        )
        self.assertIn("no está definido", result.json()["text"])

    def test_production_and_writes_are_not_available(self):
        with self.assertRaises(RuntimeError):
            create_app(mode="production")
        for path in ["/v1/products", "/v1/sales", "/v1/inventory"]:
            self.assertEqual(self.client.post(path, json={}).status_code, 405)
        self.assertEqual(self.client.delete("/v1/products/p1").status_code, 404)

    def test_bearer_is_not_mistaken_for_authenticated_identity(self):
        result = self.client.get(
            "/v1/products", headers={"Authorization": "Bearer fictional-not-a-secret"}
        )
        self.assertEqual(result.status_code, 401)
        self.assertNotIn("fictional-not-a-secret", result.text)
        for header in ["Basic fictional", "Bearer", ""]:
            self.assertEqual(
                self.client.get(
                    "/v1/products", headers={"Authorization": header}
                ).status_code,
                401,
            )
        self.app.dependency_overrides[demo_principal] = lambda: Principal(
            "sample", "sample", frozenset()
        )
        self.assertEqual(self.client.get("/v1/products").status_code, 403)

    def test_body_limit_including_missing_length_and_sensitive_validation(self):
        sensitive = "fictional-sensitive-test-value"
        result = self.client.post(
            "/v1/assistant",
            content=json.dumps({"question": sensitive}),
            headers={"Content-Type": "application/json"},
        )
        self.assertNotIn(sensitive, result.text)
        result = self.client.post(
            "/v1/assistant",
            content=iter([b" " * 20000, b" " * 20000]),
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(result.status_code, 413)

    def test_rate_limit_no_forwarded_header_bypass(self):
        with TestClient(create_app(limiter=RateLimiter(limit=2))) as client:
            self.assertEqual(client.get("/v1/products").status_code, 200)
            self.assertEqual(client.get("/health").status_code, 200)
            result = client.get(
                "/v1/products", headers={"X-Forwarded-For": "another-client"}
            )
            self.assertEqual(result.status_code, 429)
            self.assertEqual(result.headers["retry-after"], "60")

    def test_rate_limiter_expires_and_caps_memory(self):
        clock = [0]
        limit = RateLimiter(limit=1, capacity=1, clock=lambda: clock[0])
        self.assertTrue(limit.allow("a"))
        self.assertFalse(limit.allow("a"))
        self.assertFalse(limit.allow("b"))
        clock[0] = 60
        self.assertTrue(limit.allow("b"))
        self.assertEqual(len(limit.clients), 1)

    def test_headers_host_policy_and_no_cors(self):
        result = self.client.get(
            "/v1/products", headers={"Origin": "https://untrusted.invalid"}
        )
        self.assertEqual(result.headers["cache-control"], "no-store")
        self.assertEqual(result.headers["x-content-type-options"], "nosniff")
        self.assertNotIn("access-control-allow-origin", result.headers)
        self.assertEqual(
            self.client.get(
                "/health", headers={"Host": "attacker.invalid"}
            ).status_code,
            400,
        )

    def test_audit_does_not_include_queries_bodies_tokens_or_raw_path(self):
        with self.assertLogs("datacore.api.audit", level="INFO") as logs:
            self.client.get("/v1/products?q=fictional-sensitive-marker")
            self.client.get("/fictional-sensitive-marker")
            self.client.post(
                "/v1/assistant", json={"question": "fictional-sensitive-marker"}
            )
        self.assertNotIn("fictional-sensitive-marker", "\n".join(logs.output))
        self.assertIn("/v1/products", "\n".join(logs.output))

    def test_internal_error_does_not_leak_details(self):
        with mock.patch.object(
            DemoRepository,
            "summary",
            side_effect=RuntimeError("fictional-sensitive-marker"),
        ):
            result = self.client.get("/v1/dashboard")
        self.assertEqual(result.status_code, 500)
        self.assertNotIn("fictional-sensitive-marker", result.text)

    def test_openapi_contains_contracts_and_approved_routes(self):
        schema = self.client.get("/openapi.json").json()
        self.assertEqual(
            schema["components"]["schemas"]["Snapshot"]["properties"]["mode"]["const"],
            "demo",
        )
        self.assertEqual(len(schema["paths"]), 9)
        self.assertIn("HTTPBearer", schema["components"]["securitySchemes"])

    def test_snapshot_rejects_bad_money_booleans_and_references(self):
        sample = json.loads(
            (ROOT / "contracts/demo-v1.json").read_text(encoding="utf-8")
        )
        for value in [True, -1, 0.1, 1_000_000_000_000]:
            sample["products"][0]["price_minor"] = value
            with self.assertRaises(ValidationError):
                Snapshot.model_validate(sample)
        sample["products"][0]["price_minor"] = 4990
        sample["sales"][0]["lines"][0]["product_id"] = "nonexistent"
        with self.assertRaises(ValidationError):
            Snapshot.model_validate(sample)
