# DataCore AI · identidad original y datos de prueba SQL

PWA de siete experiencias con los colores institucionales originales: **petróleo #0D1726, blanco frío #F2F5FA, violeta #7659E8 y turquesa #24C9C0**, según `docs/WORKSPACE_PETROLEO.md`. Esta revisión corrige la interpretación anterior de la paleta lima de Atlas y reconstruye composición, componentes, ilustraciones y CSS.

La demo usa exclusivamente los **20 productos, 10 clientes ficticios, 4 categorías y 336 unidades** de los scripts SQL existentes. No se ejecutan ni modifican esos scripts. [Procedencia y relaciones](../docs/SQL_ORIGINAL.md).

## Experiencias

- Inicio: unidades protagonistas, anillo de estado real (14 sobre el mínimo, 5 bajos, 1 agotado), prioridades, categorías y ranking por stock.
- Productos: veinte ilustraciones vectoriales específicas, vitrina destacada, filtro, orden por nombre/precio/stock y comparación de hasta tres referencias.
- Clientes: directorio alfabético, iniciales, búsqueda y fichas sin teléfonos ni correos públicos.
- Ventas: cotizador transitorio con productos/clientes de prueba. Cantidades validadas contra el stock de muestra, cálculo en céntimos y exportación CSV. **No registra ventas, no descuenta existencias y no alimenta ingresos históricos.**
- Inventario: matriz táctil de veinte posiciones, cola de reposición y registro filtrable.
- Reportes: treemap y barras con selector unidades/valor de catálogo, donut y dispersión. Un filtro de categoría compartido actualiza métricas, gráficos, tabla y CSV. El valor de catálogo es existencias × precio; no costo ni ingreso. Total: S/ 7,350.50.
- Asistente: conversación de sesión a página completa; preguntas abiertas con consulta local determinista identificada, sin modelo generativo conectado. Sugerencias dentro de la conversación que desaparecen al interactuar.

La búsqueda global está siempre arriba; en móvil debajo del encabezado. Navegación inferior flotante, Más para Clientes/Inventario/Reportes y sidebar de secciones en escritorio. Nunca búsqueda lateral. La procedencia técnica se consulta desde Demo SQL, sin dominar cada pantalla.

## Ejecutar y validar

```sh
python3 -m http.server 8082 --directory pwa --bind 127.0.0.1
npm ci --prefix pwa
npm test --prefix pwa
python3 -m unittest discover -s pwa/tests -v
python3 scripts/sql_original.py --check-public
BASE_URL=http://127.0.0.1:8082 npm run test:browser --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:revision --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:atlas --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:a11y --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:motion --prefix pwa
BASE_URL=http://127.0.0.1:8082 ARTIFACTS_DIR=/tmp/datacore-original-visual node pwa/tests/visual.mjs
node pwa/build.mjs
```

`CHROMIUM_PATH` configura el navegador. `test:atlas` conserva su nombre por compatibilidad y ahora comprueba la identidad original y los gráficos nuevos. `test:integration` es un alias de la suite integral, no una segunda ejecución independiente. Playwright/Axe son dependencias de desarrollo; no hay librerías de ejecución, fuentes remotas o trackers.

La lógica está separada en `views.js`, `product-art.js`, `catalogue-math.js`, `charts.js` y el controlador `app.js`. Fixtures generados en `sql-fixtures.js`, sin edición manual; `scripts/sql_original.py --check-public` verifica su correspondencia. Los importes derivados y cotizaciones usan céntimos enteros.

## PWA, exportación y servidor

Release **original-v2**, worker `datacore-original-v2`. Mantiene manifest standalone, ID de instalación, iconos originales de la PWA, safe areas y recursos estáticos offline tras una primera carga. El build publica exactamente **18 assets** permitidos. SQL, Python, backend privado, documentación, tests y Git quedan fuera.

CSV conserva filtro y procedencia y neutraliza fórmulas. Guardar como PDF utiliza la impresión del sistema; abre temporalmente la tabla filtrada y restaura su estado. No se añadió motor PDF/Excel al cliente; Streamlit conserva sus exportaciones.

La [API privada](../backend/README.md) mantiene RS256/scopes, ODBC parametrizado y límites. El puente Vercel requiere Bearer y un backend HTTPS configurado en el servidor; permanece sin origen configurado. Ninguna API se guarda en service worker. La demo no afirma conexión SQL ni IA real. No se expone el equipo local a Internet.

Candidata Vercel confirmada READY mediante API: https://datacore-original.vercel.app . El alias anterior de la demo también se actualizó; la producción principal se conserva. La comprobación HTTP pública sigue pendiente del permiso de red aplazado.

Estado de publicación, pruebas y límites: [VALIDACION_PREPUBLICACION.md](VALIDACION_PREPUBLICACION.md). Safari físico e instalación iOS requieren verificación manual; Chromium emulado no los sustituye. Desde Safari HTTPS: Compartir → Añadir a pantalla de inicio.
