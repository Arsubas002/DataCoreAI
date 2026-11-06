"""Exportaciones en memoria; conservan Decimal y neutralizan fórmulas CSV."""
import csv
from datetime import datetime
from decimal import Decimal
from io import StringIO


COLUMNAS = {
    "tendencia": ("Dia", "NumeroVentas", "TotalVentas"),
    "productos_vendidos": ("Codigo", "Nombre", "Unidades", "Ingresos"),
    "inventario": ("Codigo", "Nombre", "Existencias", "StockMinimo", "Estado"),
}


def csv_reporte(filas, tipo, inicio, fin, generado: datetime):
    """CSV UTF-8 BOM con metadatos y columnas estables incluso sin filas."""
    columnas = COLUMNAS[tipo]
    salida = StringIO(newline="")
    escritor = csv.writer(salida)

    def segura(valor):
        if isinstance(valor, Decimal):
            return format(valor, ".2f")
        if isinstance(valor, str) and (valor.lstrip().startswith(("=", "+", "-", "@"))
                                       or any(c in valor for c in "\t\r\n")):
            return "'" + valor
        return valor

    escritor.writerow(["Reporte", tipo])
    escritor.writerow(["Generado", generado.isoformat(timespec="seconds")])
    escritor.writerow(["Desde inclusive", inicio.isoformat(), "Hasta inclusive", fin.isoformat()])
    escritor.writerow(["Moneda", "PEN (S/)", "Filas", len(filas)])
    escritor.writerow(["Alcance", "Inventario actual" if tipo == "inventario" else
                        "Ventas del periodo; nombres actuales; ranking limitado a 8 productos" if tipo == "productos_vendidos" else
                        "Ventas del periodo; fechas locales de SQL Server sin zona horaria"])
    escritor.writerow(columnas)
    escritor.writerows([segura(fila[columna]) for columna in columnas] for fila in filas)
    return salida.getvalue().encode("utf-8-sig")
