# Informe final de integración

## Revisión visual posterior

La propuesta actual `design/petroleo-workspace` incluye #8 y #9 y sustituye el
diseño negro/ámbar por una estructura comercial nueva. No está fusionada a main.
Validación local: 90 pruebas, 86 aprobadas y 4 SQL omitidas, sin accesos reales.
Consulta [composiciones, capturas y límites](WORKSPACE_PETROLEO.md).
El informe que sigue conserva el historial de integración de #8.

## Resultado y procedencia

Rama candidata: `release/integracion-final`, creada directamente desde el head
`a868087cd49bf589c44b046425ceddb24c17f9c3` de la PR #7. La integración se presenta
en una única PR nueva contra main; no se copia ni se hace cherry-pick de los
commits anteriores. Las PR #1–#7 permanecen como historial, sin cierres ni
fusiones automáticas. No deben fusionarse además para instalar esta candidata.

| PR revisada | Dependencia | Head incluido |
| --- | --- | --- |
| #1 | main; reglas y Skills | c33a373 |
| #2 | main; dashboard | aca8af9 |
| #3 | #2; reportes CSV | 239f8f0 |
| #4 | #3; asistente guiado | 5dd404d |
| #5 | #4 y merge local de #1 | bf4a7c9 |
| #6 | #5; Excel/PDF | f0a0590 |
| #7 | #6; Groq opcional | a868087 |

Se revisaron las conversaciones/reviews de las siete PR. Solo #4 tenía una
review: pide preservar dependencias, separar modo guiado/generativo y comprobar
Windows/SQL. La cadena está conservada y la documentación distingue esas pruebas.
La comprobación de SQL Server Windows real permanece pendiente. Main conserva
`aec82f3349af5d4839f95d910ebb6f60290c8213` en la revisión de esta entrega.

## Funcionalidades implementadas

| Área | Comportamiento |
| --- | --- |
| Dashboard | Periodo inclusivo, ingresos, ventas, unidades actuales, alertas y dos gráficos con tablas de evidencia |
| Productos | Catálogo, búsqueda literal, edición concurrente con ROWVERSION y desactivación lógica; escrituras explícitas |
| Ventas | Carrito por sesión, Decimal, transacción e idempotencia UUID, recuperación de respuesta incierta e historial paginado |
| Inventario | Consulta de activos, filtros y alertas por stock menor o igual al mínimo |
| Reportes | CSV UTF-8, Excel tipado y PDF paginado en memoria, con filtros, hora, alcance y límites |
| Asistente | Cuatro preguntas permitidas, cálculos verificables, fuente/periodo y explicación Groq opcional |
| Seguridad de revisión | DATACORE_READ_ONLY=1 bloquea las tres escrituras de negocio antes de conectar y deshabilita sus botones |
| Interfaz | Tema oscuro, tarjetas, filtros y tablas con encabezados españoles, formatos monetarios, gráficos ámbar y adaptación a anchuras pequeñas |
| Diagnóstico | Sin conexión por defecto; --sql opcional consulta solo nombres del esquema, sin filas comerciales ni escrituras |

El modo de solo lectura conserva una confirmación incierta y su clave sin
reintentar. No cambia permisos SQL y no reemplaza una identidad de mínimos
privilegios. Las escrituras históricas siguen disponibles cuando ese modo no
está habilitado; el inicio recomendado de Windows lo establece expresamente.

La revisión inicial del commit 303cc95 tuvo 68 pruebas (64 aprobadas y 4 omitidas).
La auditoría posterior y los nuevos casos están en [AUDITORIA_V1.md](AUDITORIA_V1.md).
La [lista de aceptación local](PRUEBAS_LOCALES_V1.md) sigue pendiente en tu equipo.

## Correcciones de esta revisión

- Sustituye la consulta inicial del Dashboard en las pruebas de Ventas: ya no
  pueden intentar conectar a una instancia local al arrancar en Windows.
- El ejecutor de pruebas bloquea y cuenta conexiones SQL y HTTP reales,
  incluso si una vista capturara la excepción. Falla si descubre cero pruebas.
- Rechaza estructuras Groq malformadas (choices/message nulos o de tipo erróneo)
  como errores seguros. No hay herramientas, SQL generado ni ejecución del texto.
- Amplía neutralización CSV para BOM y controles invisibles en texto.
- Formatos y encabezados compartidos sin convertir el dinero de evidencia a float.
- Arranque Streamlit limitado a 127.0.0.1, estadísticas de uso desactivadas.

## Pruebas y reproducción

Suite de partida #7: 59 descubiertas, 55 aprobadas, 4 SQL omitidas.
Suite de estabilización local: **86 descubiertas, 82 aprobadas, 4 SQL omitidas, 0 fallos,
0 errores, 0 intentos SQL real y 0 intentos HTTP real**, Python 3.13.17/Linux.

```powershell
.\.venv\Scripts\python.exe -m pip install -c constraints-tested.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe scripts/pruebas_aisladas.py
.\.venv\Scripts\python.exe -m compileall -q app.py database services views scripts tests
git diff --check
```

En Linux sustituye el ejecutable por `.venv/bin/python`. La suite genera
`test-results/resultado.json`, no versionado. Incluye regresiones de las seis
rutas en una sesión, carrito y resultados persistentes, tres exportaciones,
modo lector, clave incierta, lectura de metadatos, exclusión de credenciales,
JSON de Groq, redondeo y errores; conserva pruebas existentes de ventas/rollback.
Además, Chromium/Playwright recorrió las seis rutas, descargó los tres formatos
y se reabrieron los archivos descargados con cifras sintéticas verificadas.
Se inspeccionó el diseño a 1440 px y entradas a 320/390/768 px sin desbordamiento
horizontal global; véanse las [capturas](VALIDACION_VISUAL.md).
Los archivos Excel/PDF se reabren con openpyxl y pypdf, verificando contenido,
precisión, acentos, fórmulas/enlaces, paginación y límites. CSV se reabre con csv.

`constraints-tested.txt` fija las versiones instaladas en la validación; los
rangos de requirements conservan el catálogo de dependencias. Constraints no
instala paquetes adicionales por sí solo; pueden existir dependencias exclusivas
de plataforma que resuelva pip. CI valida la instalación en Linux y Windows.
`pip check`, compileall y git diff --check completados localmente.

GitHub Actions ejecuta la misma suite en `ubuntu-latest` y `windows-latest` con
Python 3.13, sin SQL real, sin Groq real ni secretos. Publica un artefacto JSON
por sistema. Revisa los checks de la PR final para el estado de la ejecución de
cada commit; la CI Windows solo valida código/archivos/UI con mocks.

## Groq y credenciales

Desactivado por defecto; clave solo por entorno y ausente del repositorio/UI.
Únicamente acepta cuatro preguntas fijas y evidencia numérica agregada; excluye
nombres, códigos, clientes y texto libre. Requiere acción de envío explícita,
renovada al consultar otra vez. Endpoint fijo HTTPS, timeouts, límites de
respuesta, sin redirecciones ni reintentos. Salida en texto plano, sin ejecutar
HTML, enlaces, funciones ni SQL. Errores no exponen respuestas privadas ni clave.
El fallo del proveedor no elimina la respuesta verificada. Véase [GROQ.md](GROQ.md).

No se llamó a Groq real ni se configuraron credenciales durante esta entrega.
Los tests HTTP son simulados y no garantizan disponibilidad, calidad o cuota del
modelo real. El acceso SQL de la aplicación conserva los permisos de su usuario
Windows; el modelo no tiene acceso a esa conexión.

## Límites y prueba real pendiente

- SQL Server Express/ODBC/autenticación Windows real: no probados aquí. Usar la
  [guía de Windows](INSTALACION_WINDOWS.md) en una instancia aislada de pruebas.
- Concurrencia, bloqueos SQL e identidad SELECT de mínimos permisos: pendientes
  de integración autorizada, sin usar producción. Las consultas analíticas
  separadas no garantizan una instantánea transaccional.
- Inventario actual, sin historial de movimientos; nombres actuales de productos
  y clientes; sin costos para calcular utilidades ni predicciones.
- Excel: 5.000 filas; PDF: 2.000; 10 MiB por archivo; precisión Excel acotada.
  Fuentes PDF probadas en español, no todos los alfabetos. CSV hasta 100.000 filas/10 MiB.
- No es despliegue de producción: no hay autenticación web multiusuario. TLS SQL
  local confía en el certificado del servidor y requiere revisión fuera de local.
- Las cuatro pruebas SQL optativas dependen de ejemplos y no se ejecutan en CI.
  No cargues datos ni hagas escrituras reales para hacerlas pasar.

No se modificaron ni eliminaron datos reales. No se ejecutaron scripts SQL,
migraciones, cambios de permisos, despliegues ni fusiones a main.

## Actualización visual

La misma PR incorpora el [diseño premium grafito/ámbar](DISENO_PREMIUM.md),
con navegación por botones e iconos, paneles equilibrados y KPIs adaptables.
No modifica SQL ni servicios de negocio. Los indicadores proceden de las consultas
existentes; no se presentan crecimientos sin comparación de periodos.
