# DataCore AI · PWA de demostración

Experiencia responsive reconstruida para iPhone y escritorio. Seis secciones, modos claro/oscuro, gráficos táctiles, catálogo con comparación, inventario, CSV y conversación local. **Todos los datos son ficticios. No hay SQL, autenticación ni IA conectada.**

## Ejecutar

Desde la raíz del repositorio:

```sh
python3 -m http.server 8080 --directory pwa --bind 127.0.0.1
```

No requiere dependencias de producción. El build de distribución copia una lista explícita de 14 assets públicos, sin transformar el código. Los módulos ES se sirven por HTTP; no abras index.html como file://. Para Vercel se ejecuta `node pwa/build.mjs` desde la raíz y se usa la salida `public-demo/` y el endpoint desactivado `api/assistant.mjs`.

## Validación

```sh
python3 -m unittest discover -s pwa/tests -v
npm ci --prefix pwa
npm test --prefix pwa
# Con el servidor anterior activo y Chromium instalado:
npm run test:browser --prefix pwa
npm run test:a11y --prefix pwa
```

`CHROMIUM_PATH` permite seleccionar el navegador. `BASE_URL` permite probar otra URL. Las capturas se guardan en `/tmp/datacore-artifacts` o `ARTIFACTS_DIR`. El test automatizado comprueba escritorio 1440px, móvil 393/375px, navegación, temas, búsqueda/filtros, comparación, gráficos, chat, exportación, offline y movimiento reducido. No equivale a Safari en un iPhone físico.

## PWA

Safari > Compartir > Añadir a pantalla de inicio, bajo HTTPS. Incluye manifest standalone, iconos PNG y apple-touch-icon. Abre una vez con conexión y espera el registro del service worker antes de probar offline. La actualización conserva la versión anterior hasta cerrar sus pestañas; el siguiente arranque usa el shell nuevo de forma coherente. Cada entrega que cambie assets debe incrementar CACHE en sw.js.

## Exportaciones y asistente

CSV usa el período/sucursal seleccionados. Guardar como PDF abre el diálogo de impresión: elegir PDF depende del sistema; no se incorpora un motor PDF o Excel. El chat conserva la conversación al navegar durante la sesión, no tras cerrar o recargar. Las respuestas locales se identifican como demo; no se presentan como inferencias de un modelo.

La arquitectura futura de servidor está documentada en `DESIGN.md`. El endpoint rechaza métodos/entradas inválidos y responde 503 mientras no exista una integración segura. Ninguna variable de clave se envía al cliente.

## Despliegue

La solicitud actual autoriza publicar únicamente la demo. `vercel.json` configura build/salida, cabeceras de seguridad y no-cache para sw.js. `.vercelignore` excluye el resto del repositorio, tests, documentación y node_modules. Para mayor aislamiento se puede preparar una carpeta temporal con solo `pwa/{index.html,styles.css,sw.js,manifest.webmanifest,icon.svg,js/,assets/}`, `api/assistant.mjs` `pwa/build.mjs` y `vercel.json`, y desplegarla con Vercel. Nunca publiques el resto del repositorio.

Para una cuenta conectada: `vercel deploy` desde esa carpeta. La CLI también permite `vercel deploy --temporary` sin iniciar sesión; la URL y su caducidad deben confirmarse en el resultado. No se debe afirmar que está publicado solo por tener la configuración preparada.

## Edición 02: corrección del rediseño

Búsqueda global superior en las seis secciones, sin buscadores laterales ni campo duplicado en Productos. Encuentra nombres/categorías, muestra precio/stock y abre fichas o secciones. En escritorio: Cmd/Ctrl K; flechas para recorrer resultados y Escape para cerrar. En iPhone: debajo de la cabecera, con navegación inferior flotante.

Inicio usa una composición analítica nueva, los gráficos permiten alternar tendencia/barras y comparación, y las sugerencias del asistente desaparecen al empezar a escribir. El modo demo permanece explícito.

Validación adicional (servidor HTTP activo):

```sh
npm run test:revision --prefix pwa
node pwa/tests/visual.mjs
# Solo después de tener una URL HTTPS real:
DEPLOYMENT_URL=https://URL_REAL npm run test:deployed --prefix pwa
```

No se ha obtenido URL pública en este entorno. VERCEL_TOKEN continúa ausente y la conexión actual a api.vercel.com fue rechazada con 403. Los requisitos ya guardados en el borrador deben completarse y aplicarse desde ajustes seguros; no deben enviarse valores al chat ni al código.
