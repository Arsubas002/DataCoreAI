"""Casos límite encontrados en auditoría; solo datos y conexiones ficticios."""
from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from unittest import TestCase
from unittest.mock import patch

from openpyxl import load_workbook
from pypdf import PdfReader
from streamlit.testing.v1 import AppTest
from services.configuracion import solo_lectura
from services.exportaciones import excel_reporte, pdf_reporte
from datos_simulados import catalogo, historial
from services.reportes import csv_reporte
from database.ventas import listar_historial
from database.productos import guardar_producto


class EditorProductosTests(TestCase):
    def setUp(self):
        self.productos = catalogo()
        parches = [patch("views.productos.listar_productos", side_effect=lambda *args: deepcopy(self.productos)),
                   patch("views.productos.listar_categorias", return_value=[{"CategoriaID": 1, "Nombre": "Accesorios"}]),
                   patch("views.productos.st_keyup", return_value="")]
        for parche in parches:
            parche.start()
            self.addCleanup(parche.stop)
        self.app = AppTest.from_string("from views.productos import mostrar_productos\nmostrar_productos()").run()
        self.app.selectbox[0].set_value(1).run()

    def campo(self, etiqueta):
        return next(c for c in self.app.text_input if c.label == etiqueta)

    def test_recargar_descarta_borrador_aunque_sql_no_haya_cambiado(self):
        self.campo("Nombre").set_value("Borrador sin guardar")
        self.campo("Precio (S/)").set_value("19.99")
        next(b for b in self.app.button if b.label == "Recargar versión del producto").click().run()
        self.assertFalse(self.app.exception)
        self.assertEqual(self.campo("Nombre").value, "Mouse de prueba")
        self.assertEqual(self.campo("Precio (S/)").value, "8.50")

    @patch("views.productos.guardar_producto", side_effect=ValueError("El producto cambió"))
    def test_sesion_anterior_conserva_version_hasta_recarga(self, guardar):
        del self.app.session_state["edicion_producto_1"]
        self.app.session_state["version_producto_1"] = b"vieja123"
        self.productos[0]["VersionFila"] = b"nuevaver"
        self.app.run()
        next(b for b in self.app.button if b.label == "Guardar producto").click().run()
        self.assertEqual(guardar.call_args.args[-1], b"vieja123")
        self.assertTrue(self.app.error)

    @patch("views.productos.guardar_producto")
    def test_guardar_nuevo_reinicia_formulario_sin_repetir_envio(self, guardar):
        self.app.selectbox[0].set_value(None).run()
        self.campo("Código").set_value("NUEVO")
        self.campo("Nombre").set_value("Artículo nuevo")
        self.campo("Precio (S/)").set_value("1.50")
        next(b for b in self.app.button if b.label == "Guardar producto").click().run()
        self.assertFalse(self.app.exception)
        self.assertEqual(self.campo("Código").value, "")
        self.app.run()
        guardar.assert_called_once()

    def test_actualizacion_remota_no_sustituye_editor_hasta_recargar(self):
        self.productos[0].update(Nombre="Nombre nuevo", Precio=Decimal("12.00"), VersionFila=b"nuevaver")
        self.app.run()
        self.assertEqual(self.campo("Nombre").value, "Mouse de prueba")
        self.assertEqual(self.app.session_state["version_producto_1"], b"version1")
        next(b for b in self.app.button if b.label == "Recargar versión del producto").click().run()
        self.assertEqual(self.campo("Nombre").value, "Nombre nuevo")
        self.assertEqual(self.app.session_state["version_producto_1"], b"nuevaver")


class LimitesV1Tests(TestCase):
    def test_configuracion_lectora_no_habilita_escritura_por_valor_inesperado(self):
        for valor in ("1", " 1 ", "true", "error", ""):
            with self.subTest(valor=valor), patch.dict("os.environ", {"DATACORE_READ_ONLY": valor}):
                self.assertTrue(solo_lectura())
        with patch.dict("os.environ", {"DATACORE_READ_ONLY": "0"}):
            self.assertFalse(solo_lectura())

    def test_pdf_divide_una_fila_de_producto_con_muchas_lineas(self):
        filas = [{"Codigo": "P001", "Nombre": "x\n" * 70 + "FINAL", "Unidades": 1, "Ingresos": Decimal("8.50")}]
        contenido = pdf_reporte(filas, "productos_vendidos", date.today(), date.today(), datetime.now())
        lector = PdfReader(BytesIO(contenido))
        self.assertGreater(len(lector.pages), 1)
        texto = "".join(p.extract_text() for p in lector.pages)
        self.assertIn("FINAL", texto)
        self.assertEqual(texto.count("x"), 70)

    def test_excel_fecha_anterior_a_1900_se_conserva_como_iso(self):
        filas = [{"Dia": date(1, 1, 1), "NumeroVentas": 1, "TotalVentas": Decimal("8.50")}]
        libro = load_workbook(BytesIO(excel_reporte(filas, "tendencia", date(1, 1, 1), date.today(), datetime.now())))
        self.assertEqual(libro["Datos"]["A2"].value, "0001-01-01")
        self.assertEqual(libro["Datos"]["A2"].data_type, "s")
        libro.close()

    def test_exportacion_rechaza_importes_no_finitos(self):
        for funcion in (csv_reporte, excel_reporte, pdf_reporte):
            for importe in (Decimal("NaN"), Decimal("Infinity"), float("nan")):
                filas = [{"Dia": date.today(), "NumeroVentas": 1, "TotalVentas": importe}]
                with self.subTest(formato=funcion.__name__, importe=str(importe)), self.assertRaises(ValueError):
                    funcion(filas, "tendencia", date.today(), date.today(), datetime.now())


class PaginacionYValidacionTests(TestCase):
    @patch("views.ventas.registrar_venta")
    @patch("views.ventas.listar_productos", side_effect=lambda: catalogo())
    @patch("views.ventas.listar_clientes", return_value=[{"ClienteID": 1, "Nombre": "Ficticio", "Documento": "FICTICIO"}])
    @patch("views.ventas.listar_historial", side_effect=lambda limite, desplazamiento: historial() if desplazamiento == 0 else [])
    def test_cambiar_pagina_del_historial_conserva_carrito(self, consultar, clientes, productos, registrar):
        app = AppTest.from_string("from views.ventas import mostrar_ventas\nmostrar_ventas()").run()
        next(b for b in app.button if b.label == "Agregar al carrito").click().run()
        app.number_input(key="pagina_historial").set_value(2).run()
        consultar.assert_called_with(limite=100, desplazamiento=100)
        self.assertEqual(app.metric[0].value, "S/ 8.50")
        self.assertTrue(any("No hay ventas en esta página" in i.value for i in app.info))
        self.assertFalse(app.exception)
        registrar.assert_not_called()

    @patch("database.ventas.consultar", return_value=[])
    def test_historial_pagina_cabeceras_antes_de_detalles(self, consultar):
        self.assertEqual(listar_historial(limite=100, desplazamiento=200), [])
        sql, parametros = consultar.call_args.args
        self.assertEqual(parametros, (200, 100))
        self.assertLess(sql.index("OFFSET ?"), sql.index("JOIN dbo.DetalleVentas"))
        self.assertIn("Fecha DESC, VentaID DESC", sql)
        self.assertIn("d.DetalleVentaID", sql)

    @patch("database.ventas.consultar")
    def test_paginacion_invalida_no_consulta(self, consultar):
        for limite, desplazamiento in ((True, 0), (0, 0), (501, 0), (100, -1), (100, True), (100, 2147483648)):
            with self.subTest(limite=limite, desplazamiento=desplazamiento), self.assertRaises(ValueError):
                listar_historial(limite, desplazamiento)
        consultar.assert_not_called()

    @patch("database.ventas.obtener_conexion")
    def test_ids_fuera_de_int_sql_no_abren_conexion(self, conectar):
        from database.ventas import registrar_venta
        from uuid import uuid4
        with self.assertRaises(ValueError):
            registrar_venta(2147483648, [], str(uuid4()))
        with self.assertRaises(ValueError):
            registrar_venta(1, [{"ProductoID": 2147483648, "Cantidad": 1, "Precio": "1.00"}], str(uuid4()))
        conectar.assert_not_called()

    @patch("database.productos.obtener_conexion")
    def test_campos_de_producto_invalidos_se_rechazan_antes_de_sql(self, conectar):
        for codigo, nombre, categoria in ((None, "Artículo", 1), ("A", None, 1), ("A", "Artículo", 2147483648)):
            with self.subTest(codigo=codigo, nombre=nombre, categoria=categoria), self.assertRaises(ValueError):
                guardar_producto(codigo, nombre, categoria, "1.00", 0, 5)
        conectar.assert_not_called()

    def test_csv_limites_sin_truncamiento(self):
        with patch("services.reportes.MAX_FILAS_CSV", 0), self.assertRaises(ValueError):
            csv_reporte([{}], "tendencia", date.today(), date.today(), datetime.now())
        with patch("services.reportes.MAX_BYTES", 1), self.assertRaises(ValueError):
            csv_reporte([], "tendencia", date.today(), date.today(), datetime.now())


class ConexionTimeoutTests(TestCase):
    @patch("pyodbc.connect")
    @patch("pyodbc.drivers", return_value=["ODBC Driver 18 for SQL Server"])
    def test_timeout_de_consultas_se_configura_sin_abrir_sql_real(self, drivers, conectar):
        from database.connection import obtener_conexion
        conexion = obtener_conexion("DataCoreAI")
        self.assertEqual(conexion.timeout, 15)
        self.assertEqual(conectar.call_args.kwargs["timeout"], 5)
        conexion.close.assert_not_called()

    @patch("pyodbc.connect")
    @patch("pyodbc.drivers", return_value=["ODBC Driver 18 for SQL Server"])
    def test_cierra_si_no_puede_configurar_timeout(self, drivers, conectar):
        from database.connection import obtener_conexion
        from unittest.mock import Mock, PropertyMock
        conexion = Mock()
        type(conexion).timeout = PropertyMock(side_effect=RuntimeError("No disponible"))
        conectar.return_value = conexion
        with self.assertRaises(RuntimeError):
            obtener_conexion("DataCoreAI")
        conexion.close.assert_called_once()
