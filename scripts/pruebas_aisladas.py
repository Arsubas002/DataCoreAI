"""Ejecuta toda la suite y falla ante cualquier acceso real SQL/HTTP o cero tests."""
from contextlib import ExitStack
import json
import os
from pathlib import Path
import platform
import sys
import unittest
from unittest.mock import patch

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))


def main():
    os.environ["DATACORE_TEST_SQL"] = "0"
    os.environ["DATACORE_GROQ_ENABLED"] = "0"
    os.environ["DATACORE_READ_ONLY"] = "0"
    with ExitStack() as pila:
        sql = pila.enter_context(patch("pyodbc.connect", side_effect=AssertionError("Conexión SQL real bloqueada en pruebas aisladas.")))
        http = pila.enter_context(patch("requests.sessions.Session.send", side_effect=AssertionError("HTTP real bloqueado en pruebas aisladas.")))
        suite = unittest.defaultTestLoader.discover(str(RAIZ / "tests"))
        resultado = unittest.TextTestRunner(verbosity=2).run(suite)
    informe = {"python": platform.python_version(), "plataforma": platform.system(),
               "descubiertas": resultado.testsRun, "omitidas": len(resultado.skipped),
               "fallos": len(resultado.failures), "errores": len(resultado.errors),
               "intentos_sql_real": sql.call_count, "intentos_http_real": http.call_count}
    informe["aprobadas"] = informe["descubiertas"] - informe["omitidas"] - informe["fallos"] - informe["errores"]
    correcto = resultado.wasSuccessful() and resultado.testsRun > 0 and not sql.called and not http.called
    informe["correcto"] = correcto
    carpeta = RAIZ / "test-results"
    carpeta.mkdir(exist_ok=True)
    (carpeta / "resultado.json").write_text(json.dumps(informe, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(informe, ensure_ascii=False))
    return 0 if correcto else 1


if __name__ == "__main__":
    raise SystemExit(main())
