# Atlas / validación de entrega

Base `release/public-demo-data` (08c572c), rama `design/atlas-editorial`, release offline `atlas-v7.1`.

## Comprobado en este entorno

- 11 pruebas Node aprobadas: valores originales, pedidos/líneas, conciliación de CSV, categorías/sucursales, acumulados, geometría del treemap, datos vacíos y límites del asistente.
- 4 pruebas Python de empaquetado aprobadas: manifiesto, iconos instalables, assets, API fuera de caché y exclusión de archivos privados.
- 52 comprobaciones generales de navegador aprobadas: navegación, temas, catálogo, comparación, exportación, historial del chat, errores, hojas arrastrables, offline y movimiento reducido.
- 55 comprobaciones de búsqueda/revisión aprobadas: búsqueda superior en las seis rutas, código/stock, detalles, navegación por teclado, comparación y sugerencias del asistente.
- 40 comprobaciones de integración aprobadas a 320/393/768/1440px: seis secciones sin desbordamiento, 32 productos, clientes, pedidos iOS y exportación.
- 20 comprobaciones de gráficos aprobadas en móvil/escritorio: valores acumulados/diarios, comparación, donut, sucursales, calendario, treemap y dispersión.
- Axe WCAG A/AA sin infracciones detectadas en 14 combinaciones móviles de vista/tema/búsqueda. No sustituye una auditoría manual exhaustiva.
- Revisión visual de las seis vistas en iPhone 15 (393×852) y escritorio (1440×1000), temas y búsqueda. Capturas completas y comparativas antes/después en `/workspace/artifacts/` y `/tmp/atlas-after/`.
- Comparación exacta de los arrays originales y finales de productos, clientes, categorías y ventas. Sin alteraciones de registros. Streamlit, SQL y API de negocio sin cambios.
- Build canónico con exactamente 14 assets públicos; no incluye Git, SQL, Python, tests, documentación o secretos.

Se corrigieron contraste del treemap en claro, texto en celdas pequeñas, layout de tablet y desplazamiento del punto de dispersión al pulsarlo. La cola de reposición permite desplazamiento deliberado; la página no desborda horizontalmente.

## Vercel

Build final aceptado y completado con READY. Deployment: `dpl_DQTLGfJiBggsCSPhGjPz3E2WThos`. Alias dedicado: https://datacore-atlas-v7.vercel.app . La URL anterior de producción se conserva.

Se usó la API de despliegues del proyecto existente: el token permite desplegar allí pero no crear un proyecto nuevo. La credencial permanece en el proxy del entorno; no se exporta ni guarda en archivos. Solo se enviaron 17 archivos revisados (14 assets, build, función desactivada y configuración).

El acceso HTTP a los dominios vercel.app desde este entorno está bloqueado por su política de salida. Las reglas de red necesarias se guardaron en el borrador para aplicación del usuario. Por tanto, READY y asignación del alias están confirmados mediante API; la prueba HTTP anónima y el verificador remoto de hashes siguen pendientes hasta que la regla se aplique. No se presentan como ejecutados.

## Límites

Chromium móvil no equivale a Safari en dispositivo físico. La PWA mantiene manifest standalone, iconos, safe-area y offline; la instalación final en un iPhone requiere prueba manual. No hay costos, horas o metas en la fuente: se omiten rentabilidad, heatmap por hora y objetivos radiales. El asistente sigue siendo demo determinista claramente identificada, sin IA conectada. PDF usa impresión del sistema; no se agrega Excel.
