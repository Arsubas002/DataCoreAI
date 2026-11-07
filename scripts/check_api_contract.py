"""Verifica el OpenAPI versionado sin HTTP, SQL ni importaciones de Streamlit."""

from pathlib import Path
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.datacore_api.main import create_app

ROOT = Path(__file__).resolve().parents[1]
expected = json.loads((ROOT / "contracts/openapi-v1.json").read_text(encoding="utf-8"))
actual = create_app().openapi()
if actual != expected:
    raise SystemExit(
        "OpenAPI cambió: revisa el contrato y regenera contracts/openapi-v1.json"
    )
print("OpenAPI generado coincide con el contrato versionado.")
