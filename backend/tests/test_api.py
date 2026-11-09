import time
import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.security import AuthSettings
from backend.sql_store import SqlStore, DatabaseUnavailable, boundaries, odbc_value


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.public = (
            cls.private.public_key()
            .public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            )
            .decode()
        )

    def setUp(self):
        self.store = MagicMock()
        self.store.products.return_value = [
            {"ProductoID": 9, "Precio": Decimal("12.50")}
        ]
        self.store.customers.return_value = []
        self.store.inventory.return_value = []
        self.store.sales.return_value = []
        self.store.reports.return_value = {"metrics": {"revenue": Decimal("45.50")}}
        self.client = TestClient(
            create_app(
                AuthSettings("https://issuer.example", "datacore", self.public),
                self.store,
            )
        )

    def auth(self, scopes="products:read", **updates):
        now = int(time.time())
        claims = {
            "sub": "test-only",
            "iss": "https://issuer.example",
            "aud": "datacore",
            "iat": now,
            "exp": now + 600,
            "scope": scopes,
            **updates,
        }
        return {
            "Authorization": "Bearer "
            + jwt.encode(claims, self.private, algorithm="RS256")
        }

    def test_unauthenticated_never_opens_sql(self):
        for path in [
            "/api/products",
            "/api/customers",
            "/api/sales?start=2026-01-01&end=2026-01-03",
            "/api/inventory",
            "/api/reports?start=2026-01-01&end=2026-01-03",
            "/api/source/status",
        ]:
            self.assertEqual(self.client.get(path).status_code, 401)
        self.assertFalse(self.store.mock_calls)

    def test_scope_is_enforced(self):
        self.assertEqual(
            self.client.get("/api/customers", headers=self.auth()).status_code, 403
        )
        self.store.customers.assert_not_called()

    def test_invalid_claims_rejected(self):
        for updates in [
            {"aud": "other"},
            {"iss": "https://other.example"},
            {"exp": 1},
            {"scope": ["products:read"]},
            {"iat": 0},
        ]:
            self.assertEqual(
                self.client.get(
                    "/api/products", headers=self.auth(**updates)
                ).status_code,
                401,
            )
        self.store.products.assert_not_called()

    def test_unsigned_and_algorithm_confusion_rejected(self):
        token = jwt.encode({"sub": "attacker"}, key="", algorithm="none")
        self.assertEqual(
            self.client.get(
                "/api/products", headers={"Authorization": "Bearer " + token}
            ).status_code,
            401,
        )

    def test_decimal_and_source_are_exact(self):
        response = self.client.get(
            "/api/products?q=Mouse&limit=10", headers=self.auth()
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"][0]["Precio"], "12.50")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.store.products.assert_called_once_with("Mouse", None, 10, 0)

    def test_limits_and_dates_validate_before_database(self):
        for query in ["limit=201", "offset=-1", "category_id=-3", "q=" + "x" * 201]:
            self.assertEqual(
                self.client.get(
                    "/api/products?" + query, headers=self.auth()
                ).status_code,
                422,
            )
        self.store.products.assert_not_called()
        for start, end in [
            ("2026-02-02", "2026-01-01"),
            ("2024-01-01", "2026-01-01"),
            ("bad", "2026-01-01"),
        ]:
            self.assertEqual(
                self.client.get(
                    f"/api/reports?start={start}&end={end}",
                    headers=self.auth("reports:read"),
                ).status_code,
                422,
            )
        self.store.reports.assert_not_called()

    def test_read_endpoints_and_original_relationship_ids(self):
        paths = [
            ("/api/customers", "customers:read"),
            ("/api/inventory?low_only=true", "inventory:read"),
            ("/api/sales?start=2026-01-01&end=2026-01-02", "sales:read"),
            (
                "/api/reports?start=2026-01-01&end=2026-01-02&product_id=8",
                "reports:read",
            ),
        ]
        for path, scope in paths:
            self.assertEqual(
                self.client.get(path, headers=self.auth(scope)).status_code, 200
            )
        self.store.reports.assert_called_once_with(
            date(2026, 1, 1), date(2026, 1, 2), 8, None
        )

    def test_sql_errors_do_not_leak_or_fall_back(self):
        self.store.products.side_effect = DatabaseUnavailable("PASSWORD=private")
        response = self.client.get("/api/products", headers=self.auth())
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("PASSWORD", response.text)
        self.assertNotIn("data", response.json())

    def test_no_writes_exist(self):
        for method in ["post", "put", "delete", "patch"]:
            self.assertEqual(
                getattr(self.client, method)(
                    "/api/products", headers=self.auth()
                ).status_code,
                405,
            )
        self.assertFalse(self.store.mock_calls)

    def test_assistant_cannot_escalate_to_inventory(self):
        response = self.client.post(
            "/api/assistant",
            json={"message": "stock"},
            headers=self.auth("assistant:read"),
        )
        self.assertEqual(response.status_code, 403)
        self.store.inventory.assert_not_called()

    def test_assistant_states_unsupported_schema(self):
        response = self.client.post(
            "/api/assistant",
            json={"message": "¿Qué sucursal vende más?"},
            headers=self.auth("assistant:read"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["data"]["modelConnected"])
        self.assertIn("no contiene sucursales", response.json()["data"]["answer"])

    def test_assistant_authorized_inventory_stays_a_verified_read(self):
        self.store.inventory.return_value = [{"Codigo": "DEMO-002", "Existencias": 4}]
        response = self.client.post(
            "/api/assistant",
            json={"message": "stock"},
            headers=self.auth("assistant:read inventory:read"),
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()["data"]
        self.assertFalse(result["modelConnected"])
        self.assertEqual(result["inventory"][0]["Existencias"], 4)
        self.store.inventory.assert_called_once_with("", True, 200, 0)

    def test_assistant_rejects_oversized_body_before_sql(self):
        response = self.client.post(
            "/api/assistant",
            content=b"x" * 8193,
            headers=self.auth("assistant:read inventory:read"),
        )
        self.assertEqual(response.status_code, 413)
        self.store.inventory.assert_not_called()

    def test_source_status_does_not_certify_missing_columns_or_real_constraints(self):
        self.store.schema.return_value = [
            {"TABLE_NAME": "Productos", "COLUMN_NAME": "ProductoID"}
        ]
        response = self.client.get(
            "/api/source/status", headers=self.auth("source:read")
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()["data"]
        self.assertFalse(result["columnContractCompatible"])
        self.assertFalse(result["constraintsVerified"])
        self.assertIn("ClienteID", result["missing"]["Clientes"])

    def test_no_auth_configuration_is_not_an_auth_bypass(self):
        client = TestClient(create_app(AuthSettings(), self.store))
        self.assertEqual(
            client.get("/api/products", headers=self.auth()).status_code, 503
        )
        self.store.products.assert_not_called()

    def test_health_does_not_claim_database_ready(self):
        self.assertEqual(self.client.get("/health").json()["databaseVerified"], False)
        self.assertFalse(self.store.mock_calls)


class QueryTests(unittest.TestCase):
    def test_products_are_parameterized(self):
        store = SqlStore()
        store.read = MagicMock(return_value=[])
        malicious = "'; DROP TABLE dbo.Productos;--"
        store.products(malicious, 2, 50, 0)
        sql, params = store.read.call_args.args
        self.assertNotIn(malicious, sql)
        self.assertEqual(params[:3], (malicious,) * 3)
        self.assertIn("dbo.Categorias", sql)
        self.assertEqual(sql.count("?"), len(params))

    def test_all_read_queries_are_bounded_and_parameterized(self):
        store = SqlStore()
        store.read = MagicMock(return_value=[])
        store.products()
        store.customers()
        store.inventory()
        store.sales(date(2026, 1, 1), date(2026, 1, 2))
        store.reports(date(2026, 1, 1), date(2026, 1, 2))
        for call in store.read.call_args_list:
            sql, params = call.args
            self.assertEqual(sql.count("?"), len(params))
            self.assertNotIn("INSERT", sql)
            self.assertNotIn("UPDATE", sql)
            self.assertNotIn("DELETE", sql)

    def test_reports_reconcile_detail_rows_without_duplicating_header_total(self):
        store = SqlStore()
        store.read = MagicMock(
            return_value=[
                {"VentaID": 1, "Ingresos": Decimal("10.10"), "Unidades": 2},
                {"VentaID": 1, "Ingresos": Decimal("5.05"), "Unidades": 1},
                {"VentaID": 2, "Ingresos": Decimal("8.00"), "Unidades": 4},
            ]
        )
        report = store.reports(date(2026, 1, 1), date(2026, 1, 2))
        self.assertEqual(
            report["metrics"], {"revenue": Decimal("23.15"), "orders": 2, "units": 7}
        )
        self.assertNotIn("SUM(v.Total)", store.read.call_args.args[0])

    def test_resources_close_and_read_transaction_rolls_back(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.description = [("Codigo",)]
        cursor.fetchall.return_value = [("DEMO-001",)]
        store = SqlStore(lambda: connection)
        self.assertEqual(
            store.read("SELECT Codigo FROM dbo.Productos"), [{"Codigo": "DEMO-001"}]
        )
        connection.rollback.assert_called_once()
        connection.close.assert_called_once()
        cursor.close.assert_called_once()
        connection.commit.assert_not_called()

    def test_query_failure_still_closes_everything(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.execute.side_effect = Exception("private connection")
        with self.assertRaises(DatabaseUnavailable):
            SqlStore(lambda: connection).read("SELECT 1")
        connection.rollback.assert_called_once()
        connection.close.assert_called_once()
        cursor.close.assert_called_once()

    def test_end_boundary_and_odbc_delimiters(self):
        lower, upper = boundaries(date(2026, 1, 1), date(2026, 1, 2))
        self.assertEqual(upper.day, 3)
        self.assertEqual(odbc_value("host};bad"), "{host}};bad}")


if __name__ == "__main__":
    unittest.main()
