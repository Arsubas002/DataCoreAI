# Revisión de PR #1 y #2

Revisión sobre #1 c33a373 y #2 aca8af9. Ambas permanecen abiertas; no se fusionaron.

## PR #1: reglas y Skills

Los seis archivos son documentación; no cambian aplicación, SQL ni dependencias.
Los enlaces a las cinco Skills coinciden con los archivos incluidos. Las reglas
protegen Decimal, concurrencia, idempotencia y pruebas aisladas. No se encontraron
bloqueos funcionales en ese alcance documental.

Observación de mantenimiento: sus descripciones de Dashboard y Reportes reflejan
la etapa 3. Si se incorpora junto con desarrollos posteriores habrá que actualizar
esas afirmaciones. La restricción «Para esta entrega de Skills solo se añaden…»
corresponde a aquella entrega documental, no a una prohibición de desarrollar.

## PR #2: dashboard

Las consultas son SELECT parametrizados y no multiplican el total de cabecera
por cada detalle. Los ingresos por producto proceden del subtotal histórico.
El inventario mostrado es actual y se limita a productos activos.

Hallazgos atendidos en la PR de reportes, basada en #2:

- `fin=date.max` desbordaba al sumar un día. Ahora se rechaza antes de consultar.
- `SUM(Cantidad)` y `COUNT(*)` podían desbordar INT en conjuntos grandes.
  Se amplía la agregación de unidades a bigint y se usa COUNT_BIG.
- Faltaban pruebas de interfaz para distinguir cero, vacío y fallo.
- Faltaba aclarar reloj local SQL, nombres actuales y límite de ocho del ranking.

Validación de la entrega de reportes: Python 3.13; 37 pruebas descubiertas,
33 aprobadas y 4 SQL optativas omitidas con DATACORE_TEST_SQL=0.
Incluye AppTest y simulaciones; no demuestra SQL Server real ni inspección
visual en Windows. No se ejecutaron scripts, migraciones ni operaciones reales.

Límite conocido: las cuatro consultas del resumen abren conexiones separadas.
No constituyen una instantánea transaccional; una venta concurrente puede hacer
variar las series respecto al total entre consultas. No se promete conciliación
de auditoría. Una futura instantánea consistente requiere diseño y pruebas SQL.
