"""Recorre las seis pantallas y bloquea escrituras antes de SQL en modo lector."""
from copy import deepcopy
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from streamlit.testing.v1 import AppTest

from database.productos import guardar_producto, desactivar_producto, listar_productos
from database.ventas import registrar_venta
from services.configuracion import ErrorSoloLectura
from datos_simulados import catalogo, resumen, historial

RAIZ = Path(__file__).resolve().parents[1]


def parchear_fuentes(caso):
    fuentes = {
        "views.productos.listar_productos": catalogo(), "views.ventas.listar_productos": catalogo(),
        "views.inventario.listar_productos": catalogo(),
        "views.productos.listar_categorias": [{"CategoriaID": 1, "Nombre": "Accesorios"}],
        "views.ventas.listar_clientes": [{"ClienteID": 1, "Nombre": "Cliente ficticio", "Documento": "FICTICIO"}],
        "views.ventas.listar_historial": historial(),
        "views.dashboard.resumen_comercial": resumen(), "views.reportes.resumen_comercial": resumen(),
        "views.asistente.resumen_comercial": resumen(),
        "views.productos.st_keyup": "",
    }
    for nombre, valor in fuentes.items():
        parche = patch(nombre, side_effect=lambda *args, _valor=valor, **kwargs: deepcopy(_valor))
        parche.start()
        caso.addCleanup(parche.stop)


def pulsar(app, etiqueta):
    next(b for b in app.button if b.label == etiqueta).click().run()


class IntegracionFinalTests(TestCase):
    def setUp(self):
        parchear_fuentes(self)
        for nombre in ("views.productos.guardar_producto", "views.productos.desactivar_producto", "views.ventas.registrar_venta"):
            parche = patch(nombre)
            mock = parche.start()
            self.addCleanup(parche.stop)
            self.addCleanup(mock.assert_not_called)

    def test_seis_rutas_preservan_carrito_reporte_y_respuesta(self):
        with patch.dict("os.environ", {"DATACORE_READ_ONLY": "0", "DATACORE_GROQ_ENABLED": "0"}):
            app = AppTest.from_file(str(RAIZ / "app.py")).run()
            for pantalla in ("Productos", "Inventario", "Ventas"):
                app.sidebar.radio[0].set_value(pantalla).run()
                self.assertFalse(app.exception, pantalla)
            pulsar(app, "Agregar al carrito")
            self.assertEqual(app.metric[0].value, "S/ 8.50")
            app.sidebar.radio[0].set_value("Reportes").run()
            pulsar(app, "Generar reporte")
            for formato in ("CSV", "Excel", "PDF"):
                app.selectbox[0].set_value(formato).run()
                self.assertFalse(app.exception)
                self.assertFalse(app.error)
                self.assertEqual(len(app.get("download_button")), 3)
            app.sidebar.radio[0].set_value("Asistente IA").run()
            pulsar(app, "Consultar asistente")
            self.assertFalse(app.exception)
            self.assertTrue(any("25.50" in m.value for m in app.markdown))
            app.sidebar.radio[0].set_value("Dashboard").run()
            self.assertEqual(app.metric[0].value, "S/ 25.50")
            app.sidebar.radio[0].set_value("Ventas").run()
            self.assertEqual(app.metric[0].value, "S/ 8.50")
            app.sidebar.radio[0].set_value("Reportes").run()
            self.assertEqual(len(app.get("download_button")), 3)
            app.sidebar.radio[0].set_value("Asistente IA").run()
            self.assertTrue(any("25.50" in m.value for m in app.markdown))
            self.assertFalse(app.exception)

    def test_ui_lector_deshabilita_guardar_desactivar_y_confirmar(self):
        with patch.dict("os.environ", {"DATACORE_READ_ONLY": "1", "DATACORE_GROQ_ENABLED": "0"}):
            app = AppTest.from_file(str(RAIZ / "app.py")).run()
            app.sidebar.radio[0].set_value("Productos").run()
            self.assertTrue(next(b for b in app.button if b.label == "Guardar producto").disabled)
            app.selectbox[0].set_value(1).run()
            app.checkbox[1].check().run()
            self.assertTrue(next(b for b in app.button if b.label == "Desactivar").disabled)
            app.sidebar.radio[0].set_value("Ventas").run()
            pulsar(app, "Agregar al carrito")
            self.assertTrue(next(b for b in app.button if b.label == "Confirmar venta").disabled)
            self.assertFalse(app.exception)

    def test_lector_conserva_confirmacion_incierta_sin_reintentar(self):
        with patch.dict("os.environ", {"DATACORE_READ_ONLY": "1"}):
            app = AppTest.from_file(str(RAIZ / "app.py")).run()
            pendiente = {"SolicitudID": "clave-incierta", "ClienteID": 1, "Lineas": []}
            app.session_state["venta_pendiente"] = deepcopy(pendiente)
            app.sidebar.radio[0].set_value("Ventas").run()
            self.assertEqual(app.session_state["venta_pendiente"], pendiente)
            self.assertTrue(any("clave-incierta" in c.value for c in app.code))
            self.assertFalse(any(b.label == "Reintentar confirmación" for b in app.button))
            self.assertFalse(app.exception)


class SoloLecturaDatosTests(TestCase):
    @patch("database.ventas.obtener_conexion")
    @patch("database.productos.obtener_conexion")
    def test_escrituras_bloqueadas_antes_de_conectar(self, productos, ventas):
        with patch.dict("os.environ", {"DATACORE_READ_ONLY": "1"}):
            for operacion in (lambda: guardar_producto("A", "Artículo", 1, "2.50", 1, 5),
                              lambda: desactivar_producto(1, b"version"),
                              lambda: registrar_venta(1, [], "uuid-no-procesado")):
                with self.assertRaises(ErrorSoloLectura):
                    operacion()
        productos.assert_not_called()
        ventas.assert_not_called()

    @patch("database.productos.obtener_conexion")
    def test_lector_permite_select_sin_commit(self, conectar):
        conexion = conectar.return_value
        conexion.cursor.return_value.description = [("Codigo",)]
        conexion.cursor.return_value.fetchall.return_value = [("FICTICIO",)]
        with patch.dict("os.environ", {"DATACORE_READ_ONLY": "1"}):
            self.assertEqual(listar_productos(), [{"Codigo": "FICTICIO"}])
        conexion.commit.assert_not_called()
        conexion.close.assert_called_once()
