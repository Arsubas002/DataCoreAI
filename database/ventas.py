"""Ventas atómicas y reintentos seguros con una clave persistente por operación."""

from contextlib import closing
from decimal import Decimal, InvalidOperation
from hashlib import sha256
import json
from uuid import UUID

from database.connection import obtener_conexion
from database.productos import consultar
from services.configuracion import exigir_escritura

MAX_IMPORTE = Decimal("9999999999.99")


def importe(valor):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError):
        raise ValueError("Precio inválido.") from None
    if not numero.is_finite() or not 0 <= numero <= MAX_IMPORTE:
        raise ValueError("Importe fuera del rango permitido.")
    if numero != numero.quantize(Decimal("0.01")):
        raise ValueError("Los importes admiten dos decimales.")
    return numero.quantize(Decimal("0.01"))


def preparar_carrito(lineas):
    """Valida cantidades y calcula con Decimal, sin consultar ni modificar SQL."""
    if not lineas:
        raise ValueError("Agrega al menos un producto al carrito.")
    resultado, usados = [], set()
    total = Decimal("0.00")
    for linea in lineas:
        identificador, cantidad = linea["ProductoID"], linea["Cantidad"]
        if type(identificador) is not int or identificador <= 0:
            raise ValueError("Producto inválido.")
        if identificador in usados:
            raise ValueError("Cada producto debe aparecer una sola vez en el carrito.")
        if type(cantidad) is not int or not 1 <= cantidad <= 2147483647:
            raise ValueError("La cantidad debe ser un entero mayor que cero.")
        usados.add(identificador)
        precio = importe(linea["Precio"])
        subtotal = importe(precio * cantidad)
        total = importe(total + subtotal)
        resultado.append({"ProductoID": identificador, "Cantidad": cantidad,
                          "Precio": precio, "Subtotal": subtotal})
    return sorted(resultado, key=lambda fila: fila["ProductoID"]), total


def listar_clientes():
    return consultar("SELECT ClienteID, Documento, Nombre FROM dbo.Clientes WHERE Activo=1 ORDER BY Nombre")


def listar_historial():
    # Una fila por detalle; Fecha, cliente y total se agrupan en la pantalla.
    return consultar("""SELECT v.VentaID, v.Fecha, c.Nombre AS Cliente, v.Total,
                        p.Codigo, p.Nombre AS Producto, d.Cantidad,
                        d.PrecioUnitario, d.Subtotal
                 FROM dbo.Ventas v JOIN dbo.Clientes c ON c.ClienteID=v.ClienteID
                 JOIN dbo.DetalleVentas d ON d.VentaID=v.VentaID
                 JOIN dbo.Productos p ON p.ProductoID=d.ProductoID
                 ORDER BY v.Fecha DESC, v.VentaID DESC, d.DetalleVentaID""")


def registrar_venta(cliente_id, lineas, solicitud_id):
    """Reintentar siempre con la MISMA clave y contenido si el resultado es incierto."""
    exigir_escritura()
    if type(cliente_id) is not int or cliente_id <= 0:
        raise ValueError("Selecciona un cliente válido.")
    solicitud_id = str(UUID(str(solicitud_id)))
    carrito, total = preparar_carrito(lineas)
    contenido = [cliente_id, [(p["ProductoID"], p["Cantidad"], str(p["Precio"])) for p in carrito]]
    huella = sha256(json.dumps(contenido).encode("utf-8")).hexdigest()

    with closing(obtener_conexion("DataCoreAI")) as conexion:
        conexion.autocommit = False
        try:
            cursor = conexion.cursor()
            cursor.execute("SET XACT_ABORT ON; SET LOCK_TIMEOUT 10000;")
            # El bloqueo de rango serializa los intentos con el mismo UUID.
            cursor.execute("""SELECT Huella, VentaID FROM dbo.VentasSolicitudes
                              WITH (UPDLOCK, HOLDLOCK) WHERE SolicitudID=?""", (solicitud_id,))
            anterior = cursor.fetchone()
            if anterior:
                if anterior[0] != huella:
                    raise ValueError("Esta clave de venta ya corresponde a otro carrito.")
                if anterior[1] is None:
                    raise ValueError("Solicitud incompleta. Requiere revisión del administrador.")
                conexion.commit()
                return int(anterior[1])
            cursor.execute("INSERT INTO dbo.VentasSolicitudes (SolicitudID, Huella) VALUES (?, ?)",
                           (solicitud_id, huella))
            cursor.execute("SELECT ClienteID FROM dbo.Clientes WITH (HOLDLOCK) WHERE ClienteID=? AND Activo=1",
                           (cliente_id,))
            if not cursor.fetchone():
                raise ValueError("El cliente no existe o está inactivo.")

            # Todos los productos se bloquean en orden de ID para reducir deadlocks.
            for linea in carrito:
                cursor.execute("""SELECT Precio, Existencias, Activo FROM dbo.Productos
                                  WITH (UPDLOCK, HOLDLOCK) WHERE ProductoID=?""", (linea["ProductoID"],))
                producto = cursor.fetchone()
                if not producto or not producto[2]:
                    raise ValueError("Un producto ya no existe o está inactivo. Revisa el carrito.")
                if producto[1] < linea["Cantidad"]:
                    raise ValueError(f"Stock insuficiente para el producto {linea['ProductoID']}.")
                if importe(producto[0]) != linea["Precio"]:
                    raise ValueError("El precio de un producto cambió. Elimínalo y vuelve a agregarlo.")

            cursor.execute("INSERT INTO dbo.Ventas (ClienteID, Total) OUTPUT INSERTED.VentaID VALUES (?, ?)",
                           (cliente_id, total))
            venta_id = int(cursor.fetchone()[0])
            for linea in carrito:
                cursor.execute("""UPDATE dbo.Productos SET Existencias=Existencias-?
                                  WHERE ProductoID=? AND Activo=1 AND Existencias>=?""",
                               (linea["Cantidad"], linea["ProductoID"], linea["Cantidad"]))
                if cursor.rowcount != 1:
                    raise ValueError("El inventario cambió. No se registró la venta.")
                cursor.execute("""INSERT INTO dbo.DetalleVentas
                                  (VentaID, ProductoID, Cantidad, PrecioUnitario, Subtotal)
                                  VALUES (?, ?, ?, ?, ?)""",
                               (venta_id, linea["ProductoID"], linea["Cantidad"], linea["Precio"], linea["Subtotal"]))
            cursor.execute("UPDATE dbo.VentasSolicitudes SET VentaID=? WHERE SolicitudID=?",
                           (venta_id, solicitud_id))
            conexion.commit()
            return venta_id
        except Exception:
            conexion.rollback()
            raise
