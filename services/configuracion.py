"""Opciones del proceso, independientes de la interfaz y de SQL."""
import os


class ErrorSoloLectura(PermissionError):
    """Escritura bloqueada antes de abrir una conexión."""


def solo_lectura():
    return os.getenv("DATACORE_READ_ONLY", "0") == "1"


def exigir_escritura():
    if solo_lectura():
        raise ErrorSoloLectura("Modo de solo lectura: no se permiten cambios en productos ni ventas.")
