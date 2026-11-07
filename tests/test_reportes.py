"""Regresiones de exportación e interfaz sin SQL real."""
import csv
from datetime import date, datetime
from decimal import Decimal
from io import StringIO
from unittest import TestCase
from unittest.mock import patch

from streamlit.testing.v1 import AppTest
from database.dashboard import resumen_comercial
from services.reportes import csv_reporte


DATOS = {"ventas": {"NumeroVentas": 1, "TotalVentas": Decimal("0.30")},
         "tendencia": [{"Dia": date(2026, 1, 1), "NumeroVentas": 1, "TotalVentas": Decimal("0.30")}],
         "productos_vendidos": [], "inventario": []}


class ReportesTests(TestCase):
    def test_csv_conserva_precision_y_neutraliza_formulas(self):
        filas = [{"Codigo": "001", "Nombre": nombre, "Unidades": 2, "Ingresos": Decimal("0.30")}
                 for nombre in ("Árbol, Perú", "=1+1", "  @SUM(1)", "\ttexto", "a\nb", "\ufeff=SUM(A1)", "\x01+2")]
        contenido = csv_reporte(filas, "productos_vendidos", date(2026, 1, 1), date(2026, 1, 31), datetime(2026, 2, 1))
        filas_csv = list(csv.reader(StringIO(contenido.decode("utf-8-sig"))))
        self.assertEqual(filas_csv[6], ["001", "Árbol, Perú", "2", "0.30"])
        for fila in filas_csv[7:]:
            self.assertTrue(fila[1].startswith("'"))
        self.assertEqual(filas_csv[3][-1], "7")

    def test_csv_vacio_tiene_encabezados(self):
        contenido = csv_reporte([], "tendencia", date.today(), date.today(), datetime.now())
        self.assertIn("Dia,NumeroVentas,TotalVentas", contenido.decode("utf-8-sig"))

    @patch("database.dashboard.consultar")
    def test_limite_fecha_y_tipos_se_rechazan_antes_de_sql(self, consultar):
        for inicio, fin in ((date.today(), date.max), (datetime.now(), date.today()), (None, date.today())):
            with self.assertRaises(ValueError):
                resumen_comercial(inicio, fin)
        consultar.assert_not_called()

    @patch("database.dashboard.consultar", side_effect=[[DATOS["ventas"]], [], [], []])
    def test_intervalo_incluye_ultimo_dia(self, consultar):
        resumen_comercial(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(consultar.call_args_list[0].args[1], (datetime(2026, 1, 1), datetime(2026, 2, 1)))

    @patch("views.reportes.resumen_comercial", return_value=DATOS)
    def test_reporte_solo_consulta_al_generar_y_descarta_resultado_tras_error(self, consulta):
        app = AppTest.from_string("from views.reportes import mostrar_reportes\nmostrar_reportes()").run()
        consulta.assert_not_called()
        app.button[0].click().run()
        self.assertFalse(app.exception)
        self.assertEqual(len(app.get("download_button")), 3)
        app.run()
        consulta.assert_called_once()
        consulta.side_effect = RuntimeError("detalle privado")
        app.button[0].click().run()
        self.assertFalse(app.exception)
        self.assertTrue(app.error)
        self.assertEqual(len(app.get("download_button")), 0)
        self.assertNotIn("detalle privado", app.error[0].value)

    @patch("views.dashboard.resumen_comercial", return_value=DATOS)
    def test_dashboard_con_datos_y_sin_datos(self, consulta):
        app = AppTest.from_string("from views.dashboard import mostrar_dashboard\nmostrar_dashboard()").run()
        self.assertFalse(app.exception)
        self.assertEqual(app.metric[0].value, "S/ 0.30")
        consulta.return_value = {**DATOS, "ventas": {"NumeroVentas": 0, "TotalVentas": 0}, "tendencia": []}
        app.run()
        self.assertEqual(app.metric[0].value, "S/ 0.00")
        self.assertTrue(app.info)
        consulta.side_effect = RuntimeError("secreto")
        app.run()
        self.assertTrue(app.error)
        self.assertEqual(len(app.metric), 0)
