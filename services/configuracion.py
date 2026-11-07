"""Opciones del proceso, independientes de la interfaz y de SQL."""
import os


class ErrorSoloLectura(PermissionError):
    """Escritura bloqueada antes de abrir una conexión."""


def solo_lectura():
    # Solo un 0 explícito (o la ausencia histórica) permite escrituras.
    # Una configuración mal escrita nunca las habilita accidentalmente.
    return os.getenv("DATACORE_READ_ONLY", "0").strip() != "0"


def exigir_escritura():
    if solo_lectura():
        raise ErrorSoloLectura("Modo de solo lectura: no se permiten cambios en productos ni ventas.")
