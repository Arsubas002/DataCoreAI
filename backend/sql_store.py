"""No migrations or writes. All values are passed separately as ODBC parameters."""

from contextlib import closing
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import os
import threading


class DatabaseUnavailable(Exception):
    pass


def odbc_value(value: str) -> str:
    return "{" + value.replace("}", "}}") + "}"


def open_original_database():
    import pyodbc

    driver = "ODBC Driver 18 for SQL Server"
    if driver not in pyodbc.drivers():
        raise DatabaseUnavailable("driver_unavailable")
    # Windows integrated authentication; no password or connection string in the browser.
    server = os.getenv("DATACORE_SQL_SERVER", r"localhost\SQLEXPRESS")
    connection = pyodbc.connect(
        f"DRIVER={odbc_value(driver)};SERVER={odbc_value(server)};"
        "DATABASE={DataCoreAI};Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=no;",
        timeout=5,
        autocommit=False,
        attrs_before={pyodbc.SQL_ATTR_ACCESS_MODE: pyodbc.SQL_MODE_READ_ONLY},
    )
    try:
        connection.timeout = 10
    except Exception:
        connection.close()
        raise
    return connection


class SqlStore:
    def __init__(self, connect=open_original_database):
        self.connect = connect
        self.slots = threading.BoundedSemaphore(4)

    def read(self, sql, params=()):
        if not self.slots.acquire(timeout=0.25):
            raise DatabaseUnavailable("busy")
        try:
            with closing(self.connect()) as connection:
                try:
                    with closing(connection.cursor()) as cursor:
                        cursor.execute("SET LOCK_TIMEOUT 5000;")
                        cursor.execute(sql, tuple(params))
                        names = [c[0] for c in cursor.description]
                        return [dict(zip(names, row)) for row in cursor.fetchall()]
                finally:
                    # Release read transaction/locks; never commit changes.
                    connection.rollback()
        except DatabaseUnavailable:
            raise
        except Exception:
            raise DatabaseUnavailable("query_unavailable") from None
        finally:
            self.slots.release()

    def products(self, q="", category_id=None, limit=100, offset=0):
        return self.read(
            """SELECT p.ProductoID, p.Codigo, p.Nombre, p.CategoriaID,
               c.Nombre AS Categoria, p.Precio, p.Existencias, p.StockMinimo, p.Activo
            FROM dbo.Productos p JOIN dbo.Categorias c ON c.CategoriaID=p.CategoriaID
            WHERE (? = '' OR CHARINDEX(?,p.Codigo)>0 OR CHARINDEX(?,p.Nombre)>0)
              AND (? IS NULL OR p.CategoriaID=?)
            ORDER BY p.Nombre,p.ProductoID OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""",
            (q, q, q, category_id, category_id, offset, limit),
        )

    def categories(self):
        return self.read(
            "SELECT CategoriaID, Nombre FROM dbo.Categorias ORDER BY Nombre"
        )

    def customers(self, q="", limit=100, offset=0):
        return self.read(
            """SELECT ClienteID,Documento,Nombre,Correo,Telefono,Activo FROM dbo.Clientes
            WHERE (?='' OR CHARINDEX(?,Nombre)>0 OR CHARINDEX(?,Documento)>0)
            ORDER BY Nombre,ClienteID OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""",
            (q, q, q, offset, limit),
        )

    def inventory(self, q="", low_only=False, limit=100, offset=0):
        return self.read(
            """SELECT p.ProductoID,p.Codigo,p.Nombre,c.Nombre AS Categoria,
                p.Existencias,p.StockMinimo,
                CASE WHEN p.Existencias=0 THEN 'Agotado'
                     WHEN p.Existencias<=p.StockMinimo THEN 'Stock bajo' ELSE 'Disponible' END AS Estado
            FROM dbo.Productos p JOIN dbo.Categorias c ON c.CategoriaID=p.CategoriaID
            WHERE p.Activo=1 AND (?='' OR CHARINDEX(?,p.Codigo)>0 OR CHARINDEX(?,p.Nombre)>0)
              AND (?=0 OR p.Existencias<=p.StockMinimo)
            ORDER BY p.Existencias,p.ProductoID OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""",
            (q, q, q, int(low_only), offset, limit),
        )

    def sales(self, start, end, limit=100, offset=0):
        lower, upper = boundaries(start, end)
        return self.read(
            """SELECT VentaID,ClienteID,Fecha,Total FROM dbo.Ventas
            WHERE Fecha>=? AND Fecha<?
            ORDER BY Fecha DESC,VentaID DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""",
            (lower, upper, offset, limit),
        )

    def reports(self, start, end, product_id=None, category_id=None):
        lower, upper = boundaries(start, end)
        # Aggregation occurs in SQL. Never duplicate header totals by joining detail rows.
        rows = self.read(
            """SELECT TOP (10001) CAST(v.Fecha AS date) AS Dia,v.VentaID,p.ProductoID,
                p.Codigo,p.Nombre,p.CategoriaID,c.Nombre AS Categoria,
                SUM(CAST(d.Cantidad AS bigint)) AS Unidades,SUM(d.Subtotal) AS Ingresos
            FROM dbo.Ventas v JOIN dbo.DetalleVentas d ON d.VentaID=v.VentaID
            JOIN dbo.Productos p ON p.ProductoID=d.ProductoID
            JOIN dbo.Categorias c ON c.CategoriaID=p.CategoriaID
            WHERE v.Fecha>=? AND v.Fecha<? AND (? IS NULL OR p.ProductoID=?)
              AND (? IS NULL OR p.CategoriaID=?)
            GROUP BY CAST(v.Fecha AS date),v.VentaID,p.ProductoID,p.Codigo,p.Nombre,
                     p.CategoriaID,c.Nombre ORDER BY Dia,v.VentaID,p.ProductoID""",
            (lower, upper, product_id, product_id, category_id, category_id),
        )
        if len(rows) > 10000:
            raise DatabaseUnavailable("report_limit")
        revenue = sum((Decimal(str(r["Ingresos"])) for r in rows), Decimal("0.00"))
        return {
            "rows": rows,
            "metrics": {
                "revenue": revenue,
                "orders": len({r["VentaID"] for r in rows}),
                "units": sum(int(r["Unidades"]) for r in rows),
            },
            "period": {"start": start, "end": end},
            "source": "dbo.DetalleVentas.Subtotal · precios de venta históricos",
            "filters": {"product_id": product_id, "category_id": category_id},
            "branchesSupported": False,
        }

    def schema(self):
        return self.read(
            """SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo'
            AND TABLE_NAME IN ('Categorias','Productos','Clientes','Ventas','DetalleVentas','VentasSolicitudes')
            ORDER BY TABLE_NAME,ORDINAL_POSITION"""
        )


def boundaries(start: date, end: date):
    if start > end or end == date.max or (end - start).days > 366:
        raise ValueError("Invalid period")
    return datetime.combine(start, time.min), datetime.combine(
        end + timedelta(days=1), time.min
    )
