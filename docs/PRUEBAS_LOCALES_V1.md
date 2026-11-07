# Plan de aceptación local para DataCore AI v1.0

Todas estas comprobaciones están **pendientes en tu computadora**. La CI de
Windows no instala SQL Server Express y las pruebas HTTP no llaman a Groq real.
No convertir esta lista en una afirmación de validación hasta guardar evidencia.

## Preparación y evidencia

Usa una máquina/instancia de pruebas identificada, con base DataCoreAI que contenga
solo registros ficticios. No uses producción ni copias con datos personales.
Sigue [INSTALACION_WINDOWS.md](INSTALACION_WINDOWS.md); confirma el commit de la
PR #8 con `git rev-parse HEAD`. No hace falta fusionar main para probar la rama.

Registra por caso: commit, versión Python/ODBC/SQL, modo del proceso, resultado,
mensaje esperado y captura sin credenciales. Guarda la evidencia localmente;
no publiques exportaciones comerciales ni información personal en GitHub.
No imprimas el entorno ni cadenas de conexión. Usa `[ ]` hasta verificar.

## A. Inspección inicial sin escrituras

En PowerShell, antes de arrancar:

```powershell
$env:DATACORE_READ_ONLY = '1'
$env:DATACORE_GROQ_ENABLED = '0'
.\.venv\Scripts\python.exe scripts/pruebas_aisladas.py
.\.venv\Scripts\python.exe scripts/diagnostico.py
```

La suite usa mocks y no valida tu SQL. El diagnóstico sin --sql no conecta.
Después de identificar la instancia de pruebas, ejecuta:

```powershell
.\.venv\Scripts\python.exe scripts/diagnostico.py --sql
.\.venv\Scripts\python.exe -m streamlit run app.py
```

| Caso pendiente | Acción | Resultado y evidencia esperados |
| --- | --- | --- |
| [ ] A01 · Entorno | Instalar con constraints y ejecutar suite | Cero fallos, cuatro SQL omitidas, cero intentos SQL/HTTP reales en JSON |
| [ ] A02 · Driver y esquema | Diagnóstico sin SQL, después --sql | ODBC 18 presente; conexión y nombres verificados; no supone compatibilidad de tipos |
| [ ] A03 · Esquema real | Revisar tipos/PK/FK/UNIQUE/CHECK y ROWVERSION en SSMS | Compatibles con scripts; no alterar tablas para forzar la comprobación |
| [ ] A04 · Dashboard | Intervalos de un día, varios días, sin ventas e invertido | Totales de cabecera, exclusión del día posterior y aviso antes de consulta para rango invertido |
| [ ] A05 · Productos | Buscar código/nombre, %, _, comillas; activos/inactivos | Búsqueda literal; Guardar y Desactivar deshabilitados |
| [ ] A06 · Editor | Seleccionar, cambiar borrador y pulsar Recargar | Campos y versión recargados; cambios sin guardar descartados |
| [ ] A07 · Ventas | Agregar/editar/eliminar carrito, navegar y volver | Total exacto, carrito conservado y Confirmar deshabilitado; stock sin cambios |
| [ ] A08 · Historial | Recorrer páginas 1/2 y una vacía | Hasta 100 cabeceras por página, orden Fecha/ID descendente, todos los detalles de cada venta |
| [ ] A09 · Inventario | Filtrar alertas, stock 0 y stock igual al mínimo | Agotado/stock bajo; sin escrituras; cifras actuales |
| [ ] A10 · CSV/Excel/PDF | Generar mismo periodo y abrir tres formatos | Misma evidencia, filtros y generación; acentos, fórmulas como texto, códigos y dinero correctos |
| [ ] A11 · Casos de exportación | Vacío, nombres con líneas, fechas anteriores a 1900 y conjuntos grandes | PDF paginado sin pérdida; Excel fecha antigua ISO; rechazo explícito de límites, no truncamiento |
| [ ] A12 · Asistente | Cuatro preguntas con/sin ventas y alertas | Cifras verificables; promedio indefinido sin ventas; Groq desactivado |
| [ ] A13 · Interfaz | Navegar, usar teclado, zoom 200% y anchuras 320/390/768/1440 | Etiquetas legibles, foco usable, tablas con scroll interno, acciones sin solaparse |
| [ ] A14 · Fallo de lectura | Usar una instancia de pruebas no disponible | Mensajes seguros; no falsos ceros; se retiran reportes/respuestas anteriores al fallar una nueva generación |
| [ ] A15 · Tiempo de consulta | Revisar con DBA un SELECT bloqueado controlado en pruebas | Timeout de consulta 15 s aplicado por ODBC; login separado 5 s; no exponer detalles internos |

Para A08 necesitas más de 100 ventas ficticias ya preparadas mediante un plan
separado y autorizado. La interfaz no crea ventas para llenar páginas. El tamaño
de página limita cabeceras, no el número de líneas de una venta.

Límites por archivo: CSV 100.000 filas; Excel 5.000; PDF 2.000; todos 10 MiB.
Los reportes no son una instantánea transaccional: bajo ventas concurrentes las
consultas pueden observar momentos diferentes. No asumir conciliación de auditoría.

## B. Operaciones de negocio: solo en base ficticia y tras autorización aparte

No desactives el modo lector para completar A. Esta sección requiere acordar
antes un destino de pruebas, estado inicial, permisos y plan de verificación.
No incluye instrucciones para escribir en datos reales ni automatiza ventas.
No cambiar modo de proceso durante una confirmación incierta.

| Caso pendiente | Condición de la prueba autorizada | Comprobación |
| --- | --- | --- |
| [ ] B01 · Producto | Alta/edición/desactivación ficticias | Validaciones, Decimal, código único y desactivación lógica |
| [ ] B02 · Concurrencia | Dos sesiones abren la misma versión | Primera guarda; segunda recibe conflicto; Recargar actualiza campos y versión |
| [ ] B03 · Nueva venta | Cliente/productos ficticios, stock conocido | Cabecera, detalles, UUID y stock se confirman juntos una sola vez |
| [ ] B04 · Error transaccional | Fallo controlado de detalle o precio/stock modificado | Rollback total; no escrituras parciales; mensajes comprensibles |
| [ ] B05 · Resultado incierto | Simulación controlada de respuesta perdida al COMMIT | Conservar UUID/contenido; mismo reintento devuelve la venta original sin descontar otra vez |
| [ ] B06 · UUID conflictivo | Misma clave con contenido diferente | Rechazo; no modifica la venta previa; claves distintas permiten ventas legítimas iguales |
| [ ] B07 · Bloqueo | Conexiones separadas y carga ficticia coordinada | Verificar orden de locks, timeout y atomicidad; los mocks no los prueban |

No provoques cortes aleatorios en una venta real. No borres VentasSolicitudes
ni repitas manualmente una venta incierta en otra sesión. Antes de repetir,
reconcilia el UUID y el historial en el entorno autorizado.

## C. Groq: separado, opcional y solo con agregados ficticios

Esta entrega no usó credenciales reales. En una prueba futura autorizada,
configúralas fuera del código según [GROQ.md](GROQ.md). Conserva modo lector y
revisa políticas/cuota/disponibilidad del modelo. Nunca adjuntes la clave ni
headers de autorización a la evidencia.

- [ ] C01: sin configuración o con clave ausente, modo guiado sigue disponible.
- [ ] C02: revisar JSON: solo pregunta fija y agregados; sin nombres/códigos/clientes.
- [ ] C03: no enviar hasta marcar autorización y pulsar el botón; solo una llamada.
- [ ] C04: comparar explicación con evidencia; no ejecutar instrucciones del texto.
- [ ] C05: al fallar proveedor/cuota/timeout, mensaje seguro y respuesta guiada intacta.
- [ ] C06: otra consulta renueva autorización; rerun/navegación no reenvían datos.
- [ ] C07: cerrar el proceso y retirar la credencial temporal al terminar.

## Criterio de revisión final

Revisar el diff de la PR #8 y sus checks; completar A en la máquina de pruebas.
B y C solo cuando estén autorizados y sean necesarios para aceptar esas funciones.
Anotar pendientes explícitos, sin convertir pruebas simuladas en evidencia de
integración real. Mantener main sin fusionar hasta autorización del propietario.
