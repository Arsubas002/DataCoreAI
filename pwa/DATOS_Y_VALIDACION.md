# Datos de prueba SQL · única fuente

Los scripts SQL existentes son la fuente confirmada por el usuario. Se usan sus registros de prueba, sin crear una base sustituta ni mezclarlos con productos/ventas PWA o iOS de otras versiones. Auditoría, hashes y seis tablas/cinco relaciones en [SQL_ORIGINAL.md](../docs/SQL_ORIGINAL.md).

`js/sql-fixtures.js` es generado por `scripts/sql_original.py`: 20 productos DEMO-001…020, 10 clientes DEMO-C001…010, 4 categorías, 336 unidades y mínimos de 5. El archivo permanece idéntico al generado desde SQL. La demo pública no contiene contactos, claves IDENTITY inventadas o una supuesta conexión al servidor.

Cifras conciliadas: 14 referencias por encima del mínimo, 5 bajas con existencias y 1 agotada. Las seis últimas forman la cola de reposición. Valor de catálogo: **S/ 7,350.50**, obtenido de existencias × precio con céntimos enteros. Tecnología: 54 unidades / S/ 3,103.00; Papelería: 150 / S/ 582.50; Hogar: 55 / S/ 1,643.00; Accesorios: 77 / S/ 2,022.00. Es valoración al precio de catálogo, no costo, ingresos o rentabilidad.

La cotización de Ventas calcula combinaciones elegidas durante la sesión con esos mismos precios y clientes. Valida cantidades, no guarda una venta y no modifica stock ni fixtures. Por ejemplo, 2 teclados de S/ 65 más 3 cuadernos de S/ 8.50 suman S/ 155.50. Su CSV se identifica como cotización de prueba, sin inventar VentaID, fecha histórica o transacción.

No hay filas de ventas en los scripts ni sucursales, costos, metas u horas. No se generan ingresos, tendencias o porcentajes históricos a partir de la cotización. Los gráficos representan el catálogo/inventario; el asistente local identifica sus límites y no se presenta como IA generativa.

El filtro de Reportes afecta métricas, gráficos, tabla y CSV. El PDF conserva la tabla filtrada; se comprobó su contenido con un lector independiente. Los contactos permanecen fuera de la demo pública. SQL, Streamlit y el backend de lectura existente no sufren modificaciones funcionales.

Pruebas ejecutadas, capturas y estado real de despliegue: [VALIDACION_PREPUBLICACION.md](VALIDACION_PREPUBLICACION.md).
