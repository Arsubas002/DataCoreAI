# Validación · Perspective 02

Fecha: 8 de noviembre de 2026. Rama: `design/global-search-editorial-v2`.

## Resultado local comprobado

- Seis vistas inspeccionadas en capturas iPhone 15 (393×852) y escritorio (1440×1000); se revisaron también búsqueda desplegada y modo oscuro. Capturas en `/tmp/datacore-v2/`.
- Existe un solo campo de búsqueda global, dentro de la toolbar y visible en las seis rutas. No hay inputs ni regiones de búsqueda en aside. En móvil, el campo está debajo del encabezado; en escritorio, dentro de la barra superior.
- 55 comprobaciones específicas aprobadas: búsqueda en las seis rutas y ambos tamaños, stock por referencia, reposición, apertura de detalle, acceso a Ventas, flechas/Escape, conmutadores de gráficos, navegación flotante y desaparición de sugerencias al escribir.
- 52 comprobaciones generales aprobadas en 1440, 393 y 375 píxeles: rutas, filtros, temas, comparación, conversación, exportación, arrastre/proyección de hoja, errores de servidor, offline y movimiento reducido. Sin errores JavaScript observados.
- 4 pruebas Node y 4 de empaquetado Python aprobadas. Build de distribución verificado con 14 assets públicos explícitos.
- Axe WCAG A/AA: las seis vistas × dos temas móviles sin infracciones detectadas. La búsqueda desplegada se comprueba adicionalmente en ambos temas. No equivale a auditoría manual exhaustiva.
- Se corrigieron el atributo ARIA no aplicable al searchbox y el cierre por Escape que reabría resultados al devolver foco.

## Renovación de caché

Marcador HTML `editorial-search-v2`, URL versionadas para CSS/entrada/imports, caché nueva `datacore-editorial-search-v2`, precarga antes de activación y cabecera no-cache para shell/service worker. Se conserva uso offline, sin cachear API.

El verificador `tests/deployed.mjs` valida en una URL HTTPS real el marcador, la búsqueda, hashes SHA-256 de los 14 assets y recarga con service worker. **Aún no se ha ejecutado contra una URL pública**: el entorno no dispone de credenciales de despliegue ni de una URL publicada.

## Bloqueo externo de publicación

VERCEL_TOKEN no está presente y la conexión a https://api.vercel.com/v2/user falla en CONNECT con 403. El requisito del secreto y el dominio están guardados en el borrador del entorno, pero todavía no aparecen aplicados en el runtime. El usuario debe completar/guardar los ajustes seguros para permitir publicar. No se solicitan valores por chat ni se incluyen en el repositorio.

La publicación y la confirmación del diseño en URL pública quedan pendientes. No se declara entrega totalmente finalizada por compilar o pasar pruebas locales.

## Límites conservados

Datos ficticios; asistente determinista identificado como demo, sin IA real conectada; API de servidor desactivada. PDF mediante impresión del sistema. No se modificaron Streamlit, scripts SQL o datos. Chromium móvil no sustituye Safari real ni la instalación/teclado de un iPhone físico. La descarga de WebKit sigue bloqueada por la política de red.
