"""Catálogo y ventas ficticios compartidos por pruebas de integración de UI."""
from datetime import date, datetime
from decimal import Decimal


def catalogo():
    return [{"ProductoID": 1, "Codigo": "DEMO-A", "Nombre": "Mouse de prueba",
             "CategoriaID": 1, "Categoria": "Accesorios", "Precio": Decimal("8.50"),
             "Existencias": 10, "StockMinimo": 5, "Activo": True, "VersionFila": b"version1"},
            {"ProductoID": 2, "Codigo": "DEMO-B", "Nombre": "Teclado de Perú",
             "CategoriaID": 1, "Categoria": "Accesorios", "Precio": Decimal("10.00"),
             "Existencias": 0, "StockMinimo": 5, "Activo": True, "VersionFila": b"version2"}]


def resumen():
    return {"ventas": {"NumeroVentas": 2, "TotalVentas": Decimal("25.50")},
            "tendencia": [{"Dia": date(2026, 11, 5), "NumeroVentas": 1, "TotalVentas": Decimal("8.50")},
                          {"Dia": date(2026, 11, 6), "NumeroVentas": 1, "TotalVentas": Decimal("17.00")}],
            "productos_vendidos": [{"Codigo": "DEMO-A", "Nombre": "Mouse de prueba", "Unidades": 3,
                                    "Ingresos": Decimal("25.50")}],
            "inventario": [{"Codigo": p["Codigo"], "Nombre": p["Nombre"], "Existencias": p["Existencias"],
                            "StockMinimo": p["StockMinimo"], "Estado": "Agotado" if not p["Existencias"] else "Normal"}
                           for p in catalogo()]}


def historial():
    return [{"VentaID": i, "Fecha": datetime(2026, 11, i + 4, 12), "Cliente": "Cliente ficticio",
             "Codigo": "DEMO-A", "Producto": "Mouse de prueba", "Cantidad": i,
             "PrecioUnitario": Decimal("8.50"), "Subtotal": Decimal("8.50") * i,
             "Total": Decimal("8.50") * i} for i in (1, 2)]
