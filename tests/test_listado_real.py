"""Pruebas optativas con SELECT reales y renderizado de la pantalla.

Activar con DATACORE_TEST_SQL=1. No ejecutan guardar ni desactivar.
"""

import os
from pathlib import Path
import unittest
from unittest.mock import patch

from database.productos import listar_productos


@unittest.skipUnless(os.getenv("DATACORE_TEST_SQL") == "1", "Requiere SQL Server local")
class PruebasListadoReal(unittest.TestCase):
    def test_busqueda_vacia(self):
        productos = listar_productos("")
        codigos = {p["Codigo"] for p in productos}
        self.assertTrue({f"DEMO-{i:03d}" for i in range(1, 21)} <= codigos)
        self.assertTrue(all(p["Activo"] for p in productos))
        self.assertEqual(codigos, {p["Codigo"] for p in listar_productos("   ")})

    def test_busqueda_nombre_y_limpieza(self):
        todos = listar_productos("")
        encontrados = listar_productos("Mouse")
        self.assertTrue(encontrados)
        self.assertTrue(all("mouse" in (p["Nombre"] + p["Codigo"]).lower()
                            for p in encontrados))
        self.assertEqual({p["ProductoID"] for p in encontrados},
                         {p["ProductoID"] for p in todos
                          if "mouse" in (p["Nombre"] + p["Codigo"]).lower()})
        self.assertEqual(todos, listar_productos(""))

    def test_sin_coincidencias(self):
        self.assertEqual(listar_productos("zz_sin_resultados_datacore_zz"), [])

    def test_pantalla_desde_app_con_sql_real(self):
        from streamlit.testing.v1 import AppTest

        # AppTest no simula teclas de componentes externos. Se sustituye solo
        # su valor; las consultas y el renderizado de la tabla son reales.
        with patch("views.productos.st_keyup", return_value="") as entrada:
            app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / "app.py")).run()
            next(b for b in app.sidebar.button if b.label == "Productos").click().run()
            self.assertEqual(len(app.exception), 0)
            self.assertEqual(len(app.dataframe[0].value), len(listar_productos("")))
            entrada.return_value = "Mouse"
            app.run()
            self.assertEqual(len(app.exception), 0)
            self.assertEqual(len(app.dataframe[0].value), len(listar_productos("Mouse")))
            entrada.return_value = ""
            app.run()
            self.assertEqual(len(app.exception), 0)
            self.assertEqual(len(app.dataframe[0].value), len(listar_productos("")))
            entrada.return_value = "zz_sin_resultados_datacore_zz"
            app.run()
            self.assertEqual(len(app.exception), 0)
            self.assertEqual(len(app.dataframe), 0)
            self.assertTrue(any("No hay productos" in aviso.value for aviso in app.info))


if __name__ == "__main__":
    unittest.main()
