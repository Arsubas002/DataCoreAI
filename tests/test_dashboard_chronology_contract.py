"""Contrato de orden cronológico del gráfico diario (sin conexión SQL)."""
import ast
from pathlib import Path
import unittest


DASHBOARD = Path(__file__).resolve().parents[1] / "views" / "dashboard.py"


class DashboardChronologyTests(unittest.TestCase):
    def test_chart_sorts_dates_before_rendering(self):
        tree = ast.parse(DASHBOARD.read_text(encoding="utf-8"))
        assignments = [
            node for node in ast.walk(tree)
            if isinstance(node, ast.Assign)
            and any(isinstance(target, ast.Name) and target.id == "grafico"
                    for target in node.targets)
        ]
        self.assertEqual(len(assignments), 1)
        expression = assignments[0].value
        self.assertIsInstance(expression, ast.Call)
        self.assertIsInstance(expression.func, ast.Attribute)
        self.assertEqual(expression.func.attr, "assign")
        sorted_source = expression.func.value
        self.assertIsInstance(sorted_source, ast.Call)
        self.assertIsInstance(sorted_source.func, ast.Attribute)
        self.assertEqual(sorted_source.func.attr, "sort_values")
        self.assertEqual(ast.unparse(sorted_source.func.value), "tabla")
        self.assertEqual(ast.literal_eval(sorted_source.args[0]), "Dia")


if __name__ == "__main__":
    unittest.main()
