---
name: datacore-testing
description: "Probar DataCore AI con unittest, AppTest, simulaciones SQL, integración optativa y regresiones de productos, inventario y ventas."
---

# Pruebas de DataCore AI

1. Lee `tests/test_productos.py`, `tests/test_ventas.py`, `tests/test_ventas_interfaz.py` y `tests/test_listado_real.py`. El runner existente es unittest; no agregues pytest solo para ejecutar estas pruebas.
2. Ejecuta desde la raíz, con Python 3.13 y dependencias instaladas:
   - Linux: `DATACORE_TEST_SQL=0 .venv/bin/python -m unittest discover -s tests -v`.
   - PowerShell: `$env:DATACORE_TEST_SQL="0"` y `.\.venv\Scripts\python.exe -m unittest discover -s tests -v`.
   La referencia inicial contiene 29 pruebas: 25 aisladas y 4 optativas SQL; vuelve a contar en cada ejecución y reporta por separado aprobadas, fallidas y omitidas.
3. En productos usa unittest.mock para parchear la conexión donde se importa y comprobar parámetros, duplicados, normalización, Decimal, límites, versión concurrente, desactivación lógica, commit, rollback y cierre. No conectes al servidor en una prueba unitaria.
4. En ventas reutiliza ServidorSimulado, ConexionSimulada y CursorSimulado de `tests/test_ventas.py` cuando corresponda. Comprueba descuento exacto de stock, atomicidad ante fallo de detalle, clientes/productos inactivos, precio modificado, timeout y rowcount fallido. Incluye commit con respuesta perdida, mismo UUID y contenido, UUID con otro contenido y ventas legítimas iguales con claves distintas.
5. Para UI usa `streamlit.testing.v1.AppTest` y parchea funciones en `views.ventas` u otro módulo consumidor. Comprueba agregar/editar/eliminar, cantidad superior al stock, confirmación única tras rerun y reintento con contenido intacto. AppTest no simula teclas de st_keyup: sustituye su valor al probar búsqueda y declara ese límite.
6. `DATACORE_TEST_SQL=1` habilita cuatro pruebas de lectura real que esperan los códigos DEMO-001 a DEMO-020 y datos de ejemplo. Solo actívalo con acceso y autorización aplicables a la base identificada; no cargues datos ni ejecutes scripts para hacerlas pasar sin autorización. Pruebas reales de ventas o bloqueos requieren un diseño aparte en base de pruebas, no están cubiertas por esos cuatro SELECT.
7. Agrega regresiones que reproduzcan el fallo y verifiquen comportamiento observable, sin copiar la implementación ni reducir aserciones para obtener verde. En exportaciones futuras verifica contenido, totales, filtros y formato, no solo presencia de bytes.

Conserva el código de salida del runner al capturar logs; confirma descubrimiento y ejecución, nunca consideres válida una ejecución de cero tests. Distingue defectos de aplicación de prerrequisitos del entorno. No presentes pruebas simuladas como evidencia de SQL real; detalla comandos y omisiones.
