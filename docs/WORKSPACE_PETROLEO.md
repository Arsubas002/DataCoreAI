# DataCore AI: un espacio comercial nuevo

## Procedencia y revisión

Rama `design/petroleo-workspace`, derivada del head `deb6e47` de la PR #9
(`design/editorial-polish-v2`). Incluye por ascendencia la PR #8
(`release/integracion-final`, `e293dc3`). La PR de diseño tiene como base #8:
no duplica commits mediante cherry-pick ni modifica main. El CSS negro/dorado de
#9 queda sustituido; no se deben fusionar ambas propuestas visuales por separado.

Primero se implementó y comprobó visualmente el Dashboard en el checkpoint
`88fa1b3`, antes de reorganizar las otras cinco pantallas.
[Captura del prototipo](imagenes/petroleo/dashboard-prototipo.png).

## Composición y componentes

| Pantalla | Estructura nueva y tarea principal |
| --- | --- |
| Dashboard | Gráfico principal con ingreso integrado; selector Ingresos/Ventas; panel violeta de actividad y resumen de stock lateral; detalle de productos y cola de reposición debajo. Periodo en popover compacto. |
| Productos | Catálogo y filtro por categorías a la izquierda; editor de un registro a la derecha. Búsqueda inmediata y visibilidad de inactivos en popover. |
| Ventas | Preparación de cliente/producto frente al carrito; líneas editables en desplegables; cierre de venta con total destacado. Historial separado. |
| Inventario | Monitor con estados Todos/Con alerta/Agotados, franja de indicadores, reposición ordenada y pestaña de distribución por categoría. |
| Reportes | Configurador lateral con fechas apiladas y formato; vista previa y descargas por pestaña. No hay consultas al cambiar de formato. |
| Asistente IA | Estudio de cuatro preguntas guiadas frente al espacio de respuesta, evidencia y consentimiento Groq. Periodo plegable. |

La navegación agrupa Perspectiva, Operación comercial (desplegable) e Inteligencia.
Los botones conservan claves, etiquetas y estado de sesión. En móvil se apilan las
columnas y se usa la apertura/cierre nativo del menú. Las tablas conservan su
scroll propio: no se ocultan columnas ni se convierten registros en HTML.

Identidad: petróleo **#0D1726**, blanco frío **#F2F5FA**, violeta **#7659E8** y
turquesa **#24C9C0**. Tema nativo Streamlit, fuente sans serif local y gráficos
Plotly claros. El CSS complementa la estructura y usa exclusivamente clases
propias y contenedores `st-key-*`; no utiliza clases generadas ni selectores de
implementación de Streamlit. Los componentes interactivos son nativos salvo el
buscador `streamlit-keyup` ya existente. No se agregan dependencias ni JavaScript.
El HTML decorativo escapa los valores variables y no contiene controles de negocio.

Los ingresos permanecen en Decimal; solo se convierten a float para gráficos.
No se muestran tendencias ni porcentajes inventados. El gráfico de stock cuenta
productos actuales y distingue agotados, bajos y disponibles con etiquetas.

## Comparación y capturas

[Diseño anterior negro/ámbar](imagenes/premium/desktop-dashboard.png) ·
[Dashboard nuevo](imagenes/petroleo/desktop-dashboard.png).

Las doce capturas proceden de Chromium y de la aplicación Streamlit, con datos
ficticios inyectados mediante un lanzador temporal fuera del repositorio. No son
maquetas estáticas ni un modo de datos de prueba incorporado a producción.
Cada captura identifica expresamente los datos ficticios y la ausencia de
conexiones SQL/Groq. Escritorio: 1440 px; móvil: 390 px con menú plegado.

| Pantalla | Escritorio | Móvil |
| --- | --- | --- |
| Dashboard | [Ver](imagenes/petroleo/desktop-dashboard.png) | [Ver](imagenes/petroleo/movil-dashboard.png) |
| Productos | [Ver](imagenes/petroleo/desktop-productos.png) | [Ver](imagenes/petroleo/movil-productos.png) |
| Ventas | [Ver](imagenes/petroleo/desktop-ventas.png) | [Ver](imagenes/petroleo/movil-ventas.png) |
| Inventario | [Ver](imagenes/petroleo/desktop-inventario.png) | [Ver](imagenes/petroleo/movil-inventario.png) |
| Reportes | [Ver](imagenes/petroleo/desktop-reportes.png) | [Ver](imagenes/petroleo/movil-reportes.png) |
| Asistente IA | [Ver](imagenes/petroleo/desktop-asistente.png) | [Ver](imagenes/petroleo/movil-asistente.png) |

## Validación reproducible

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c constraints-tested.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe scripts/pruebas_aisladas.py
```

Python 3.13.17 en Linux: **90 descubiertas, 86 aprobadas, 4 SQL omitidas**;
0 errores, 0 fallos, 0 intentos SQL reales y 0 intentos HTTP reales.
Cuatro pruebas nuevas cubren cambio de serie sin alterar el ingreso, filtro por
categoría sin guardar, estados de inventario incluyendo igualdad al mínimo y
pregunta guiada con promedio vacío y envío explícito. Los casos heredados siguen
cubriendo concurrencia, carrito, UUID incierto, solo lectura, exportación,
privacidad/errores de Groq e integración entre pantallas.

Navegador: navegación por las seis pantallas sin excepciones; carrito ficticio
con confirmación bloqueada en solo lectura; consultas del asistente y generación
de reportes. Descargas CSV/Excel/PDF abiertas con csv/openpyxl/pypdf:
30 filas diarias, suma CSV/Excel **S/ 41,054.00**, PDF legible de 2 páginas.
Verificación adicional del Dashboard a 320, 390 y 768 px sin desbordamiento de
página. Inspección visual de las doce capturas: formularios, fechas, estados,
gráficos, tablas, jerarquía y apilado. No sustituye una prueba física en teléfono.

GitHub Actions conserva la matriz **Python 3.13 / Ubuntu y Windows**, las
protecciones contra accesos externos y el artefacto de resultados por plataforma.
El estado verificable del commit se publica en la PR de diseño.

## Seguridad y pendientes locales

No se modificaron `database/`, `services/`, scripts SQL ni esquema. No se usaron
credenciales reales, no se ejecutaron migraciones ni operaciones sobre datos
reales. Guardar, desactivar y confirmar siguen siendo acciones explícitas;
`DATACORE_READ_ONLY=1` las bloquea. Groq mantiene preguntas permitidas,
consentimiento por respuesta, contexto agregado, salida textual y ausencia de
herramientas, SQL generado o ejecución de instrucciones del modelo.

Pendiente en el equipo Windows: seguir [instalación](INSTALACION_WINDOWS.md) y
[aceptación local](PRUEBAS_LOCALES_V1.md), empezar en solo lectura y comprobar
ODBC/autenticación integrada, datos y periodos reales, volúmenes mayores y
exportaciones. Probar escrituras únicamente en una base de pruebas autorizada.
Groq real requiere una clave local segura y consentimiento informado; no fue
probado en esta entrega. Tampoco se afirma que SQL Server Windows real funcione.
Los controles y gráficos de gran volumen pueden necesitar paginación adicional;
se conservan los límites de exportación existentes.
