# Integración pública de datos ficticios · Orbit Data v6

## Versión identificada
Base visual: design/futuristic-workspace, cc8b6a6 (8 noviembre 2026). Incluye la búsqueda de 597d8d1 y el rediseño móvil de 3c72ad5. Main es anterior. PR #15 contiene la PWA anterior; #16/#17 corrigen Streamlit y no sustituyen el nuevo diseño. Se conserva esta rama visual; no se fusiona main ni se ejecuta CI macOS.

## Fuentes encontradas y decisiones
- pwa/js/data.js de cc8b6a6: seis productos y 120 días de operaciones generadas. Se conservan productos, precios, stock y fórmula histórica, limitada al catálogo original de seis productos. Códigos PWA-001…006.
- sql/02_datos_prueba.sql: veinte productos DEMO-001…020 y diez clientes ficticios. Se conservan nombres, categorías, precios, mínimos y stock; se muestran los nombres/identificadores de clientes. No hay ventas en este script. No se ejecutó SQL ni se añadieron compras inexistentes a estos productos o clientes.
- contracts/demo-v1.json en feature/datacore-ios, 874565a: seis productos y siete pedidos (12 líneas, 23 unidades, S/ 1,347.70). Las copias en API e iOS son el mismo contrato, no datasets adicionales. Códigos IOS-DEMO-001…006 evitan colisiones. No incluye clientes ni sucursales: las ventas llevan «Sin asignar».
- tests/datos_simulados.py contiene fixtures de pruebas aisladas y resúmenes preagregados; no es un historial adicional reconciliable. No se incorporan como compras independientes ni se duplican las capturas/documentos que muestran esos datos.
- Conversación referenciada 6aee3be3-7ddc-83e9-97d5-60f411c8e4ac: seis turnos disponibles, sin adjuntos ni datasets recuperables. No se utilizaron credenciales de esa conversación. No se afirma recuperar conversaciones antiguas fuera de lo disponible.

## Modelo comercial
32 productos, ocho categorías y diez clientes de referencia. Stock = instantánea global del 7/11/2026; no se infiere desde ventas, no se distribuye artificialmente por sucursales. Once alertas, incluidos dos productos agotados. No hay relación cliente–venta en las fuentes. Precio por cantidad se calcula en céntimos; cada pedido iOS cuenta una vez aunque tenga varias líneas. CSV conserva líneas, pedido, referencia y procedencia. Sin ingresos previos no se muestra crecimiento porcentual. Los filtros 7/30/60 días y sucursal se comparten entre Dashboard, Ventas, Reportes y Asistente. Inventario y catálogo son globales.

Asistente local determinista, expresamente sin IA conectada. No usa claves, SQL, Groq ni llamadas externas. La publicación contiene exclusivamente los 14 archivos de la lista pública de build.mjs. El repositorio continúa privado.

## Validación ejecutada en Windows
- Node 24: ocho pruebas de cálculo, fuentes, relaciones, pedidos, filtros, CSV y límite de API.
- Cuatro pruebas Python de empaquetado, manifest/iconos, caché y exclusión de fuentes privadas.
- Chromium: 52 comprobaciones funcionales; 55 de búsqueda/navegación; 40 nuevas de integración en seis secciones a 320/393/768/1440 px. Incluye descarga CSV, categorías, clientes y pedidos sin sucursal.
- Axe: 14 combinaciones de sección/tema/búsqueda sin violaciones WCAG A/AA detectadas; corregidos contraste de delta claro y texto del panel Reportes en ambos temas.
- Se verificó uso offline mediante service worker; capturas con movimiento reducido revisadas visualmente.

No se probó Safari en iPhone físico, instalación real iOS, SQL Server ni IA generativa. La emulación móvil Chromium no sustituye esa validación física. La versión pública es una demo de consulta; no registra ventas reales. PDF usa el diálogo de impresión.

## Reproducir
En pwa: npm ci; npm test. Desde raíz: node pwa/build.mjs y python -m http.server 8080 --directory public-demo. Establecer CHROMIUM_PATH al navegador disponible y ejecutar los scripts browser.mjs, revision.mjs, integration-browser.mjs y a11y.mjs. Para prueba pública: DEPLOYMENT_URL con la URL HTTPS y node pwa/tests/deployed.mjs; verifica hashes de los 14 archivos sin credenciales.
