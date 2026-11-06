---
name: datacore-python
description: "Implementar o revisar Python 3.13 en DataCore AI con arquitectura modular, validaciones de negocio y manejo de errores."
---

# Python de DataCore AI

1. Lee `README.md`, `ETAPA_3.md` y los módulos relacionados. Usa Python 3.13 y el entorno virtual del proyecto: `.venv/bin/python` en Linux o `.venv\Scripts\python.exe` en Windows.
2. Conserva la arquitectura: `app.py` compone navegación; `views/` contiene Streamlit; `database/connection.py` centraliza conexiones; `database/productos.py` y `database/ventas.py` implementan validaciones y operaciones de negocio. No introduzcas dependencias de Streamlit en la capa de datos.
3. Reutiliza `validar_producto`, `importe` y `preparar_carrito` antes de duplicar reglas. Valida también fuera de la UI y antes de abrir conexiones cuando sea posible. Normaliza código con strip/upper; respeta longitudes de SQL, cantidades enteras y límites. Rechaza bool como entero de negocio, importes no finitos, negativos y más de dos decimales. En ventas la cantidad debe ser positiva.
4. Usa `Decimal(str(valor))`, nunca float para dinero, y conserva precisión de `DECIMAL(12,2)`. No redondees silenciosamente entradas que las validaciones actuales rechazan.
5. Propaga `ValueError` con mensajes de negocio comprensibles. En límites de UI traduce fallos técnicos a mensajes seguros; no ocultes fallos como éxitos o listas vacías. Mantén rollback ante errores de escritura y cierre garantizado de conexiones con `contextlib.closing` o try/finally.
6. Prefiere funciones pequeñas, nombres coherentes en español, imports explícitos y tipos cuando aclaren contratos. Evita refactorizaciones ajenas a la tarea y nuevos frameworks. `requirements.txt` declara streamlit, pyodbc, pandas, plotly y streamlit-keyup con rangos; no hay lockfile. El adaptador Groq opcional está desactivado por defecto; revisa docs/GROQ.md.
7. No cargues `.env` implícitamente ni agregues secretos al código. Dashboard, Reportes y las operaciones comerciales piden DataCoreAI explícitamente. `DATACORE_DATABASE` solo afecta a conexiones sin base explícita. No presentes ese valor como un override de servidor o autenticación.

Valida con `DATACORE_TEST_SQL=0 .venv/bin/python -m unittest discover -s tests -v` en Linux; en PowerShell establece `$env:DATACORE_TEST_SQL="0"` y usa el ejecutable Windows. Añade regresiones de comportamiento cuando cambie lógica. Usa compileall solo como complemento, no como sustituto de pruebas. Informa resultados y dependencias pendientes.
