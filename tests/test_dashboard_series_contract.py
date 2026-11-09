"""Regresión estática del selector de serie del dashboard, sin SQL ni Streamlit."""
import ast
from pathlib import Path
import unittest


DASHBOARD = Path(__file__).resolve().parents[1] / "views" / "dashboard.py"


class DashboardSeriesContractTests(unittest.TestCase):
    def test_selected_series_controls_chart_column_and_detail_label(self):
        tree = ast.parse(DASHBOARD.read_text(encoding="utf-8"))
        assignments = [node for node in ast.walk(tree)
                       if isinstance(node, ast.Assign)]
        column = next((node.value for node in assignments
                       if any(isinstance(target, ast.Name) and target.id == "columna"
                              for target in node.targets)), None)
        self.assertIsInstance(column, ast.IfExp)
        self.assertEqual(ast.unparse(column.test), "serie == 'Ingresos'")
        self.assertEqual(ast.literal_eval(column.body), "TotalVentas")
        self.assertEqual(ast.literal_eval(column.orelse), "NumeroVentas")

        chart_calls = [node for node in ast.walk(tree)
                       if isinstance(node, ast.Call)
                       and isinstance(node.func, ast.Attribute)
                       and node.func.attr == "area"]
        self.assertTrue(any(any(k.arg == "y" and isinstance(k.value, ast.Name)
                                and k.value.id == "columna" for k in call.keywords)
                            for call in chart_calls),
                        "El gráfico debe utilizar la columna seleccionada.")

        expanders = [node for node in ast.walk(tree)
                     if isinstance(node, ast.Call)
                     and isinstance(node.func, ast.Attribute)
                     and node.func.attr == "expander"]
        self.assertTrue(any(call.args and "serie.lower()" in ast.unparse(call.args[0])
                            for call in expanders),
                        "La etiqueta de detalle debe reflejar la serie seleccionada.")


if __name__ == "__main__":
    unittest.main()
