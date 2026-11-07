"""Conexión con autenticación de Windows, sin usuarios ni contraseñas."""

import os


def obtener_conexion(base_datos: str | None = None):
    """Abre una conexión. Quien la utilice debe cerrarla con close()."""
    # La importación se hace aquí para poder abrir la interfaz sin pyodbc.
    import pyodbc

    controlador = "ODBC Driver 18 for SQL Server"
    if controlador not in pyodbc.drivers():
        raise RuntimeError(f"Instala Microsoft {controlador} para Windows.")

    # master ya existe en SQL Server: esta etapa no crea una base de datos.
    nombre_base = base_datos or os.getenv("DATACORE_DATABASE", "master")
    # Las llaves protegen nombres que contienen separadores ODBC.
    nombre_base = nombre_base.replace("}", "}}")
    cadena = (
        f"DRIVER={{{controlador}}};"
        r"SERVER=localhost\SQLEXPRESS;"
        f"DATABASE={{{nombre_base}}};"
        "Trusted_Connection=yes;"
        "Encrypt=yes;"
        "TrustServerCertificate=yes;"
    )
    # Confiar en el certificado se limita a este entorno local de desarrollo.
    conexion = pyodbc.connect(cadena, timeout=5)
    try:
        # El timeout de login no limita los SELECT ni los bloqueos de consultas.
        conexion.timeout = 15
    except Exception:
        conexion.close()
        raise
    return conexion


def probar_conexion() -> tuple[bool, str]:
    """Abre y cierra una conexión sin ejecutar consultas ni modificar datos."""
    try:
        conexion = obtener_conexion()
        conexion.close()
    except ImportError:
        return False, "Falta pyodbc. Instala las dependencias indicadas en el README."
    except RuntimeError as error:
        return False, str(error)
    except Exception:
        # No se muestran cadenas de conexión ni detalles internos al usuario.
        return False, (
            r"No se pudo conectar. Revisa que SQL Server (SQLEXPRESS) esté iniciado, "
            "que la base configurada exista y que tu usuario de Windows tenga acceso."
        )
    return True, "Conexión correcta con SQL Server mediante autenticación de Windows."
