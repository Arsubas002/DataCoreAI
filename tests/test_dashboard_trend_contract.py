"""Contrato visual de la tendencia: no interpolar picos de ventas inexistentes.

Prueba estática aislada: no requiere SQL Server, Streamlit ni Plotly.
"""
import ast
from pathlib import Path
import unittest


DASHBOARD = Path(__file__).resolve().parents[1] / "views" / "dashboard.py"


class DashboardTrendContractTests(unittest.TestCase):
    def test_daily_trend_uses_linear_segments_and_zero_origin(self):
        source = DASHBOARD.read_text(encoding="utf-8")
        tree = ast.parse(source)
        calls = [
            node for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr in ("update_traces", "update_layout")
        ]
        trace_calls = [node for node in calls if node.func.attr == "update_traces"]
        layout_calls = [node for node in calls if node.func.attr == "update_layout"]
        def kwargs(node):
            return {keyword.arg: keyword.value for keyword in node.keywords}

        self.assertTrue(any(
            isinstance(kwargs(call).get("line"), ast.Call)
            and any(k.arg == "shape" and isinstance(k.value, ast.Constant)
                    and k.value.value == "linear"
                    for k in kwargs(call)["line"].keywords)
            for call in trace_calls
        ), "La tendencia diaria debe conectar observaciones sin suavizado spline.")
        self.assertTrue(any(
            isinstance(kwargs(call).get("yaxis"), ast.Call)
            and any(k.arg == "rangemode" and isinstance(k.value, ast.Constant)
                    and k.value.value == "tozero"
                    for k in kwargs(call)["yaxis"].keywords)
            for call in layout_calls
        ), "El eje Y debe incluir el cero para evitar escalas engañosas.")


if __name__ == "__main__":
    unittest.main()
