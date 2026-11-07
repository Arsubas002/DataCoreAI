"""Pruebas aisladas de consultas del dashboard (sin SQL real)."""
from datetime import date
from unittest import TestCase
from unittest.mock import patch

from database.dashboard import resumen_comercial


class DashboardTests(TestCase):
    @patch("database.dashboard.consultar")
    def test_consultas_son_lectura_y_parametrizadas(self, consultar):
        consultar.side_effect = [
            [{"NumeroVentas": 2, "TotalVentas": 45}],
            [], [], []
        ]
        resultado = resumen_comercial(date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(resultado["ventas"]["NumeroVentas"], 2)
        self.assertEqual(consultar.call_count, 4)
        for llamada in consultar.call_args_list[:3]:
            sql, parametros = llamada.args
            self.assertTrue(sql.lstrip().upper().startswith("SELECT"))
            self.assertEqual(sql.count("?"), 2)
            self.assertEqual(len(parametros), 2)
        self.assertEqual(consultar.call_args_list[3].args[0].lstrip()[:6], "SELECT")

    @patch("database.dashboard.consultar")
    def test_fechas_invertidas_no_consultan(self, consultar):
        with self.assertRaises(ValueError):
            resumen_comercial(date(2026, 2, 1), date(2026, 1, 1))
        consultar.assert_not_called()
