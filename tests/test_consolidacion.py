"""Regresiones de integración entre vistas usando únicamente fuentes simuladas."""
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from streamlit.testing.v1 import AppTest


def fuente():
    return {"ventas": {"NumeroVentas": 2, "TotalVentas": Decimal("0.30")},
            "tendencia": [{"Dia": date(2500, 1, 1), "NumeroVentas": 2, "TotalVentas": Decimal("0.30")}],
            "productos_vendidos": [{"Codigo": codigo, "Nombre": "Mismo nombre", "Unidades": 1,
                                    "Ingresos": Decimal("0.15")} for codigo in ("A", "B")],
            "inventario": []}


class ConsolidacionTests(TestCase):
    @patch("views.dashboard.resumen_comercial", side_effect=lambda *args: fuente())
    def test_graficos_no_funden_codigos_y_admiten_fecha_fuera_de_pandas(self, consulta):
        app = AppTest.from_string("from views.dashboard import mostrar_dashboard\nmostrar_dashboard()").run()
        self.assertFalse(app.exception)
        self.assertEqual(len(app.get("plotly_chart")), 2)
        # La tabla de evidencia conserva dinero exacto y ambas filas.
        self.assertEqual(len(app.dataframe[1].value), 2)
        self.assertEqual(str(app.dataframe[0].value.iloc[0]["TotalVentas"]), "0.30")

    def test_navegar_conserva_reporte_y_no_escribe(self):
        parches = [patch(f"views.{vista}.resumen_comercial", side_effect=lambda *args: fuente())
                   for vista in ("dashboard", "reportes", "asistente")]
        escritores = [patch("views.ventas.registrar_venta"), patch("views.productos.guardar_producto"),
                      patch("views.productos.desactivar_producto")]
        mocks = [p.start() for p in parches + escritores]
        self.addCleanup(patch.stopall)
        app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / "app.py")).run()
        next(b for b in app.sidebar.button if b.label == "Reportes").click().run()
        next(b for b in app.button if b.label == ("Generar reporte" if app.session_state["pantalla_actual"] == "Reportes" else "Consultar asistente")).click().run()
        self.assertEqual(len(app.get("download_button")), 3)
        next(b for b in app.sidebar.button if b.label == "Asistente IA").click().run()
        next(b for b in app.button if b.label == ("Generar reporte" if app.session_state["pantalla_actual"] == "Reportes" else "Consultar asistente")).click().run()
        next(b for b in app.sidebar.button if b.label == "Dashboard").click().run()
        next(b for b in app.sidebar.button if b.label == "Reportes").click().run()
        self.assertFalse(app.exception)
        self.assertEqual(len(app.get("download_button")), 3)
        mocks[1].assert_called_once()
        mocks[2].assert_called_once()
        for escritor in mocks[3:]:
            escritor.assert_not_called()
