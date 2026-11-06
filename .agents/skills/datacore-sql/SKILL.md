---
name: datacore-sql
description: "Revisar consultas y operaciones SQL Server Express de DataCore AI, especialmente transacciones, inventario, ventas e idempotencia."
---

# SQL de DataCore AI

1. Revisa `database/connection.py`, `database/productos.py`, `database/ventas.py`, `ETAPA_3.md` y los tres scripts de `sql/`. El destino actual es `localhost\SQLEXPRESS`, ODBC Driver 18, autenticación integrada de Windows. Linux permite pruebas simuladas, pero no equivale a disponer de esa instancia. No inventes credenciales ni desactives verificación TLS para resolver acceso.
2. Parametriza valores con `?` y parámetros separados de pyodbc. Nunca interpoles entradas en SQL. Para identificadores dinámicos usa una lista fija permitida. Conserva la búsqueda literal con CHARINDEX, incluidos %, _ y comillas.
3. Respeta el esquema real: Categorias, Productos, Clientes, Ventas, DetalleVentas y VentasSolicitudes en dbo. Conserva claves foráneas, códigos únicos, DECIMAL(12,2), stock no negativo y desactivación lógica. VersionFila es ROWVERSION para concurrencia, no una fecha; UPDATE y desactivación deben comprobar versión y rowcount.
4. En ventas conserva una sola transacción con autocommit desactivado: solicitud, cabecera, detalles y descuento de stock se confirman juntos. Cualquier fallo requiere rollback y cierre. Mantén XACT_ABORT, timeout de bloqueo y UPDLOCK/HOLDLOCK con productos ordenados por ID. Revalida cliente y productos activos, precios y existencias dentro de la transacción; el UPDATE también exige stock suficiente.
5. Preserva el UUID y la huella de VentasSolicitudes. Mismo UUID y contenido devuelve la venta previa; mismo UUID con otro contenido se rechaza. Una venta nueva usa otra clave. No borres solicitudes, no regeneres claves al reintentar y no deduzcas fallo de commit solo por pérdida de respuesta.
6. Inventario es de consulta: stock <= StockMinimo activa alerta y cero significa agotado. El carrito no reserva existencias. No introduzcas escrituras al consultar o exportar.
7. No ejecutes scripts SQL, migraciones, carga de ejemplos ni ventas de prueba sin autorización aplicable y destino de pruebas identificado. Los scripts contienen GO y se documentan para SSMS; no los envíes completos a cursor.execute. Una base existente requiere revisión de compatibilidad antes de cualquier cambio.

Comprueba consultas parametrizadas, rowcount, commit, rollback, cierre y reintentos mediante las simulaciones existentes. Los mocks no prueban bloqueos reales: para integración autorizada usa una base de pruebas y conexiones separadas, verifica atomicidad y concurrencia, y documenta cualquier limitación sin modificar datos de producción.
