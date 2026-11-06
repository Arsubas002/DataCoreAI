# Revisión visual con datos sintéticos

Estas capturas usan exclusivamente datos ficticios inyectados en un proceso
Streamlit temporal. No son evidencia de conexión ni cifras de un negocio real.
El script de previsualización no se incorpora a la aplicación ni altera SQL.

Chromium con Playwright: dashboard y reportes a 1440 px; entrada móvil a 390 px.
Se verificaron filtros, métricas, jerarquía, contraste, navegación y tablas.
La pantalla móvil inicia con menú contraído y mide 390 px de documento para
390 px de viewport, sin desbordamiento horizontal global. Las tablas anchas
conservan su desplazamiento interno. Se mantiene el tema oscuro original.

![Dashboard con datos sintéticos](imagenes/dashboard-sintetico.png)

![Dashboard móvil con datos sintéticos](imagenes/dashboard-movil-sintetico.png)

PDF sintético de 100 filas renderizado con pdftoppm: acentos, ajuste de texto,
encabezado y pie legibles. La prueba automatizada de pypdf verifica todas las
páginas, encabezados repetidos y última fila.

![PDF sintético, primera página](imagenes/pdf-sintetico.png)

No sustituye pruebas con lectores de pantalla ni una revisión en Windows.
