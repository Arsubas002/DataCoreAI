# Datos de esta versión · SQL original

Esta consolidación sustituye el origen mixto de las demos anteriores por la fuente que confirmó el usuario: **los tres scripts SQL originales**. La revisión histórica continúa accesible en Git; no se ejecutaron escrituras ni se eliminó una base.

La auditoría completa, hashes, tablas, claves y relaciones está en [docs/SQL_ORIGINAL.md](../docs/SQL_ORIGINAL.md). La demo lee `js/sql-fixtures.js`, generado por `scripts/sql_original.py`. Conserva 20 productos, 10 clientes ficticios, 4 categorías y 336 unidades, sin alterar los valores originales. Seis referencias necesitan reposición según el mínimo del script; una tiene cero unidades. Son cantidades de prueba sin fecha de captura, no inventario actual certificado.

El archivo público no incluye correos ni teléfonos. Codigo/Documento identifican registros; no se deducen IDENTITY físicos. No hay ventas en el origen recuperado, ni sucursales, costos, objetivos u horas. Los indicadores comerciales permanecen no disponibles. Ventas no muestra cero ingresos, fechas artificiales ni compras atribuidas a clientes.

Los productos y ventas PWA/iOS de versiones anteriores no se agregan al original SQL. Catálogo, directorio, búsqueda, comparación, inventario, gráficos, exportaciones y asistente consumen exclusivamente el mismo módulo de datos. El filtro de categoría en Reportes afecta las cantidades, gráficas, tabla y CSV. CSV protege fórmulas e incluye procedencia; PDF usa la impresión del sistema.

La API privada y el puente Vercel están preparados con validación y autenticación, sin una conexión real ni sesión autenticada en la demo. No existe un modelo generativo conectado. Las respuestas del chat se identifican como consultas locales deterministas y reconocen preguntas imposibles con el origen disponible.

Pruebas actuales y estado de despliegue: [VALIDACION_PREPUBLICACION.md](VALIDACION_PREPUBLICACION.md). Las verificaciones de generaciones anteriores no acreditan esta release. No se afirma validación SQL real, Safari físico ni HTTP público antes de ejecutarla.
