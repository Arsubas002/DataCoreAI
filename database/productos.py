"""Consultas parametrizadas y cambios explícitos sobre productos."""

from contextlib import closing
from decimal import Decimal, InvalidOperation

from database.connection import obtener_conexion
from services.configuracion import exigir_escritura


def validar_producto(codigo, nombre, categoria_id, precio, existencias, stock_minimo):
    """Valida también fuera de la interfaz; devuelve valores normalizados."""
    codigo, nombre = codigo.strip().upper(), nombre.strip()
    if not codigo or len(codigo) > 30:
        raise ValueError("El código es obligatorio y admite hasta 30 caracteres.")
    if not nombre or len(nombre) > 150:
        raise ValueError("El nombre es obligatorio y admite hasta 150 caracteres.")
    try:
        precio = Decimal(str(precio))
    except (InvalidOperation, ValueError):
        raise ValueError("El precio debe ser un número válido.") from None
    if not precio.is_finite() or precio < 0 or precio > Decimal("9999999999.99"):
        raise ValueError("El precio debe estar entre 0 y 9999999999.99.")
    if precio != precio.quantize(Decimal("0.01")):
        raise ValueError("El precio admite como máximo dos decimales.")
    for valor in (existencias, stock_minimo):
        if isinstance(valor, bool) or not isinstance(valor, int) or not 0 <= valor <= 2147483647:
            raise ValueError("Las existencias y el stock mínimo deben ser enteros no negativos.")
    if isinstance(categoria_id, bool) or not isinstance(categoria_id, int) or categoria_id <= 0:
        raise ValueError("Selecciona una categoría válida.")
    return codigo, nombre, categoria_id, precio, existencias, stock_minimo


def consultar(sql, parametros=()):
    # La base del negocio es explícita: nunca se consulta master por accidente.
    with closing(obtener_conexion("DataCoreAI")) as conexion:
        cursor = conexion.cursor()
        cursor.execute(sql, parametros)
        columnas = [columna[0] for columna in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]


def listar_categorias():
    return consultar("SELECT CategoriaID, Nombre FROM dbo.Categorias ORDER BY Nombre")


def listar_productos(busqueda="", incluir_inactivos=False):
    busqueda = (busqueda or "").strip()
    # CHARINDEX busca texto literal: %, _ y comillas no son comodines ni SQL.
    sql = """SELECT p.ProductoID, p.Codigo, p.Nombre, p.CategoriaID,
                  c.Nombre AS Categoria, p.Precio, p.Existencias,
                  p.StockMinimo, p.Activo, p.VersionFila
           FROM dbo.Productos p
           JOIN dbo.Categorias c ON c.CategoriaID = p.CategoriaID
           WHERE (? = 1 OR p.Activo = 1)"""
    parametros = [int(incluir_inactivos)]
    # Sin texto no existe ningún filtro de nombre/código en el SQL enviado.
    if busqueda:
        sql += " AND (CHARINDEX(?, p.Codigo) > 0 OR CHARINDEX(?, p.Nombre) > 0)"
        parametros.extend([busqueda, busqueda])
    sql += " ORDER BY p.Nombre, p.ProductoID"
    return consultar(sql, tuple(parametros))


def guardar_producto(codigo, nombre, categoria_id, precio, existencias, stock_minimo,
                     producto_id=None, version=None):
    exigir_escritura()
    valores = validar_producto(codigo, nombre, categoria_id, precio, existencias, stock_minimo)
    with closing(obtener_conexion("DataCoreAI")) as conexion:
        try:
            cursor = conexion.cursor()
            cursor.execute(
                "SELECT ProductoID FROM dbo.Productos WHERE Codigo = ? AND ProductoID <> ?",
                (valores[0], producto_id or 0),
            )
            if cursor.fetchone():
                raise ValueError("Ya existe un producto con ese código, incluso si está inactivo.")
            if producto_id is None:
                cursor.execute(
                    """INSERT INTO dbo.Productos
                       (Codigo, Nombre, CategoriaID, Precio, Existencias, StockMinimo)
                       VALUES (?, ?, ?, ?, ?, ?)""", valores,
                )
            else:
                # ROWVERSION evita sobrescribir una edición realizada por otra sesión.
                cursor.execute(
                    """UPDATE dbo.Productos SET Codigo=?, Nombre=?, CategoriaID=?,
                       Precio=?, Existencias=?, StockMinimo=?
                       WHERE ProductoID=? AND VersionFila=? AND Activo=1""",
                    (*valores, producto_id, version),
                )
                if cursor.rowcount != 1:
                    raise ValueError("El producto cambió o fue desactivado. Actualiza la pantalla.")
            conexion.commit()
        except Exception as error:
            conexion.rollback()
            # La restricción UNIQUE también protege contra registros simultáneos.
            if "2601" in str(error) or "2627" in str(error):
                raise ValueError("Ya existe un producto con ese código.") from error
            raise


def desactivar_producto(producto_id, version):
    """Desactivación lógica: conserva el registro y sus referencias."""
    exigir_escritura()
    with closing(obtener_conexion("DataCoreAI")) as conexion:
        try:
            cursor = conexion.cursor()
            cursor.execute(
                "UPDATE dbo.Productos SET Activo=0 WHERE ProductoID=? AND VersionFila=? AND Activo=1",
                (producto_id, version),
            )
            if cursor.rowcount != 1:
                raise ValueError("El producto cambió o ya está inactivo. Actualiza la pantalla.")
            conexion.commit()
        except Exception:
            conexion.rollback()
            raise
