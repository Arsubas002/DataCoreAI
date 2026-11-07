"""Reabre Excel/PDF y comprueba contenido y paginación con datos sintéticos."""
from copy import deepcopy
from datetime import date, datetime, timezone
from decimal import Decimal
from io import BytesIO
from unittest import TestCase
from unittest.mock import patch

from openpyxl import load_workbook
from pypdf import PdfReader
from streamlit.testing.v1 import AppTest
from services.exportaciones import excel_reporte, pdf_reporte

INICIO, FIN = date(2026, 1, 1), date(2026, 1, 31)
GENERADO = datetime(2026, 2, 1, tzinfo=timezone.utc)


def productos():
    return [{"Codigo": "001", "Nombre": nombre, "Unidades": 2, "Ingresos": Decimal("0.30")}
            for nombre in ("Árbol de Perú", "=1+1", "+2", "-3", "@SUM(A1)", "https://example.com", "<b>Texto</b>")]


class ExportacionesTests(TestCase):
    def test_excel_tipos_precision_texto_sin_formulas_ni_enlaces(self):
        filas = productos()
        copia = deepcopy(filas)
        contenido = excel_reporte(filas, "productos_vendidos", INICIO, FIN, GENERADO)
        libro = load_workbook(BytesIO(contenido), data_only=False)
        hoja = libro["Datos"]
        self.assertEqual(hoja["A2"].value, "001")
        self.assertEqual(hoja["A2"].data_type, "s")
        self.assertEqual(hoja["D2"].data_type, "n")
        self.assertEqual(Decimal(str(hoja["D2"].value)), Decimal("0.30"))
        self.assertEqual(hoja["D2"].number_format, "#,##0.00")
        self.assertEqual(hoja.freeze_panes, "A2")
        self.assertEqual(hoja.auto_filter.ref, "A1:D8")
        for fila in hoja.iter_rows(min_row=2):
            self.assertEqual(fila[1].data_type, "s")
            self.assertIsNone(fila[1].hyperlink)
        self.assertEqual([fila[1].value for fila in hoja.iter_rows(min_row=2)], [p["Nombre"] for p in filas])
        self.assertEqual(libro["Información"]["B4"].value, "2026-01-01")
        libro.close()
        self.assertEqual(filas, copia)

    def test_excel_fecha_numeros_y_vacio(self):
        fila = {"Dia": INICIO, "NumeroVentas": 0, "TotalVentas": Decimal("0.00")}
        libro = load_workbook(BytesIO(excel_reporte([fila], "tendencia", INICIO, FIN, GENERADO)))
        self.assertEqual(libro["Datos"]["A2"].value.date(), INICIO)
        self.assertEqual(libro["Datos"]["C2"].value, 0)
        libro.close()
        libro = load_workbook(BytesIO(excel_reporte([], "inventario", INICIO, FIN, GENERADO)))
        self.assertEqual(libro["Datos"].max_row, 1)
        libro.close()

    def test_pdf_acentos_importes_escape_y_metadatos(self):
        lector = PdfReader(BytesIO(pdf_reporte(productos(), "productos_vendidos", INICIO, FIN, GENERADO)))
        texto = "\n".join(p.extract_text() for p in lector.pages)
        for esperado in ("Árbol de Perú", "0.30", "2026-01-01", "2026-01-31", "Filas: 7", "PEN (S/)", "Página 1", "<b>Texto</b>"):
            self.assertIn(esperado, texto)
        for pagina in lector.pages:
            self.assertNotIn("/Annots", pagina)  # Ni URLs ni marcado activan enlaces.

    def test_pdf_paginado_repite_encabezados_y_conserva_ultima_fila(self):
        filas = [{"Codigo": f"P{i:03}", "Nombre": "Artículo con descripción " * 5,
                  "Existencias": i, "StockMinimo": 5, "Estado": "Normal"} for i in range(100)]
        lector = PdfReader(BytesIO(pdf_reporte(filas, "inventario", INICIO, FIN, GENERADO)))
        self.assertGreater(len(lector.pages), 2)
        for numero, pagina in enumerate(lector.pages, 1):
            texto = pagina.extract_text()
            self.assertIn("Codigo", texto)
            self.assertIn("StockMinimo", texto)
            self.assertIn(f"Página {numero}", texto)
        self.assertIn("P099", lector.pages[-1].extract_text())

    def test_pdf_vacio(self):
        lector = PdfReader(BytesIO(pdf_reporte([], "tendencia", INICIO, FIN, GENERADO)))
        self.assertIn("Sin resultados", lector.pages[0].extract_text())

    def test_limites_no_truncan_silenciosamente(self):
        for funcion, limite in ((excel_reporte, 5000), (pdf_reporte, 2000)):
            with self.assertRaises(ValueError):
                funcion([{}] * (limite + 1), "inventario", INICIO, FIN, GENERADO)
            with self.assertRaises(ValueError):
                funcion([], "sql_libre", INICIO, FIN, GENERADO)
        fila = {"Dia": INICIO, "NumeroVentas": 1, "TotalVentas": Decimal("1000000000000.01")}
        with self.assertRaises(ValueError):
            excel_reporte([fila], "tendencia", INICIO, FIN, GENERADO)
        with patch("services.exportaciones.MAX_BYTES", 1), self.assertRaises(ValueError):
            pdf_reporte([], "tendencia", INICIO, FIN, GENERADO)

    @patch("views.reportes.resumen_comercial", return_value={"ventas": {}, "tendencia": [], "productos_vendidos": productos(), "inventario": []})
    def test_cambiar_formato_no_reconsulta_y_prepara_tres_descargas(self, consulta):
        app = AppTest.from_string("from views.reportes import mostrar_reportes\nmostrar_reportes()").run()
        app.button[0].click().run()
        for formato in ("Excel", "PDF", "CSV"):
            app.selectbox[0].set_value(formato).run()
            self.assertFalse(app.exception)
            self.assertFalse(app.error)
            self.assertEqual(len(app.get("download_button")), 3)
        consulta.assert_called_once()
