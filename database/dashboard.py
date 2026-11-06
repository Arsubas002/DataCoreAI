"""Consultas de solo lectura para el panel comercial."""
from datetime import date, datetime, time, timedelta
from database.productos import consultar


def resumen_comercial(inicio: date, fin: date):
    """Devuelve indicadores y series; el intervalo final es inclusivo en la UI."""
    if not isinstance(inicio, date) or not isinstance(fin, date) or isinstance(inicio, datetime) or isinstance(fin, datetime):
        raise ValueError("Selecciona fechas válidas.")
    if inicio > fin:
        raise ValueError("La fecha inicial no puede ser posterior a la final.")
    if fin == date.max:
        raise ValueError("La fecha final debe ser anterior al 31/12/9999.")
    desde = datetime.combine(inicio, time.min)
    hasta = datetime.combine(fin + timedelta(days=1), time.min)
    parametros = (desde, hasta)
    ventas = consultar("""
        SELECT COUNT_BIG(*) AS NumeroVentas,
               COALESCE(SUM(Total), 0) AS TotalVentas
        FROM dbo.Ventas
        WHERE Fecha >= ? AND Fecha < ?
    """, parametros)[0]
    tendencia = consultar("""
        SELECT CAST(Fecha AS date) AS Dia, COUNT_BIG(*) AS NumeroVentas,
               SUM(Total) AS TotalVentas
        FROM dbo.Ventas
        WHERE Fecha >= ? AND Fecha < ?
        GROUP BY CAST(Fecha AS date)
        ORDER BY Dia
    """, parametros)
    productos_vendidos = consultar("""
        SELECT TOP (8) p.Codigo, p.Nombre,
               SUM(CAST(d.Cantidad AS bigint)) AS Unidades,
               SUM(d.Subtotal) AS Ingresos
        FROM dbo.Ventas v
        JOIN dbo.DetalleVentas d ON d.VentaID = v.VentaID
        JOIN dbo.Productos p ON p.ProductoID = d.ProductoID
        WHERE v.Fecha >= ? AND v.Fecha < ?
        GROUP BY p.ProductoID, p.Codigo, p.Nombre
        ORDER BY Unidades DESC, p.Nombre
    """, parametros)
    inventario = consultar("""
        SELECT Codigo, Nombre, Existencias, StockMinimo,
               CASE WHEN Existencias = 0 THEN 'Agotado'
                    WHEN Existencias <= StockMinimo THEN 'Stock bajo'
                    ELSE 'Normal' END AS Estado
        FROM dbo.Productos
        WHERE Activo = 1
        ORDER BY CASE WHEN Existencias = 0 THEN 0
                      WHEN Existencias <= StockMinimo THEN 1 ELSE 2 END,
                 Existencias, Nombre
    """)
    return {"ventas": ventas, "tendencia": tendencia,
            "productos_vendidos": productos_vendidos, "inventario": inventario}
