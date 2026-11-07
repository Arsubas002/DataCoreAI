"""Checks for the isolated static DataCore AI demo. Run: python -m unittest discover -s pwa/tests -v"""
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class PWASmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
        cls.sw = (ROOT / "sw.js").read_text(encoding="utf-8")

    def test_six_sections(self):
        for section in ("Dashboard", "Productos", "Ventas", "Inventario", "Reportes", "Asistente IA"):
            with self.subTest(section=section):
                self.assertIn(section, self.html)

    def test_manifest(self):
        self.assertEqual(self.manifest["display"], "standalone")
        self.assertEqual(self.manifest["start_url"], "./index.html")
        self.assertTrue(self.manifest["icons"])
        for icon in self.manifest["icons"]:
            self.assertTrue((ROOT / icon["src"]).is_file())

    def test_offline_shell(self):
        for asset in ("./index.html", "./manifest.webmanifest", "./icon.svg"):
            self.assertIn(asset, self.sw)
        self.assertIn("caches.match", self.sw)

    def test_no_secrets_or_external_services(self):
        for token in ("api.groq.com", "SQLEXPRESS", "sk-", "Authorization: Bearer"):
            self.assertNotIn(token, self.html)
        self.assertIn("datos ficticios", self.html.lower())

    def test_advanced_dashboard(self):
        for token in ("function lineChart(", "function donut(", "function dashboard(", "id=\"period\"", "id=\"branch\""):
            self.assertIn(token, self.html)

    def test_demo_export(self):
        self.assertIn("function csv()", self.html)
        self.assertIn("datacore_demo_productos.csv", self.html)

if __name__ == "__main__":
    unittest.main()
