# API de lectura de la base original

Estado: arquitectura implementada y probada con conexiones simuladas. **No se ha conectado al SQL Server original desde la nube.** Este entorno Linux no tiene ODBC Driver 18 ni acceso a la instancia Windows. No se crean bases, migraciones, usuarios ni registros. El módulo Streamlit existente permanece separado y sin cambios.

## Arquitectura

```text
PWA pública → /api/data (Vercel) → API autenticada → DataCoreAI original
                                    RS256 + scopes   ODBC 18 / Windows
```

La PWA publicada conserva un origen explícito `sql-script-fixtures`: solo los registros de prueba verificables de los scripts originales. No cambia automáticamente a una supuesta conexión en vivo. El puente de Vercel no tiene configurado `DATACORE_API_ORIGIN`, y el cliente aún no incorpora inicio de sesión ni carga de datos autenticados. Una comprobación anónima devuelve 401; no prueba acceso SQL.

Si la base está únicamente en el equipo local, ejecuta la API en loopback. **No expongas SQL Server, el equipo ni esta API a Internet para completar la demo.** La conexión futura de Vercel requiere un backend accesible de forma autorizada, TLS válido y un proveedor de identidad; no se habilitó ningún túnel.

## Ejecutar localmente en Windows

Desde la raíz, con Python 3.13:

```powershell
py -3.13 -m venv .venv-api
.\.venv-api\Scripts\python.exe -m pip install -c backend/constraints-tested.txt -r backend/requirements.txt
.\.venv-api\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8091 --no-access-log
```

`.venv-api/` debe permanecer fuera de Git. También puedes utilizar un entorno virtual fuera del checkout. El proceso no carga archivos `.env` automáticamente. La conexión exige ODBC Driver 18, autenticación integrada y una identidad Windows con permisos SELECT sobre las seis tablas originales, sin permisos de escritura. El backend no asigna permisos por su cuenta.

| Variable del servidor | Función |
| --- | --- |
| `DATACORE_SQL_SERVER` | Instancia original; predeterminado `localhost\SQLEXPRESS`. Base fijada a `DataCoreAI`. |
| `DATACORE_JWT_ISSUER` | Emisor autorizado, comprobado literalmente. |
| `DATACORE_JWT_AUDIENCE` | Audiencia de esta API. |
| `DATACORE_JWT_PUBLIC_KEY_FILE` | Archivo externo con la clave **pública** RS256 del proveedor de identidad. |
| `DATACORE_API_ORIGIN` | Solo en Vercel, para un futuro backend HTTPS autorizado; URL raíz sin credenciales ni parámetros. |

La API verifica tokens, no los emite. No contiene una clave privada, sesión predeterminada ni usuario administrador. Sin configuración de autenticación responde 503 a un Bearer; sin Bearer responde 401. Exige firma RS256, `iss`, `aud`, `sub`, `iat`, `exp` y vigencia máxima de una hora. El proveedor debe asignar scopes por rol, por ejemplo catálogo (`products:read`), inventario (`inventory:read`), comercial (`sales:read reports:read`) o clientes (`customers:read`). No concedas todos los scopes a la demo pública.

TLS ODBC permanece en `Encrypt=yes;TrustServerCertificate=no`. Si el certificado local no es confiable o su nombre no coincide, configura el certificado y su confianza en el servidor/equipo correspondiente; no desactives TLS para superar la validación.

## Contrato

Todas las rutas `/api/` requieren `Authorization: Bearer <token emitido por tu IdP>`. El token no se guarda en localStorage, código fuente ni configuración pública.

| Ruta | Scope | Parámetros / respuesta |
| --- | --- | --- |
| `GET /api/products` | `products:read` | `q`, `category_id`, `limit`, `offset`; PK originales, precio decimal, categoría. |
| `GET /api/categories` | `products:read` | Categorías originales. |
| `GET /api/customers` | `customers:read` | `q`, `limit`, `offset`; contactos solo para usuarios autorizados. |
| `GET /api/inventory` | `inventory:read` | `q`, `low_only`, `limit`, `offset`; stock de productos activos. |
| `GET /api/sales` | `sales:read` | `start`, `end`, `limit`, `offset`; cabeceras y ClienteID originales. |
| `GET /api/reports` | `reports:read` | `start`, `end`, `product_id`, `category_id`; filas por día, pedido y producto, métricas conciliadas. |
| `GET /api/source/status` | `source:read` | Comprueba presencia de columnas de las seis tablas; **no certifica tipos, FK ni restricciones reales**. |
| `POST /api/assistant` | `assistant:read` | Pregunta abierta, hasta 2.000 caracteres. Inventario requiere además `inventory:read`. Consulta determinista identificada, sin modelo conectado. |
| `GET /health` | Ninguno | Solo vida del proceso; siempre `databaseVerified:false`. |

El puente público `GET /api/data?resource=products|categories|customers|inventory|sales|reports|status` acepta únicamente los parámetros permitidos y reenvía el Bearer del solicitante al origen fijo. No proporciona un token de servicio ni un puente de escritura. El POST del asistente existe solo en el backend privado; `/api/assistant` en Vercel sigue desactivado (503). El chat público consulta localmente los fixtures identificados.

Fechas ISO inclusivas, sin zona, como `DATETIME2` original. La consulta usa `[start 00:00, end + 1 día 00:00)`; diferencia máxima 366 días. Paginación: máximo 200 filas y offset 10.000. Búsqueda: 200 caracteres. Los reportes fallan explícitamente por encima de 10.000 grupos y no devuelven un informe parcial.

Los importes se conservan como Decimal y se serializan como cadenas de dos decimales. Ingresos proviene de `SUM(DetalleVentas.Subtotal)`; pedidos cuenta VentaID distintos dentro del filtro. No se duplica `Ventas.Total` al unir detalles, ni se usan precios actuales para reconstruir ventas históricas. No hay filtros de sucursal porque no existe esa entidad en el esquema.

## Límites operativos y seguridad

- Solo SELECT, parámetros ODBC separados, sin SQL construido desde preguntas. No se ejecutan scripts ni operaciones de venta.
- Cuatro lecturas concurrentes por proceso; conexión 5 s, consulta 10 s, espera de bloqueo 5 s. Cada lectura cierra cursor/conexión y revierte la transacción de lectura.
- Puente HTTPS: 8 s, sin redirecciones y respuesta JSON de hasta 1 MiB. Errores internos y del driver no se devuelven al usuario.
- Respuestas `no-store`, sin CORS abierto ni documentación de API pública. API excluida del service worker. Sin caché de datos privados.
- El atributo ODBC de solo lectura complementa, pero no sustituye, los permisos SELECT de la identidad Windows.

## Validar sin una base real

```sh
python -m pip install -c backend/constraints-tested.txt -r backend/requirements-dev.txt
python -m unittest discover -s backend/tests -v
python scripts/sql_original.py --check-public
```

Las claves RSA de pruebas se generan en memoria, no son credenciales persistentes. Las pruebas usan SQL simulado y no demuestran conectividad, permisos, certificados, claves físicas o integridad de una instancia real. La validación real debe realizarse posteriormente en el entorno autorizado, solo con lecturas y comprobando la base existente, sin volver a ejecutar scripts de creación o semillas.
