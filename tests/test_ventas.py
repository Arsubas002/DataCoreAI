"""Pruebas sin SQL Server: el servidor y sus transacciones se simulan en memoria."""

from copy import deepcopy
from decimal import Decimal
import unittest
from unittest.mock import patch
from uuid import uuid4

from database.ventas import preparar_carrito, registrar_venta


def linea(identificador=1, cantidad=2, precio="8.50"):
    return {"ProductoID": identificador, "Cantidad": cantidad, "Precio": precio}


class ServidorSimulado:
    def __init__(self):
        self.datos = {"productos": {1: [Decimal("8.50"), 10, True],
                                    2: [Decimal("1.50"), 5, True]},
                      "solicitudes": {}, "ventas": {}, "detalles": []}
        self.conexiones = []
        self.fallar_detalle = None
        self.perder_respuesta_commit = False
        self.stock_update_cero = False
        self.bloqueo_falla = False
        self.cliente_activo = True

    def conectar(self, base):
        assert base == "DataCoreAI"
        conexion = ConexionSimulada(self)
        self.conexiones.append(conexion)
        return conexion


class ConexionSimulada:
    def __init__(self, servidor):
        self.servidor = servidor
        self.anterior = deepcopy(servidor.datos)
        self.confirmaciones = self.reversiones = 0
        self.cerrada = False
        self.sentencias = []

    def cursor(self):
        return CursorSimulado(self)

    def commit(self):
        self.confirmaciones += 1
        self.anterior = deepcopy(self.servidor.datos)
        if self.servidor.perder_respuesta_commit:
            self.servidor.perder_respuesta_commit = False
            raise ConnectionError("COMMIT aplicado, respuesta perdida")

    def rollback(self):
        self.reversiones += 1
        self.servidor.datos = deepcopy(self.anterior)

    def close(self):
        self.cerrada = True


class CursorSimulado:
    def __init__(self, conexion):
        self.conexion = conexion
        self.resultado = None
        self.rowcount = 1

    def execute(self, sql, parametros=()):
        self.conexion.sentencias.append((sql, parametros))
        servidor = self.conexion.servidor
        datos = servidor.datos
        if sql.startswith("SET "):
            pass
        elif "SELECT Huella" in sql:
            if servidor.bloqueo_falla:
                raise TimeoutError("Bloqueo agotado")
            self.resultado = datos["solicitudes"].get(parametros[0])
        elif sql.startswith("INSERT INTO dbo.VentasSolicitudes"):
            clave, huella = parametros
            datos["solicitudes"][clave] = (huella, None)
        elif "SELECT ClienteID" in sql:
            self.resultado = (parametros[0],) if servidor.cliente_activo else None
        elif "SELECT Precio, Existencias" in sql:
            self.resultado = datos["productos"].get(parametros[0])
        elif sql.startswith("INSERT INTO dbo.Ventas ("):
            venta_id = len(datos["ventas"]) + 1
            datos["ventas"][venta_id] = parametros
            self.resultado = (venta_id,)
        elif sql.startswith("UPDATE dbo.Productos"):
            cantidad, identificador, _ = parametros
            if servidor.stock_update_cero:
                self.rowcount = 0
            else:
                datos["productos"][identificador][1] -= cantidad
                self.rowcount = 1
        elif "INSERT INTO dbo.DetalleVentas" in sql:
            if servidor.fallar_detalle == parametros[1]:
                raise RuntimeError("Fallo de detalle simulado")
            datos["detalles"].append(parametros)
        elif sql.startswith("UPDATE dbo.VentasSolicitudes"):
            venta_id, clave = parametros
            huella, _ = datos["solicitudes"][clave]
            datos["solicitudes"][clave] = (huella, venta_id)
        else:
            raise AssertionError(f"SQL inesperado: {sql}")
        return self

    def fetchone(self):
        return self.resultado


class PruebasVentas(unittest.TestCase):
    def setUp(self):
        self.servidor = ServidorSimulado()
        self.parche = patch("database.ventas.obtener_conexion", side_effect=self.servidor.conectar)
        self.conectar = self.parche.start()
        self.addCleanup(self.parche.stop)
        self.clave = str(uuid4())

    def vender(self, lineas=None, clave=None):
        return registrar_venta(1, lineas if lineas is not None else [linea()], clave or self.clave)

    def test_calculo_exacto_en_soles(self):
        filas, total = preparar_carrito([linea(cantidad=3, precio="0.10"), linea(2, 2, "1.50")])
        self.assertEqual(filas[0]["Subtotal"], Decimal("0.30"))
        self.assertEqual(total, Decimal("3.30"))

    def test_rechaza_cantidades_y_carritos_invalidos_antes_de_conectar(self):
        for cantidad in (0, -1, 1.5, True, 2147483648):
            with self.subTest(cantidad=cantidad), self.assertRaises(ValueError):
                self.vender([linea(cantidad=cantidad)])
        for carrito in ([], [linea(), linea()], [linea(precio="-1")],
                        [linea(precio="NaN")], [linea(precio="1.001")],
                        [linea(cantidad=2, precio="9999999999.99")]):
            with self.subTest(carrito=carrito), self.assertRaises(ValueError):
                self.vender(carrito)
        self.conectar.assert_not_called()

    def test_venta_confirma_cabecera_detalle_stock_y_clave(self):
        self.assertEqual(self.vender([linea(), linea(2, 3, "1.50")]), 1)
        datos = self.servidor.datos
        self.assertEqual(datos["ventas"][1], (1, Decimal("21.50")))
        self.assertEqual(len(datos["detalles"]), 2)
        self.assertEqual(datos["productos"][1][1], 8)
        self.assertEqual(datos["productos"][2][1], 2)
        self.assertEqual(datos["solicitudes"][self.clave][1], 1)
        conexion = self.servidor.conexiones[-1]
        self.assertEqual(conexion.confirmaciones, 1)
        self.assertTrue(conexion.cerrada)
        self.assertFalse(conexion.autocommit)

    def test_stock_insuficiente_no_deja_escrituras(self):
        anterior = deepcopy(self.servidor.datos)
        with self.assertRaisesRegex(ValueError, "Stock insuficiente"):
            self.vender([linea(cantidad=11)])
        self.assertEqual(self.servidor.datos, anterior)
        self.assertEqual(self.servidor.conexiones[-1].reversiones, 1)
        self.assertEqual(self.servidor.conexiones[-1].confirmaciones, 0)

    def test_fallo_segundo_detalle_revierte_toda_la_venta(self):
        anterior = deepcopy(self.servidor.datos)
        self.servidor.fallar_detalle = 2
        with self.assertRaises(RuntimeError):
            self.vender([linea(), linea(2, 1, "1.50")])
        self.assertEqual(self.servidor.datos, anterior)
        self.assertTrue(self.servidor.conexiones[-1].cerrada)
        self.servidor.fallar_detalle = None
        self.assertEqual(self.vender([linea(), linea(2, 1, "1.50")]), 1)

    def test_doble_confirmacion_devuelve_misma_venta(self):
        venta = self.vender()
        anterior = deepcopy(self.servidor.datos)
        self.assertEqual(self.vender(), venta)
        self.assertEqual(self.servidor.datos, anterior)
        self.assertFalse(any(sql.startswith("INSERT") or sql.startswith("UPDATE")
                             for sql, _ in self.servidor.conexiones[-1].sentencias))

    def test_reintento_despues_de_commit_con_respuesta_perdida(self):
        self.servidor.perder_respuesta_commit = True
        with self.assertRaises(ConnectionError):
            self.vender()
        self.assertEqual(self.vender(), 1)
        self.assertEqual(len(self.servidor.datos["ventas"]), 1)
        self.assertEqual(self.servidor.datos["productos"][1][1], 8)

    def test_clave_no_admite_otro_contenido(self):
        self.vender()
        anterior = deepcopy(self.servidor.datos)
        with self.assertRaisesRegex(ValueError, "otro carrito"):
            self.vender([linea(cantidad=3)])
        self.assertEqual(self.servidor.datos, anterior)

    def test_otra_clave_permite_venta_legitima_igual(self):
        self.vender()
        self.assertEqual(self.vender(clave=str(uuid4())), 2)
        self.assertEqual(self.servidor.datos["productos"][1][1], 6)

    def test_revalida_cliente_producto_y_precio(self):
        for cambio in ("cliente", "activo", "precio", "ausente"):
            with self.subTest(cambio=cambio):
                self.servidor = ServidorSimulado()
                self.conectar.side_effect = self.servidor.conectar
                if cambio == "cliente":
                    self.servidor.cliente_activo = False
                elif cambio == "activo":
                    self.servidor.datos["productos"][1][2] = False
                elif cambio == "precio":
                    self.servidor.datos["productos"][1][0] = Decimal("9.00")
                else:
                    del self.servidor.datos["productos"][1]
                anterior = deepcopy(self.servidor.datos)
                with self.assertRaises(ValueError):
                    self.vender()
                self.assertEqual(self.servidor.datos, anterior)

    def test_update_condicional_fallido_revierte(self):
        self.servidor.stock_update_cero = True
        anterior = deepcopy(self.servidor.datos)
        with self.assertRaisesRegex(ValueError, "inventario cambió"):
            self.vender()
        self.assertEqual(self.servidor.datos, anterior)

    def test_timeout_de_bloqueo_no_escribe(self):
        self.servidor.bloqueo_falla = True
        anterior = deepcopy(self.servidor.datos)
        with self.assertRaises(TimeoutError):
            self.vender()
        self.assertEqual(self.servidor.datos, anterior)
        self.assertTrue(self.servidor.conexiones[-1].cerrada)

    def test_productos_se_bloquean_en_orden(self):
        self.vender([linea(2, 1, "1.50"), linea()])
        consultas = [(sql, parametros) for sql, parametros in self.servidor.conexiones[-1].sentencias
                     if "SELECT Precio, Existencias" in sql]
        self.assertEqual([p[0] for _, p in consultas], [1, 2])
        self.assertTrue(all("UPDLOCK, HOLDLOCK" in sql for sql, _ in consultas))


if __name__ == "__main__":
    unittest.main()
