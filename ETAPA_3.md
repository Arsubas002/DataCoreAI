# Etapa 3: ventas e inventario

La sección Ventas ahora permite elegir un cliente activo, agregar productos
activos, cambiar cantidades y eliminar líneas. Para sustituir un producto,
elimínalo y agrega su reemplazo. Subtotales y total se calculan con Decimal y
se muestran en soles peruanos. Solo Confirmar venta escribe en SQL Server.

## Preparación pendiente de revisión

Revisa `sql/03_solicitudes_ventas.sql`. Cuando autorices su ejecución, ábrelo
en SSMS conectado a `localhost\SQLEXPRESS`, con autenticación de Windows.
El script únicamente crea la tabla auxiliar `dbo.VentasSolicitudes` si falta.
No altera las tablas existentes ni inserta ventas o modifica existencias.
**No se ha ejecutado este script desde el desarrollo.** Hasta ejecutarlo,
el carrito y el historial pueden abrirse, pero la confirmación no funcionará.

Esta tabla guarda la clave UUID de cada confirmación, la huella del carrito
y el ID de la venta. Es necesaria para reconocer un reintento aunque el
COMMIT se haya aplicado y su respuesta no haya llegado a la aplicación.
No borres estas claves: perderías esa protección para solicitudes anteriores.

## Transacciones y concurrencia

`database/ventas.py` usa una conexión a DataCoreAI con autocommit desactivado.
La reserva de la clave, la cabecera, todos los detalles y los descuentos de
inventario se confirman con un único COMMIT. Cualquier error provoca ROLLBACK.
Los productos se bloquean con UPDLOCK y HOLDLOCK, en orden de ID. Se comprueban
otra vez el cliente activo, los productos activos, los precios y el stock.
El UPDATE de stock exige además que la cantidad disponible siga siendo suficiente.
Si un precio cambió, se rechaza la confirmación y se pide volver a agregarlo.

La clave persistente se consulta con bloqueo de rango antes de escribir.
Un reintento con el mismo contenido devuelve el ID de la venta original;
otro contenido con la misma clave se rechaza. No se deduplican ventas distintas
solo porque sus productos coincidan: cada venta nueva recibe otra clave.

La sesión conserva una copia del intento mientras su resultado sea incierto.
Usa Reintentar confirmación; el carrito queda bloqueado durante esa resolución.
No cierres la sesión ante un error de conexión: una sesión nueva no recupera
automáticamente el carrito ni la clave anterior. La pantalla muestra la clave
para poder verificarla en VentasSolicitudes si se pierde la sesión. Antes de
repetir manualmente una venta en otra sesión, verifica esa clave y el historial.

Inventario conserva su pantalla y consulta SQL Server nuevamente al abrirse
o pulsar Actualizar inventario. Las alertas se activan con stock <= mínimo.
El historial muestra fecha, cliente, productos, cantidades, subtotales y total.
Los precios vendidos quedan guardados en DetalleVentas; los nombres mostrados
son los nombres actuales del cliente y del producto.

Referencia de bloqueos:
[Microsoft: Table hints](https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table?view=sql-server-ver17).

## Pruebas sin cambios en SQL Server

```powershell
Set-Location E:\DataCoreAI
python -m compileall -q app.py database views tests
python -m unittest discover -s tests -v
```

Las pruebas de ventas utilizan un servidor simulado en memoria, con COMMIT,
ROLLBACK y pérdida de respuesta simulados. Las pruebas de interfaz sustituyen
las funciones de acceso a datos. No ejecutan ventas ni ajustes de stock reales.
Las pruebas optativas de listado real de la etapa anterior siguen desactivadas
por defecto; no es necesario activar DATACORE_TEST_SQL para probar ventas.
Los bloqueos SQL y la concurrencia entre conexiones reales aún requieren una
prueba de integración autorizada en una base de pruebas.

## Comprobación manual

Reinicia Streamlit desde la carpeta del proyecto:

```powershell
python -m streamlit run app.py
```

Sin escribir datos: abre Ventas, elige un cliente, agrega dos productos, cambia
cantidades y elimina uno. Comprueba los cálculos en S/. Intenta agregar más que
el stock: debe rechazarse. El carrito no reserva existencias hasta confirmar.

Solo cuando autorices ventas de prueba y hayas ejecutado el script 03:

1. Anota el stock de los productos elegidos en Inventario.
2. Confirma una venta y comprueba el ID que devuelve.
3. Revisa Historial y abre Inventario: el stock debe bajar exactamente lo vendido.
4. Recarga la pantalla: la venta confirmada no debe volver a registrarse.
5. Para otra venta legítima, pulsa Iniciar otra venta.

No se han realizado estos pasos que escriben datos durante el desarrollo.
Productos conserva todas sus funciones. No se agregan dependencias.
