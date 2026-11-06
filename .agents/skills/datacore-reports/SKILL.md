---
name: datacore-reports
description: "Diseñar indicadores, gráficos y futuras exportaciones Excel/PDF de DataCore AI con datos verificables y cálculos consistentes."
---

# Reportes y exportaciones de DataCore AI

1. Inspecciona `app.py`, `database/ventas.py`, `database/productos.py` y `requirements.txt`. Reportes es una pantalla inicial y Dashboard aún muestra “—”; no hay exportación Excel/PDF implementada. Pandas y Plotly están declarados; openpyxl, XlsxWriter y bibliotecas PDF no lo están. No afirmes que una exportación ya existe ni agregues motores sin una tarea de implementación que lo requiera.
2. Define antes de implementar el indicador: fuente, granularidad, periodo, filtros, moneda, fórmula y comportamiento vacío. Para ventas usa Ventas y DetalleVentas; evita multiplicar Ventas.Total por cada detalle al hacer joins. Mantén Decimal y los precios históricos guardados en DetalleVentas, no recalcules ventas con el precio actual de Productos.
3. Aclara que los nombres mostrados por el historial son los actuales del cliente/producto y que no existe historial completo de movimientos de inventario. El stock actual no demuestra existencias de una fecha pasada. Stock bajo es Existencias <= StockMinimo en productos activos. No inventes márgenes o utilidad sin datos de costo.
4. Para filtros de fechas define límites, zona horaria y tratamiento de DATETIME2, que no incluye zona. Prefiere intervalos semiabiertos [inicio, fin) y consultas parametrizadas. Muestra fecha de generación, filtros, unidades y filas incluidas. Diferencia cero, sin resultados y fallo de consulta.
5. Para Excel elige y declara un motor compatible cuando se autorice implementar; genera en memoria con BytesIO y usa descarga explícita de Streamlit. Conserva códigos/documentos como texto, importes numéricos con dos decimales y hojas/columnas legibles. Neutraliza entradas de texto que puedan convertirse en fórmulas (=, +, -, @ y controles); no conviertas cadenas de usuarios en fórmulas o enlaces ejecutables.
6. Para PDF selecciona un motor y sus dependencias de sistema de forma explícita. Verifica fuentes con acentos y S/, encabezados repetidos, paginación, tablas largas y filtros visibles. No agregues descargas de fuentes remotas ni plantillas con secretos. Un gráfico Plotly no garantiza exportación estática sin un motor adicional.
7. Exportar debe ser de solo lectura y reproducir los filtros del reporte. Evita consultas al rerenderizar innecesariamente, archivos persistentes con datos personales y nombres de archivo derivados de rutas de usuario. Usa nombres seguros, MIME correcto, límites de tamaño y una política explícita de caché que no mezcle datos entre sesiones.

Valida con datos sintéticos: conjunto vacío, acentos, textos tipo fórmula, ceros, decimales exactos, filtros de fecha, sumas y ausencia de duplicados por joins. Reabre el Excel con un lector compatible y revisa tipos/celdas; verifica contenido y paginación del PDF con herramientas disponibles. Comprueba que descargar no registre ventas ni altere existencias. Informa por separado diseño propuesto y capacidad realmente implementada.
