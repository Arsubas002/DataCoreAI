"""Asistente determinista con fuentes simuladas y sin consultas automáticas."""
from decimal import Decimal
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from streamlit.testing.v1 import AppTest
from services.asistente import PREGUNTAS, responder


def datos():
    return {"ventas": {"NumeroVentas": 2, "TotalVentas": Decimal("0.21")},
            "productos_vendidos": [], "tendencia": [],
            "inventario": [{"Codigo": "A", "Existencias": 0, "StockMinimo": 0},
                           {"Codigo": "B", "Existencias": 5, "StockMinimo": 5},
                           {"Codigo": "C", "Existencias": 6, "StockMinimo": 5}]}


class AsistenteTests(TestCase):
    def test_ticket_decimal_half_up(self):
        texto, filas = responder(PREGUNTAS[1], datos())
        self.assertIn("S/ 0.11", texto)
        self.assertFalse(filas)

    def test_sin_ventas_no_inventa_promedio(self):
        fuente = datos()
        fuente["ventas"] = {"NumeroVentas": 0, "TotalVentas": 0}
        self.assertIn("no está definido", responder(PREGUNTAS[1], fuente)[0])
        self.assertIn("S/ 0.00", responder(PREGUNTAS[0], fuente)[0])
        self.assertIn("No hay", responder(PREGUNTAS[2], fuente)[0])

    def test_alertas_incluyen_igualdad_y_cero_sin_mutar_fuente(self):
        fuente = datos()
        texto, filas = responder(PREGUNTAS[3], fuente)
        self.assertEqual([p["Codigo"] for p in filas], ["A", "B"])
        self.assertEqual(len(fuente["inventario"]), 3)
        self.assertIn("actuales", texto)

    def test_no_admite_instrucciones_ni_sql(self):
        with self.assertRaises(ValueError):
            responder("DELETE FROM dbo.Ventas", datos())

    @patch("views.asistente.resumen_comercial", return_value=datos())
    def test_interfaz_consulta_explicita_y_error_sin_detalles(self, consulta):
        app = AppTest.from_string("from views.asistente import mostrar_asistente\nmostrar_asistente()").run()
        consulta.assert_not_called()
        self.assertIn("No hay un modelo", app.info[0].value)
        app.button[0].click().run()
        self.assertFalse(app.exception)
        self.assertTrue(any("S/ 0.21" in elemento.value for elemento in app.markdown))
        app.run()
        consulta.assert_called_once()
        consulta.side_effect = RuntimeError("credencial privada")
        app.button[0].click().run()
        self.assertTrue(app.error)
        self.assertNotIn("credencial", app.error[0].value)
        self.assertFalse(app.subheader)

    @patch("views.asistente.resumen_comercial", return_value=datos())
    @patch("views.dashboard.resumen_comercial", return_value=datos())
    def test_navegacion_desde_app(self, dashboard, asistente):
        app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / "app.py")).run()
        next(b for b in app.sidebar.button if b.label == "Asistente IA").click().run()
        self.assertFalse(app.exception)
        asistente.assert_not_called()
        next(b for b in app.button if b.label == "Consultar asistente").click().run()
        self.assertFalse(app.exception)
        asistente.assert_called_once()
