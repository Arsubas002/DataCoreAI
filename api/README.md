# FastAPI independiente · solo demo

Python 3.13; contratos [OpenAPI versionado](../contracts/openapi-v1.json).
No importa `database/`, `services/` ni Streamlit; no incluye drivers SQL, Groq o
credenciales. Sin despliegue. Producción se rechaza incluso con una variable mal
configurada: `DATACORE_API_MODE` solo admite `demo`.

Desde la raíz, Windows PowerShell:

```powershell
py -3.13 -m venv api/.venv
.\api\.venv\Scripts\python.exe -m pip install -c api/constraints-tested.txt -r api/requirements-dev.txt
.\api\.venv\Scripts\python.exe -m unittest discover -s api/tests -v
.\api\.venv\Scripts\python.exe scripts/check_api_contract.py
.\api\.venv\Scripts\python.exe -m uvicorn api.datacore_api.main:app --host 127.0.0.1 --port 8100 --no-access-log --no-proxy-headers
```

En Linux/macOS usa `python3.13` y `api/.venv/bin/python` en vez de las rutas Windows.
No instales estos requisitos en el entorno de Streamlit. Para ejecutar solamente
la API basta `requirements.txt` con las mismas constraints. Abrir `/docs` permite
inspeccionar/probar las rutas; `/redoc` es otra vista del mismo contrato.

| Método / ruta | Contrato y comportamiento |
| --- | --- |
| GET /health | Estado demo, producción deshabilitada |
| GET /v1/snapshot | Fixture completo validado, coherente e inmutable |
| GET /v1/dashboard | Periodo inclusivo `start`, `end`; hasta 366 días; ingresos diarios incluyendo ceros |
| GET /v1/products | `q` literal de hasta 120 caracteres y categoría opcional |
| GET /v1/inventory | `state=all`, `low` (incluye igualdad al mínimo), `out` |
| GET /v1/sales | Historial ficticio filtrado por fechas |
| POST /v1/sales/preview | Líneas producto/cantidad; calcula con precios del catálogo, `persisted=false` |
| GET /v1/reports | Resumen filtrado y existencias actuales (no históricas) |
| POST /v1/assistant | `question`: revenue, average, top_products, stock_alerts; fechas; fuentes; generative=false |

Importes `*_minor`: enteros en céntimos PEN, nunca coma flotante; se rechazan
booleanos, strings numéricos, negativos y decimales. Fechas ISO `YYYY-MM-DD`.
Fixture fijo del 1–7/11/2026: S/ 1,347.70 en 7 ventas; no usa el reloj ni datos reales.
Las cantidades van de 1 a 999; se rechazan líneas duplicadas, productos inexistentes,
campos adicionales, precios del cliente, stock insuficiente y carritos >50 líneas.
No hay rutas de alta, borrado o confirmación de producción. La previsualización
no cambia ningún estado ni datos entre usuarios.

## Seguridad y límites

- **No es una autenticación de producción.** El único principal demo anónimo puede
  leer fixtures y solicitar previsualizaciones. Una credencial Bearer se rechaza;
  no se aceptan contraseñas, claves estáticas ni cabeceras que elijan empresa/usuario.
- Puerto de repositorio, `Principal` y scopes separan datos/autorización; sustituirlos
  por una implementación real exige diseño y validación posteriores. No se expone
  una API con datos reales bajo el argumento de que ya existe un check de scopes.
- Host permitido localhost/127.0.0.1/IPv6 loopback; `testserver` exclusivamente para
  TestClient. Sin CORS, sin confianza en X-Forwarded-For (`--no-proxy-headers`).
- Cuerpo real máximo 32 KiB incluso con transferencia fragmentada; respuesta móvil
  limitada a 2 MiB. La tasa local es 60 peticiones/minuto por IP de socket y tiene
  memoria acotada. No reemplaza un gateway distribuido ni protege una API pública.
- Errores no devuelven entradas sensibles, trazas, SQL o credenciales. Auditoría solo
  registra UUID aleatorio de petición, método, plantilla de ruta y estado. No cuerpos,
  query strings, IP, tokens o cabeceras. Inicia Uvicorn sin access log como arriba.
- `Cache-Control: no-store`, `nosniff`, `DENY`; documentación accesible porque solo
  contiene fixtures. No se añaden scripts externos a la app iOS. Swagger UI de
  desarrollo usa los recursos CDN estándar de FastAPI y requiere red en el navegador.
- No se cargan `.env`, no se configura TLS ni se abre el firewall. No desplegar esta
  demo como backend comercial. HTTPS para el iPhone requiere un entorno de pruebas
  autorizado y un certificado válido; ATS no se debilita para facilitar conexiones.

[Arquitectura](../docs/IOS_ARCHITECTURE.md) ·
[Informe de seguridad y privacidad](../docs/IOS_SECURITY_PRIVACY.md) ·
[Pruebas realmente ejecutadas](../docs/IOS_VALIDATION.md).
