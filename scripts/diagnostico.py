"""Diagnóstico sin secretos. SQL solo con --sql explícito y consultas de metadatos."""
import argparse
from contextlib import closing
from importlib import metadata
import json
import os
from pathlib import Path
import platform
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database.connection import obtener_conexion

REQUERIDAS = {
    "Categorias": {"CategoriaID", "Nombre"},
    "Productos": {"ProductoID", "Codigo", "Nombre", "CategoriaID", "Precio", "Existencias", "StockMinimo", "Activo", "VersionFila"},
    "Clientes": {"ClienteID", "Documento", "Nombre", "Activo"},
    "Ventas": {"VentaID", "ClienteID", "Fecha", "Total"},
    "DetalleVentas": {"DetalleVentaID", "VentaID", "ProductoID", "Cantidad", "PrecioUnitario", "Subtotal"},
    "VentasSolicitudes": {"SolicitudID", "Huella", "VentaID"},
}


def revisar_entorno():
    paquetes = {}
    for nombre in ("streamlit", "pyodbc", "pandas", "plotly", "streamlit-keyup", "openpyxl", "reportlab", "requests"):
        try:
            paquetes[nombre] = metadata.version(nombre)
        except metadata.PackageNotFoundError:
            paquetes[nombre] = None
    try:
        import pyodbc
        driver = "ODBC Driver 18 for SQL Server" in pyodbc.drivers()
    except (ImportError, OSError):
        driver = False
    return {"python": platform.python_version(), "python_313": sys.version_info[:2] == (3, 13),
            "plataforma": platform.system(), "paquetes": paquetes, "odbc_driver_18": driver,
            "solo_lectura": os.getenv("DATACORE_READ_ONLY") == "1",
            "groq_habilitado": os.getenv("DATACORE_GROQ_ENABLED") == "1",
            "conexion_sql_probada": False}


def revisar_columnas_sql():
    """Lee solo nombres de tablas/columnas; no valida tipos ni restricciones."""
    try:
        with closing(obtener_conexion("DataCoreAI")) as conexion:
            cursor = conexion.cursor()
            cursor.execute("""SELECT t.name, c.name
                              FROM sys.tables t
                              JOIN sys.schemas s ON s.schema_id=t.schema_id
                              JOIN sys.columns c ON c.object_id=t.object_id
                              WHERE s.name=?""", ("dbo",))
            presentes = {}
            for tabla, columna in cursor.fetchall():
                presentes.setdefault(tabla, set()).add(columna)
            faltantes = {tabla: sorted(columnas - presentes.get(tabla, set()))
                         for tabla, columnas in REQUERIDAS.items() if columnas - presentes.get(tabla, set())}
            return {"conexion_sql_probada": True, "columnas_requeridas_presentes": not faltantes,
                    "columnas_faltantes": faltantes,
                    "limite": "Solo presencia de nombres; revisar tipos, restricciones, permisos y concurrencia por separado."}
    except Exception:
        return {"conexion_sql_probada": False, "columnas_requeridas_presentes": False,
                "mensaje": "No se pudo verificar DataCoreAI. Revisa SQL Server Express, ODBC 18, la base y los permisos de Windows."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sql", action="store_true", help="Abre DataCoreAI y consulta solo metadatos del esquema; no escribe datos.")
    args = parser.parse_args()
    resultado = revisar_entorno()
    correcto = resultado["python_313"] and all(resultado["paquetes"].values()) and resultado["odbc_driver_18"]
    if args.sql:
        resultado.update(revisar_columnas_sql())
        correcto = correcto and resultado["columnas_requeridas_presentes"]
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
    return 0 if correcto else 1


if __name__ == "__main__":
    raise SystemExit(main())
