# DataCore AI · edición Nova Retail 2025 (candidata, **NO producción**)

Rama: `feat/novaretail-2025-rebrand`. Origen único: archivo proporcionado por el usuario como `data(1).csv`, que contiene realmente un libro OOXML Excel con una hoja `in` y 1.671 filas de ventas más encabezados.

## Identidad y estructura

Se reutiliza el shell actualizado (barra de búsqueda superior, sidebar escritorio, navegación móvil) y la paleta de la página principal `release/public-demo-data`: #f0f2f6, #ffffff, #172134, #3e52b4 en claro; #0e121c, #171e2c, #e9edf6, #a7b7ff en oscuro. El catálogo SQL anterior no se elimina del repositorio, pero se excluye de los archivos publicados de esta edición.

## Integridad del archivo

| Métrica | Resultado |
| --- | ---: |
| Período | 2025-01-01 a 2025-03-31 |
| Transacciones únicas | 1.671 |
| Productos distintos | 12 |
| Tiendas | 4 |
| Canales | 3 |
| Categorías | 4 |
| Unidades vendidas | 5.001 |
| Ventas brutas USD | 774.825,00 |
| Total descontado USD | 25.737,75 |
| Ventas netas USD | 749.087,25 |

Se parsearon las cadenas del libro (S/ para la columna de precios, USD $ para las medidas), **sin efectuar cambio de divisa** porque el campo de precio se llama `Precio_Unitario_USD` y todas las medidas de venta están etiquetadas USD. Para confirmar la moneda original más allá de esas etiquetas, se requeriría revisión del origen transaccional.

Cada fila almacena ID, fecha, tienda, canal, producto, cantidad y descuento; el precio y la categoría proceden de un catálogo único de 12 productos verificado contra las 1.671 filas. Se codifican sin pérdida en 6 bytes por operación y se reconstruyen íntegramente en cliente. Los importes se calculan en centavos enteros con conciliación de los cinco totales anteriores, sin sumas de importes ya agregados.

## Qué muestra

- Inicio: indicadores y tendencia diaria, desglose de canales/tiendas y comparativa mensual.
- Productos: facturación y unidades **vendidas**, no existencias.
- Canales: Físico, Online, App Móvil.
- Ventas: registros filtrables, paginación y exportación CSV.
- Tiendas: cuatro sucursales y matriz por canal.
- Reportes: categorías, producto líder, descuento mayor a 15%, simulación explícita sobre ventas de Moda con descuento de 15%.
- Asistente: respuestas locales deterministas, sin conexión a Groq o IA generativa y sin inventar cantidades.

## Datos ausentes

No hay columna de inventario, compras, costo, clientes, stock mínimo ni movimientos de almacén. Ningún indicador podrá afirmar disponibilidad, reposición ni margen de rentabilidad real. Tampoco hay acceso a SQL Server en vivo; se trata de una foto histórica estática de 2025.

## Comprobación

`node --test pwa/tests/nova-2025.test.mjs`

Las pruebas heredadas de la anterior demo SQL deben adaptarse al nuevo caso: no se debe afirmar que verifican esta edición. El proyecto original publicado en producción no se modifica ni se promueve. Antes de publicar es necesario probar en navegador de escritorio y Safari físico, revisar la advertencia de moneda de la columna de origen y revisar las protecciones del entorno Vercel.
