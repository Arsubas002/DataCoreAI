# Exportaciones CSV, Excel y PDF

En Reportes genera un periodo y selecciona el formato. Las tres descargas
(ingresos diarios, ranking de ocho e inventario actual) usan la misma información
ya consultada. Cambiar formato o descargar no abre conexiones SQL. Los archivos
se conservan únicamente en memoria de la sesión y se invalidan al generar de nuevo.

## Motores y límites

- Excel: openpyxl >=3.1.5,<4. Hojas Información y Datos, filtros, cabecera,
  panel inmovilizado, fechas nativas, códigos como texto y dinero numérico a dos
  decimales. Las cadenas se fuerzan a texto, incluso fórmulas y URLs; no hay
  fórmulas ni hipervínculos activos. Se rechazan valores absolutos >=10^12 para
  evitar pérdida silenciosa de céntimos por el límite de precisión de Excel.
- PDF: ReportLab >=4.4,<5. A4 horizontal, tabla paginada con encabezados
  repetidos y número de página. Fuente Vera y VeraBd incluidas en el paquete,
  sin fuentes remotas ni dependencias del sistema. Texto escapado, sin enlaces
  ni interpretación de marcado de los nombres. Cubre español y acentos; no se
  garantiza cobertura de todos los alfabetos Unicode.
- Hasta 5.000 filas por Excel y 2.000 por PDF; máximo 10 MiB por archivo.
  Se rechazan textos de más de 2.000 caracteres o controles XML no válidos.
  No se truncan filas. Para conjuntos mayores usa CSV o reduce el periodo.

Los metadatos incluyen fuente, periodo inclusivo, generación con zona horaria,
moneda, número de filas y alcance. El inventario es actual; no representa el
stock de las fechas seleccionadas. El ranking usa subtotales históricos y
nombres actuales; no equivale al catálogo completo vendido. Las cuatro consultas
independientes no ofrecen una instantánea transaccional.

## Verificación

Python 3.13: 52 pruebas descubiertas, 48 aprobadas, 4 SQL optativas omitidas.
Los Excel se reabren con openpyxl y los PDF con pypdf, verificando tipos,
acentos, importes, filtros, marcado literal, ausencia de enlaces, paginación,
encabezados repetidos y última fila. Se comprueban vacío, límites y cambio de
formato sin nuevas consultas. PDF sintético de 100 filas renderizado con
pdftoppm e inspeccionado visualmente: cabecera, acentos, ajuste de texto y pie
legibles. No se exportaron datos reales.

Para instalar lectores de prueba: `python -m pip install -r requirements-dev.txt`.
