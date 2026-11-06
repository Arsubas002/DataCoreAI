# Consolidación de las PR #1–#4

## Dependencias revisadas

| PR | Base | Contenido | Head revisado |
| --- | --- | --- | --- |
| #1 | main | AGENTS y cinco Skills públicas | c33a373 |
| #2 | main | dashboard SQL de lectura | aca8af9 |
| #3 | #2 | reportes CSV y límites de agregación/fechas | 239f8f0 |
| #4 | #3 | asistente guiado y fuentes visibles | 5dd404d |

La rama `feature/consolidacion-comercial` parte de #4 e integra #1 mediante
merge local. Los commits de #2 y #3 ya son ancestros de #4. No se fusiona,
rebasa ni cierra ninguna PR original, y main no cambia. Esta PR permite revisar
el conjunto sin tener que fusionar secuencialmente las cuatro originales.

## Cambios y correcciones

- Conserva las seis rutas, formularios de productos, confirmación y UUID de ventas.
- Cabecera y filtros compartidos; métricas en contenedores con borde, acciones
  primarias y tema oscuro. Se elimina CSS que dependía del DOM interno.
- Actualiza las tablas al API width de Streamlit y requiere Streamlit >=1.52.
- La gráfica diaria usa fechas ISO sin convertirlas al rango limitado de Pandas.
  Su tabla conserva Decimal. El ranking usa códigos únicos y desempate estable.
- Alinea AGENTS y Skills con la funcionalidad consolidada.
- Añade GitHub Actions para pruebas aisladas con Python 3.13 y permisos de lectura.

## Validación de etapa

`DATACORE_TEST_SQL=0 .venv/bin/python -m unittest discover -s tests -v`:
45 descubiertas, 41 aprobadas, 4 SQL optativas omitidas. Incluye nuevas
regresiones de navegación, persistencia de reportes, ausencia de escrituras,
fechas en el año 2500 y nombres duplicados de productos. No se ejecutaron
migraciones ni consultas sobre datos reales. Las simulaciones no prueban
concurrencia ni bloqueo en SQL Server Windows. El resumen aún utiliza
consultas independientes y no promete una instantánea transaccional.
