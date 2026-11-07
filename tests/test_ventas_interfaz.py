"""Pruebas de la pantalla con catálogo y registro simulados, sin acceso a SQL."""

from decimal import Decimal
from pathlib import Path
import unittest
from unittest.mock import patch

from streamlit.testing.v1 import AppTest


class PruebasInterfazVentas(unittest.TestCase):
    def setUp(self):
        productos = [{"ProductoID": 1, "Codigo": "P1", "Nombre": "Mouse",
                      "Precio": Decimal("8.50"), "Existencias": 10, "Activo": True}]
        parches = [
            patch("views.dashboard.resumen_comercial", return_value={
                "ventas": {"NumeroVentas": 0, "TotalVentas": 0},
                "tendencia": [], "productos_vendidos": [], "inventario": []}),
            patch("views.ventas.listar_clientes", return_value=[
                {"ClienteID": 1, "Nombre": "Cliente prueba", "Documento": "PRUEBA"}]),
            patch("views.ventas.listar_productos", return_value=productos),
            patch("views.ventas.listar_historial", return_value=[]),
        ]
        for parche in parches:
            parche.start()
            self.addCleanup(parche.stop)
        self.registro = patch("views.ventas.registrar_venta", return_value=25).start()
        self.addCleanup(patch.stopall)
        self.app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / "app.py")).run()
        next(b for b in self.app.sidebar.button if b.label == "Ventas").click().run()

    def pulsar(self, texto):
        next(b for b in self.app.button if b.label == texto).click().run()
        self.assertEqual(len(self.app.exception), 0)

    def test_carrito_agregar_editar_eliminar(self):
        self.pulsar("Agregar al carrito")
        self.assertEqual(self.app.metric[0].value, "S/ 8.50")
        self.app.number_input(key="cantidad_venta_1").set_value(3)
        self.pulsar("Actualizar cantidad")
        self.assertEqual(self.app.metric[0].value, "S/ 25.50")
        self.pulsar("Eliminar producto")
        self.assertEqual(len(self.app.metric), 0)
        self.registro.assert_not_called()

    def test_confirmacion_no_se_repite_al_recargar(self):
        self.pulsar("Agregar al carrito")
        self.pulsar("Confirmar venta")
        self.assertTrue(any("25" in s.value for s in self.app.success))
        self.app.run()
        self.registro.assert_called_once()
        self.assertFalse(any(b.label == "Confirmar venta" for b in self.app.button))

    def test_reintento_conserva_clave_y_contenido(self):
        self.registro.side_effect = [ConnectionError("Respuesta perdida"), 25]
        self.pulsar("Agregar al carrito")
        self.pulsar("Confirmar venta")
        primera = self.registro.call_args
        self.app.run()
        self.pulsar("Reintentar confirmación")
        self.assertEqual(primera, self.registro.call_args)
        self.assertEqual(self.registro.call_count, 2)
        self.assertTrue(any("25" in s.value for s in self.app.success))

    def test_cantidad_superior_al_stock_no_agrega(self):
        self.app.number_input[0].set_value(11)
        self.pulsar("Agregar al carrito")
        self.assertTrue(any("stock" in error.value for error in self.app.error))
        self.assertEqual(len(self.app.metric), 0)
        self.registro.assert_not_called()


if __name__ == "__main__":
    unittest.main()
