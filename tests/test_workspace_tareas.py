"""Interacciones nuevas: series, filtros y consultas sin escrituras reales."""

from copy import deepcopy
from unittest import TestCase
from unittest.mock import patch
from streamlit.testing.v1 import AppTest
from datos_simulados import catalogo, resumen
from services.asistente import PREGUNTAS


class WorkspaceTareasTests(TestCase):
    @patch("views.dashboard.resumen_comercial", side_effect=lambda *args: resumen())
    def test_cambiar_serie_no_cambia_el_indicador_de_ingresos(self, consulta):
        app = AppTest.from_string(
            "from views.dashboard import mostrar_dashboard\nmostrar_dashboard()"
        ).run()
        app.button_group(key="dashboard_serie").set_value("Ventas").run()
        self.assertFalse(app.exception)
        self.assertEqual(app.metric[0].value, "S/ 25.50")
        self.assertEqual(app.metric[1].value, "2")
        import json

        figura = json.loads(app.get("plotly_chart")[0].proto.spec)
        self.assertEqual(figura["layout"]["yaxis"]["title"]["text"], "Ventas")
        self.assertTrue(all(not m.delta for m in app.metric))

    @patch("views.productos.guardar_producto")
    @patch("views.productos.st_keyup", return_value="")
    def test_categoria_filtra_catalogo_sin_guardar(self, entrada, guardar):
        productos = catalogo()
        productos[1].update(Categoria="Hardware", CategoriaID=2)
        with (
            patch(
                "views.productos.listar_productos",
                side_effect=lambda *args: deepcopy(productos),
            ),
            patch(
                "views.productos.listar_categorias",
                return_value=[
                    {"CategoriaID": 1, "Nombre": "Accesorios"},
                    {"CategoriaID": 2, "Nombre": "Hardware"},
                ],
            ),
        ):
            app = AppTest.from_string(
                "from views.productos import mostrar_productos\nmostrar_productos()"
            ).run()
            app.multiselect(key="categorias_catalogo").set_value(["Hardware"]).run()
        self.assertFalse(app.exception)
        self.assertEqual(list(app.dataframe[0].value["Código"]), ["DEMO-B"])
        guardar.assert_not_called()

    @patch(
        "views.inventario.listar_productos",
        side_effect=lambda *args: [
            *catalogo(),
            {
                **catalogo()[0],
                "ProductoID": 3,
                "Codigo": "DEMO-C",
                "Nombre": "Stock al mínimo",
                "Existencias": 5,
            },
        ],
    )
    def test_monitor_inventario_distingue_alertas_y_agotados(self, consulta):
        app = AppTest.from_string(
            "from views.inventario import mostrar_inventario\nmostrar_inventario()"
        ).run()
        app.button_group(key="estado_inventario").set_value("Con alerta").run()
        self.assertEqual(list(app.dataframe[0].value["Código"]), ["DEMO-B", "DEMO-C"])
        app.button_group(key="estado_inventario").set_value("Agotados").run()
        self.assertFalse(app.exception)
        self.assertEqual(list(app.dataframe[0].value["Disponibles"]), [0])
        app.button_group(key="estado_inventario").set_value("Todos").run()
        self.assertEqual(len(app.dataframe[0].value), 3)

    @patch(
        "views.asistente.resumen_comercial",
        return_value={
            "ventas": {"NumeroVentas": 0, "TotalVentas": 0},
            "tendencia": [],
            "productos_vendidos": [],
            "inventario": [],
        },
    )
    def test_preguntas_guiadas_conservan_vacio_y_envio_explicito(self, consulta):
        app = AppTest.from_string(
            "from views.asistente import mostrar_asistente\nmostrar_asistente()"
        ).run()
        consulta.assert_not_called()
        app.radio(key="pregunta_comercial").set_value(PREGUNTAS[1])
        next(b for b in app.button if b.label == "Consultar asistente").click().run()
        self.assertFalse(app.exception)
        self.assertTrue(any("no está definido" in e.value for e in app.markdown))
        consulta.assert_called_once()
