# Reglas de trabajo para DataCore AI

## Contexto y alcance

Lee primero el inicio rápido de `README.md`, `ETAPA_3.md`, `requirements.txt` y los módulos afectados; las secciones históricas del README no sustituyen el estado actual. La aplicación Windows usa Python 3.13, Streamlit, pyodbc, Pandas, Plotly y streamlit-keyup. La PWA está en `pwa/`; el backend de lectura FastAPI separado tiene dependencias en `backend/requirements.txt`. Consulta requirements.txt para los motores de exportación de Streamlit.

Trabaja en el checkout existente y conserva cambios del usuario. No crees worktrees salvo solicitud explícita. Mantén los cambios limitados a la tarea; no publiques, mezcles ramas o despliegues sin autorización aplicable.

## Arquitectura y datos

`app.py` gestiona navegación, `views/` presenta la UI, `database/` valida y accede a SQL, `sql/` contiene scripts manuales y `tests/` contiene unittest y AppTest. Conserva las reglas de Decimal, concurrencia con ROWVERSION, transacciones de venta e idempotencia documentadas. Mantén consultas parametrizadas, cierre de conexiones y errores de usuario sin detalles internos.

No ejecutes scripts SQL, alteres esquema, cargues ejemplos o escribas ventas/datos sin autorización aplicable. No incluyas credenciales, archivos privados, datos personales, entornos virtuales ni exportaciones en Git. No imprimas secretos ni desactives comprobaciones TLS para resolver el entorno. La autenticación existente es integrada de Windows y no requiere claves API.

Para la consolidación PWA, los tres scripts SQL son la fuente original confirmada. Consulta `docs/SQL_ORIGINAL.md`: 20 productos, 10 clientes de prueba, 4 categorías; sin historial de ventas ni PK numéricas recuperadas. No mezcles silenciosamente fuentes PWA/iOS históricas ni sustituyas datos ausentes por cero. La API privada conserva autenticación integrada SQL y añade JWT RS256/scopes en HTTP. La demo no tiene una sesión SQL autenticada. No expongas el equipo local para conectar Vercel.

La instancia está fijada a `localhost\SQLEXPRESS` con ODBC Driver 18. Todos los análisis y operaciones comerciales usan DataCoreAI explícitamente; DATACORE_DATABASE solo afecta a conexiones sin base explícita. Linux permite UI y pruebas aisladas, pero no demuestra acceso a SQL Server Windows. No cambies conexión o autenticación como parte de una tarea documental.

## Skills del proyecto

Selecciona y lee las instrucciones pertinentes antes de trabajar; combínalas cuando una tarea atraviese capas:

- [datacore-ui](.agents/skills/datacore-ui/SKILL.md): Streamlit, navegación, formularios, gráficos y coherencia visual.
- [datacore-python](.agents/skills/datacore-python/SKILL.md): Python 3.13, arquitectura, validaciones y errores.
- [datacore-sql](.agents/skills/datacore-sql/SKILL.md): SQL Server, transacciones, inventario y ventas.
- [datacore-testing](.agents/skills/datacore-testing/SKILL.md): unittest, simulaciones, AppTest e integración optativa.
- [datacore-reports](.agents/skills/datacore-reports/SKILL.md): indicadores y futuras exportaciones Excel/PDF.

Estas Skills no implementan funcionalidades ni autorizan operaciones sobre datos por sí mismas. Consulta README.md y las pruebas para conocer las funciones implementadas; no presentes integración generativa como validada sin una prueba real autorizada.

## Validación y entrega

Usa el Python 3.13 de `.venv`. En Linux ejecuta `DATACORE_TEST_SQL=0 .venv/bin/python -m unittest discover -s tests -v`; en PowerShell establece `$env:DATACORE_TEST_SQL="0"` y usa `.\.venv\Scripts\python.exe -m unittest discover -s tests -v`. Las pruebas SQL reales son optativas y requieren acceso, datos y autorización aplicables. No las actives para validar documentación.

Para cambios documentales verifica front matter, nombres/rutas y enlaces de las Skills y `git diff --check`. Para lógica o UI ejecuta las pruebas pertinentes y agrega regresiones útiles. Reporta qué ejecutaste, resultados, omisiones y límites; no confundas simulaciones con integración real. Revisa el diff antes del commit y describe en la solicitud de incorporación el alcance y la validación. `.gitignore` excluye `.agents/`: agrega explícitamente solo los cinco SKILL.md públicos, nunca toda la carpeta ignorada.
