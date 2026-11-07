"""Los componentes nuevos muestran solo métricas obtenidas de la fuente."""
import json
from unittest import TestCase
from unittest.mock import patch
from streamlit.testing.v1 import AppTest


class DisenoPremiumTests(TestCase):
    @patch("views.dashboard.resumen_comercial", return_value={
        "ventas": {"NumeroVentas": 0, "TotalVentas": 0}, "tendencia": [], "productos_vendidos": [],
        "inventario": [{"Codigo":"A","Existencias":0,"StockMinimo":5},
                       {"Codigo":"B","Existencias":5,"StockMinimo":5},
                       {"Codigo":"C","Existencias":6,"StockMinimo":5}]})
    def test_distribucion_real_sin_inventar_tendencias(self, consulta):
        app = AppTest.from_string("from views.dashboard import mostrar_dashboard\nmostrar_dashboard()").run()
        self.assertFalse(app.exception)
        self.assertEqual([m.value for m in app.metric], ["S/ 0.00","0","11","2"])
        self.assertTrue(all(not m.delta for m in app.metric))
        grafico = json.loads(app.get("plotly_chart")[0].proto.spec)
        self.assertEqual(grafico["data"][0]["values"], [1,1,1])
        self.assertEqual(grafico["data"][0]["labels"], ["Disponible","Stock bajo","Agotado"])
        consulta.assert_called_once()
