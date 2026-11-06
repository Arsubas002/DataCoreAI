"""Pruebas aisladas: conexiones simuladas, sin acceso a SQL Server."""

import unittest
from decimal import Decimal
from unittest.mock import MagicMock, patch

from database.productos import (
    desactivar_producto, guardar_producto, listar_productos, validar_producto,
)


class PruebasProductos(unittest.TestCase):
    def test_normaliza_y_conserva_decimal(self):
        valores = validar_producto(" abc ", " Mouse ", 1, "12.50", 0, 5)
        self.assertEqual(valores, ("ABC", "Mouse", 1, Decimal("12.50"), 0, 5))

    def test_rechaza_campos_invalidos(self):
        casos = [
            ("", "Mouse", 1, "1", 1, 5),
            ("A", "  ", 1, "1", 1, 5),
            ("A", "Mouse", 1, "-1", 1, 5),
            ("A", "Mouse", 1, "NaN", 1, 5),
            ("A", "Mouse", 1, "Infinity", 1, 5),
            ("A", "Mouse", 1, "1.001", 1, 5),
            ("A", "Mouse", 1, "10000000000", 1, 5),
            ("A", "Mouse", 1, "1", -1, 5),
            ("A", "Mouse", 1, "1", 1, -5),
            ("A", "Mouse", 1, "1", 1.5, 5),
            ("A", "Mouse", 0, "1", 1, 5),
            ("A" * 31, "Mouse", 1, "1", 1, 5),
            ("A", "M" * 151, 1, "1", 1, 5),
        ]
        with patch("database.productos.obtener_conexion") as conectar:
            for caso in casos:
                with self.subTest(caso=caso), self.assertRaises(ValueError):
                    guardar_producto(*caso)
            conectar.assert_not_called()

    @patch("database.productos.obtener_conexion")
    def test_duplicado_no_escribe(self, conectar):
        conexion = conectar.return_value
        cursor = conexion.cursor.return_value
        cursor.fetchone.return_value = (1,)
        with self.assertRaisesRegex(ValueError, "código"):
            guardar_producto("A", "Mouse", 1, "10", 2, 5)
        self.assertEqual(cursor.execute.call_count, 1)
        conexion.commit.assert_not_called()
        conexion.rollback.assert_called_once()
        conexion.close.assert_called_once()

    @patch("database.productos.obtener_conexion")
    def test_edicion_concurrente_no_confirma(self, conectar):
        conexion = conectar.return_value
        cursor = conexion.cursor.return_value
        cursor.fetchone.return_value = None
        cursor.rowcount = 0
        with self.assertRaisesRegex(ValueError, "cambió"):
            guardar_producto("A", "Mouse", 1, "10", 2, 5, 7, b"version")
        conexion.commit.assert_not_called()
        conexion.rollback.assert_called_once()
        conexion.close.assert_called_once()

    @patch("database.productos.obtener_conexion")
    def test_insercion_confirma_y_cierra(self, conectar):
        conexion = conectar.return_value
        conexion.cursor.return_value.fetchone.return_value = None
        guardar_producto("A", "Mouse", 1, "10", 2, 5)
        conexion.commit.assert_called_once()
        conexion.close.assert_called_once()

    @patch("database.productos.obtener_conexion")
    def test_error_de_insercion_revierte(self, conectar):
        conexion = conectar.return_value
        cursor = conexion.cursor.return_value
        cursor.fetchone.return_value = None
        cursor.execute.side_effect = [cursor, RuntimeError("2627 duplicate")]
        with self.assertRaisesRegex(ValueError, "código"):
            guardar_producto("A", "Mouse", 1, "10", 2, 5)
        conexion.rollback.assert_called_once()
        conexion.commit.assert_not_called()
        conexion.close.assert_called_once()

    @patch("database.productos.obtener_conexion")
    def test_desactivacion_es_logica(self, conectar):
        conexion = conectar.return_value
        cursor = conexion.cursor.return_value
        cursor.rowcount = 1
        desactivar_producto(7, b"version")
        sql, parametros = cursor.execute.call_args.args
        self.assertIn("SET Activo=0", sql)
        self.assertEqual(parametros, (7, b"version"))
        conexion.commit.assert_called_once()
        conexion.close.assert_called_once()

    @patch("database.productos.obtener_conexion")
    def test_busqueda_es_parametrizada_y_solo_lectura(self, conectar):
        conexion = conectar.return_value
        cursor = conexion.cursor.return_value
        cursor.description = [("ProductoID",)]
        cursor.fetchall.return_value = [(1,)]
        texto = "'; DROP TABLE Productos;--%_"
        self.assertEqual(listar_productos(texto), [{"ProductoID": 1}])
        sql, parametros = cursor.execute.call_args.args
        self.assertNotIn(texto, sql)
        self.assertEqual(parametros, (0, texto, texto))
        conectar.assert_called_once_with("DataCoreAI")
        conexion.commit.assert_not_called()
        conexion.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
