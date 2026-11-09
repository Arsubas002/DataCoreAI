# DataCore AI / Atlas · fuente SQL original

PWA de consulta con siete experiencias: Inicio, Productos, Clientes, Ventas, Inventario, Reportes y Asistente. Conserva la paleta Atlas y la búsqueda superior. La fuente visible contiene **20 productos, 10 clientes ficticios, 4 categorías y 336 unidades**, recuperados de los scripts originales. **No es una conexión SQL en vivo.**

## Desarrollo

Desde la raíz:

```sh
python3 -m http.server 8082 --directory pwa --bind 127.0.0.1
```

Módulos ES por HTTP, sin dependencias de producción, fuentes remotas o trackers. El servidor estático no ejecuta las funciones Vercel; la comprobación de backend informa del error y conserva la fuente identificada.

## Procedencia y funciones

[Auditoría de la fuente original](../docs/SQL_ORIGINAL.md). `scripts/sql_original.py` lee los tres scripts sin ejecutarlos y genera `js/sql-fixtures.js`. No edites ese archivo manualmente:

```sh
python scripts/sql_original.py --check-public
# Solo cuando se haya revisado un cambio legítimo de fuente:
python scripts/sql_original.py --write-public
```

Catálogo, comparación, directorio, búsqueda por nombre/código/documento/categoría, alertas, gráficos y CSV usan esos mismos registros. La búsqueda permanece en la barra superior de todas las rutas; no hay panel lateral de búsqueda. En móvil, la navegación flotante reúne Clientes, Inventario y Reportes bajo Más.

Ranking y donut representan existencias; treemap muestra participación en unidades; dispersión relaciona precio de catálogo y stock. El filtro de categoría de Reportes actualiza gráficos, tabla, totales y CSV. No se atribuyen unidades a ventas ni a sucursales inexistentes. Los scripts no contienen historial comercial: ingresos, pedidos, ticket y tendencias son no disponibles, no cero. No se inventan fechas, PK IDENTITY, metas o costos.

CSV conserva filtro y procedencia, y neutraliza fórmulas. Guardar como PDF utiliza la impresión del sistema; no se añadió un motor Excel/PDF al navegador. Streamlit conserva sus exportaciones existentes.

El asistente admite preguntas abiertas, conserva conversación mientras se navega y oculta sugerencias al interactuar. Es una **consulta local determinista identificada, sin IA generativa**. No llama a SQL ni a Groq. Reconoce datos ausentes en preguntas sobre ingresos, períodos o sucursales. No persiste la conversación al recargar.

## API separada

[Backend de lectura protegido](../backend/README.md). El puente Vercel `/api/data` exige Bearer y un origen HTTPS configurado en el servidor. No está conectado a una instancia SQL ni existe aún una sesión autenticada en el cliente. `/api/assistant` público permanece desactivado. Ninguna API se almacena offline. La demo no contiene contactos de clientes, claves ni cadenas de conexión.

## Pruebas

```sh
npm ci --prefix pwa
npm test --prefix pwa
python3 -m unittest discover -s pwa/tests -v
# Con servidor y Chromium disponibles:
BASE_URL=http://127.0.0.1:8082 npm run test:browser --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:revision --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:atlas --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:a11y --prefix pwa
BASE_URL=http://127.0.0.1:8082 npm run test:motion --prefix pwa
BASE_URL=http://127.0.0.1:8082 ARTIFACTS_DIR=/tmp/atlas-sql-visual node pwa/tests/visual.mjs
```

`CHROMIUM_PATH`, `BASE_URL` y `ARTIFACTS_DIR` permiten adaptar las pruebas. Playwright y Axe son dependencias de desarrollo. `test:integration` ejecuta la misma suite integral que `test:browser`, sin contarla dos veces. Resultados y límites en [VALIDACION_PREPUBLICACION.md](VALIDACION_PREPUBLICACION.md).

## PWA y distribución

```sh
node pwa/build.mjs
```

Genera `public-demo/` con exactamente **15 assets permitidos**, con finales de línea canónicos. SQL, backend privado, documentación, tests, dependencias y metadatos Git quedan fuera. Vercel recibe además build/configuración y las dos funciones de servidor revisadas; nunca el checkout completo.

Release `atlas-sql-v1` en HTML, importaciones y worker. Conserva ID de instalación, manifest standalone, iconos PNG 192/512 y apple-touch-icon. Worker actualizado, API excluida, recursos estáticos offline tras primera carga conectada. Cabeceras no-cache para shell y worker. En Safari HTTPS: Compartir → Añadir a pantalla de inicio. La instalación física y el teclado iOS real requieren validación manual.

## Publicación y verificación

El estado exacto del candidato Vercel se registra en [VALIDACION_PREPUBLICACION.md](VALIDACION_PREPUBLICACION.md). La versión anterior de producción se conserva. Una compilación READY no acredita acceso público anónimo ni ausencia de caché.

Cuando el permiso de red al alias se aplique:

```sh
DEPLOYMENT_URL=https://datacore-atlas-sql.vercel.app npm run test:deployed --prefix pwa
```

El verificador exige HTTPS, release `atlas-sql-v1`, búsqueda funcional, API anónima bloqueada y hashes de los 15 assets iguales al build, también tras recargar con service worker.
