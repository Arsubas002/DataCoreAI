"""Adaptador opcional: envía únicamente evidencia agregada de preguntas permitidas.

No importa conexiones SQL ni funciones de escritura. No ejecuta salida del modelo.
"""
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
import json
import os
import re

import requests

from services.asistente import PREGUNTAS, responder

ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MAX_RESPUESTA = 6000
MAX_HTTP_BYTES = 64 * 1024


class ErrorGroq(RuntimeError):
    """Error seguro de configuración, transporte o respuesta."""


@dataclass(frozen=True)
class ConfiguracionGroq:
    api_key: str = field(repr=False)
    modelo: str = "llama-3.3-70b-versatile"


def configuracion_desde_entorno():
    """Opt-in de servidor; no carga .env ni muestra el valor de la clave."""
    if os.getenv("DATACORE_GROQ_ENABLED") != "1":
        return None
    clave = os.getenv("GROQ_API_KEY", "").strip()
    modelo = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    if not clave or any(c.isspace() for c in clave):
        raise ErrorGroq("Configura GROQ_API_KEY en el entorno seguro del servidor.")
    if not re.fullmatch(r"[A-Za-z0-9._/-]{1,100}", modelo):
        raise ErrorGroq("Configura un identificador de modelo válido en GROQ_MODEL.")
    return ConfiguracionGroq(clave, modelo)


def _entero(valor):
    if type(valor) is not int or not 0 <= valor <= 10**15:
        raise ErrorGroq("La evidencia contiene un recuento no válido.")
    return valor


def _dinero(valor):
    try:
        numero = Decimal(str(valor))
        if not numero.is_finite() or not 0 <= numero < Decimal("1e20") or numero != numero.quantize(Decimal("0.01")):
            raise ValueError
    except (InvalidOperation, ValueError):
        raise ErrorGroq("La evidencia contiene un importe no válido.") from None
    return format(numero, ".2f")


def evidencia_permitida(pregunta, datos):
    """Construye por lista permitida; excluye nombres, códigos, clientes y texto libre."""
    if pregunta not in PREGUNTAS:
        raise ErrorGroq("La pregunta no está permitida para el asistente generativo.")
    if pregunta in PREGUNTAS[:2]:
        evidencia = {"numero_ventas": _entero(datos["ventas"]["NumeroVentas"]),
                     "ingresos_pen": _dinero(datos["ventas"]["TotalVentas"])}
        if pregunta == PREGUNTAS[1]:
            evidencia["respuesta_verificada"] = responder(pregunta, datos)[0]
        return evidencia
    if pregunta == PREGUNTAS[2]:
        filas = datos["productos_vendidos"]
        if len(filas) > 8:
            raise ErrorGroq("El ranking supera los ocho productos permitidos.")
        return {"ranking_anonimo": [{"posicion": i, "unidades": _entero(fila["Unidades"]),
                                      "ingresos_pen": _dinero(fila["Ingresos"])}
                                     for i, fila in enumerate(filas, 1)],
                "limite": 8}
    bajos = [p for p in datos["inventario"] if _entero(p["Existencias"]) <= _entero(p["StockMinimo"])]
    return {"productos_activos": _entero(len(datos["inventario"])),
            "productos_con_alerta": _entero(len(bajos)),
            "productos_agotados": _entero(sum(p["Existencias"] == 0 for p in bajos)),
            "alcance": "Existencias actuales; no históricas"}


def explicar_con_groq(pregunta, datos):
    """Una petición HTTPS explícita. Sin herramientas, SQL, redirecciones ni reintentos."""
    configuracion = configuracion_desde_entorno()
    if configuracion is None:
        raise ErrorGroq("Groq está desactivado. El modo guiado sigue disponible.")
    evidencia = evidencia_permitida(pregunta, datos)
    cuerpo = {
        "model": configuracion.modelo, "temperature": 0, "max_tokens": 500,
        "messages": [
            {"role": "system", "content": (
                "Eres el asistente comercial de DataCore AI. Explica en español únicamente la evidencia JSON. "
                "No inventes cifras, causas, márgenes ni pronósticos. No solicites ni produzcas SQL, código, enlaces "
                "o instrucciones de escritura. No tienes herramientas. Si faltan datos, dilo. Moneda PEN (S/). "
                "Inventario actual; ranking limitado a ocho y anónimo. Resume en un máximo de 150 palabras. "
                "La evidencia verificada es la fuente de verdad; no atribuyas nombres a posiciones del ranking.")},
            {"role": "user", "content": json.dumps({"pregunta_permitida": pregunta, "evidencia": evidencia}, ensure_ascii=False)},
        ],
    }
    try:
        respuesta = requests.post(ENDPOINT, headers={"Authorization": f"Bearer {configuracion.api_key}"},
                                  json=cuerpo, timeout=(3.05, 15), allow_redirects=False, stream=True)
        try:
            if respuesta.status_code != 200:
                raise ErrorGroq("Groq no pudo completar la solicitud. Revisa la configuración, cuota o disponibilidad.")
            trozos = []
            tamano = 0
            for trozo in respuesta.iter_content(chunk_size=4096):
                tamano += len(trozo)
                if tamano > MAX_HTTP_BYTES:
                    raise ErrorGroq("Groq devolvió una respuesta demasiado grande.")
                trozos.append(trozo)
            contenido = json.loads(b"".join(trozos))
        finally:
            respuesta.close()
    except requests.RequestException:
        raise ErrorGroq("No fue posible comunicarse con Groq. La respuesta guiada sigue disponible.") from None
    except ValueError:
        raise ErrorGroq("Groq devolvió una respuesta no válida.") from None
    try:
        eleccion = contenido["choices"][0]
        if eleccion.get("finish_reason") != "stop":
            raise ValueError
        mensaje = eleccion["message"]
        texto = mensaje["content"]
        if mensaje.get("tool_calls") or mensaje.get("function_call") or not isinstance(texto, str) or not texto.strip() or len(texto) > MAX_RESPUESTA or configuracion.api_key in texto:
            raise ValueError
    except (KeyError, IndexError, TypeError, ValueError):
        raise ErrorGroq("Groq devolvió una respuesta no válida.") from None
    return texto.strip()
