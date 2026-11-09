# DataCore AI / Atlas

PWA estática de demostración con seis experiencias distintas: visión ejecutiva, catálogo/comparación, ventas, inventario, reportes y conversación. **32 productos, 10 clientes ficticios y ventas de ejemplo. No conecta SQL, cuentas reales ni un modelo de IA.**

## Desarrollo

Desde la raíz del repositorio:

```sh
python3 -m http.server 8080 --directory pwa --bind 127.0.0.1
```

No requiere dependencias de producción ni recursos externos. Usa módulos ES por HTTP, no file://. La búsqueda global permanece en la cabecera de todas las rutas; en móvil va debajo del encabezado y la navegación inferior flota sobre el contenido.

## Datos y visualizaciones

Todos los indicadores y gráficos se calculan desde `analytics(days, branch)`: área acumulada, barras horizontales por unidades, columnas por sucursal, donut, calendario diario, treemap proporcional y dispersión precio/unidades. Las fuentes no incluyen costos, horas u objetivos; esas métricas no se inventan. Consulta `DESIGN.md` y `DATOS_Y_VALIDACION.md`.

Los filtros afectan ventas, reportes e indicadores, no la instantánea global de inventario. CSV exporta las líneas del filtro con referencia y fuente. Guardar como PDF abre impresión; no hay motor PDF/Excel añadido. Los clientes recuperados no se vinculan a ventas porque la fuente no contiene esa relación.

El chat admite preguntas abiertas, conserva historial al navegar durante la sesión y explica sus límites. No persiste tras recargar/cerrar. Las sugerencias desaparecen al interactuar. `/api/assistant` es un límite seguro desactivado con respuesta 503, sin claves en el cliente.

## Pruebas

```sh
npm ci --prefix pwa
npm test --prefix pwa
python3 -m unittest discover -s pwa/tests -v
# Servidor activo y Chromium instalado:
npm run test:browser --prefix pwa
npm run test:revision --prefix pwa
CHROMIUM_PATH=/usr/bin/chromium npm run test:integration --prefix pwa
npm run test:atlas --prefix pwa
npm run test:a11y --prefix pwa
ARTIFACTS_DIR=/tmp/atlas-after node pwa/tests/visual.mjs
```

`CHROMIUM_PATH`, `BASE_URL` y `ARTIFACTS_DIR` permiten adaptar navegador/servidor/capturas. Playwright y Axe solo se usan para desarrollo. Ver resultados y límites reales en `VALIDACION_PREPUBLICACION.md`.

## PWA y build

```sh
node pwa/build.mjs
```

Produce `public-demo/` con una lista explícita de 14 assets y finales de línea canónicos. API, documentación, tests, dependencias, SQL y archivos privados quedan fuera. `vercel.json` configura build, cabeceras y no-cache para shell/worker. La distribución contiene únicamente la demo y una función desactivada.

Release `atlas-v7.1` en HTML/imports/worker. El worker precarga antes de activar y no almacena API. Manifest standalone, iconos PNG 192/512 y apple-touch-icon conservan el ID de instalación. En Safari con HTTPS: Compartir > Añadir a pantalla de inicio. Offline requiere una primera carga completa conectada; instalación y teclado iOS real aún requieren validación manual.

## Despliegue preparado

Alias dedicado: https://datacore-atlas-v7.vercel.app . Vercel confirmó READY y asignación del alias. La URL previa de producción no se reemplazó. Desde este entorno, la comprobación HTTP pública sigue pendiente porque la política de red aún bloquea vercel.app.

Después de aplicar acceso al dominio, validar:

```sh
DEPLOYMENT_URL=https://datacore-atlas-v7.vercel.app npm run test:deployed --prefix pwa
```

Ese verificador exige HTTPS, el marcador de release, búsqueda funcional y hashes SHA-256 idénticos al build, también después de recargar con service worker. Nunca se debe confundir un build READY con esta validación pública.
