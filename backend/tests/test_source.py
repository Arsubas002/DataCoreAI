from pathlib import Path
import unittest
from unittest.mock import patch, MagicMock
import json
from scripts.sql_original import recover, public_fixture, render, ROOT
from backend.sql_store import open_original_database, DatabaseUnavailable


class SourceTests(unittest.TestCase):
    def test_original_sql_files_and_relations_are_unchanged(self):
        import hashlib, re

        expected = {
            "01_crear_base_y_tablas.sql": "0c8bf9fc3378e47e1bfe511acf69cc1d76ff56d6e2e831fec746d335a18ab135",
            "02_datos_prueba.sql": "0f2ea3641f406bbaf74ca92271fc8f7b01baec52f291cea2dc522f15711bcbe0",
            "03_solicitudes_ventas.sql": "c7f8edc8926bace5c193bf9fcac8326fbe499975a773f331fd9e7df31276ab93",
        }
        schema = ""
        for name, digest in expected.items():
            raw = (ROOT / "sql" / name).read_bytes().replace(b"\r\n", b"\n")
            self.assertEqual(hashlib.sha256(raw).hexdigest(), digest)
            if name != "02_datos_prueba.sql":
                schema += "\n" + raw.decode("utf-8")
        tables = re.findall(r"CREATE TABLE dbo\.(\w+)", schema)
        self.assertEqual(
            set(tables),
            {
                "Categorias",
                "Productos",
                "Clientes",
                "Ventas",
                "DetalleVentas",
                "VentasSolicitudes",
            },
        )
        targets = re.findall(r"REFERENCES dbo\.(\w+)\((\w+)\)", schema)
        self.assertCountEqual(
            targets,
            [
                ("Categorias", "CategoriaID"),
                ("Clientes", "ClienteID"),
                ("Ventas", "VentaID"),
                ("Productos", "ProductoID"),
                ("Ventas", "VentaID"),
            ],
        )
        self.assertEqual(schema.count("PRIMARY KEY"), 6)
        self.assertIn("Subtotal = Cantidad * PrecioUnitario", schema)

    def test_original_fixtures_and_generated_source_are_exact(self):
        source = recover()
        self.assertEqual(len(source["products"]), 20)
        self.assertEqual(len(source["customers"]), 10)
        self.assertEqual(sum(p["stock"] for p in source["products"]), 336)
        self.assertEqual((ROOT / "pwa/js/sql-fixtures.js").read_text(), render(source))
        public = public_fixture(source)
        self.assertFalse(public["provenance"]["connected"])
        self.assertFalse(public["provenance"]["numericPrimaryKeysRecovered"])
        self.assertTrue(
            all("email" not in c and "phone" not in c for c in public["customers"])
        )

    def test_driver_missing_does_not_attempt_connection(self):
        driver = MagicMock()
        driver.drivers.return_value = []
        with patch.dict("sys.modules", {"pyodbc": driver}):
            with self.assertRaises(DatabaseUnavailable):
                open_original_database()
        driver.connect.assert_not_called()

    def test_driver_configuration_is_original_read_only_and_tls_verified(self):
        driver = MagicMock()
        driver.drivers.return_value = ["ODBC Driver 18 for SQL Server"]
        driver.SQL_ATTR_ACCESS_MODE = 101
        driver.SQL_MODE_READ_ONLY = 1
        with patch.dict("sys.modules", {"pyodbc": driver}), patch.dict(
            "os.environ", {"DATACORE_SQL_SERVER": r"localhost\SQLEXPRESS"}
        ):
            connection = open_original_database()
        args, kwargs = driver.connect.call_args
        self.assertIn("DATABASE={DataCoreAI}", args[0])
        self.assertIn("Trusted_Connection=yes", args[0])
        self.assertIn("TrustServerCertificate=no", args[0])
        self.assertFalse(kwargs["autocommit"])
        self.assertEqual(kwargs["timeout"], 5)
        self.assertEqual(kwargs["attrs_before"], {101: 1})
        self.assertEqual(connection.timeout, 10)

    def test_original_institutional_palette_matches_the_documented_identity(self):
        import re

        css = (ROOT / "pwa/styles.css").read_text().lower()
        identity = (ROOT / "docs/WORKSPACE_PETROLEO.md").read_text().lower()
        expected = {
            "petroleum": "#0d1726",
            "white": "#f2f5fa",
            "violet": "#7659e8",
            "turquoise": "#24c9c0",
        }
        for name, color in expected.items():
            self.assertIn(color, identity)
            self.assertRegex(css, r"--brand-" + name + r"\s*:\s*" + color)
        self.assertNotIn("#d1ed89", css)
        self.assertNotIn("#f3f0e8", css)


if __name__ == "__main__":
    unittest.main()
