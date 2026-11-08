# Validación de la demo PWA

Fecha: 8 de noviembre de 2026. Rama: `design/apple-pwa-experience`.

## Ejecutado en este entorno

- Pruebas Python de empaquetado: 4 aprobadas. Manifiesto, iconos, assets, caché y exclusión de archivos privados.
- Pruebas Node: 4 aprobadas. Conciliación de indicadores/períodos, CSV, catálogo/asistente y endpoint desactivado.
- Chromium con Playwright: 52 comprobaciones funcionales aprobadas en escritorio 1440×1000 y móvil 393×852 / 375×812. Navegación real de seis secciones, temas persistidos, búsqueda vacía, filtros, comparación, detalles, ingresos por sucursal, tooltips por teclado, descarga CSV, conversación sin inyección HTML, historial entre rutas, recarga offline y movimiento reducido. Sin errores JavaScript observados.
- Comprobaciones adicionales aprobadas: arrastre 1:1 y cierre por proyección, reapertura del panel y error HTTP del asistente. Incluidas en las 52 comprobaciones del runner reproducible.
- Axe WCAG A/AA: cero infracciones detectadas en seis vistas × dos temas móviles después de reforzar contraste. No sustituye una auditoría manual completa.
- Capturas de ambas composiciones y revisión visual local en `/tmp/datacore-artifacts`.

Se corrigió la interpretación de “reposición” detectada por la prueba de conversación y se añadió una regresión. Se revisó que ninguna operación consulte SQL ni modifique datos reales.

## Distribución revisada

Carpeta temporal de publicación con 17 archivos revisados: shell, estilos, seis módulos JS, manifiesto/iconos, endpoint desactivado y configuración/script de build Vercel. El build produce exactamente 14 assets públicos en public-demo/. Excluye Git, documentación, tests, node_modules, Python, scripts SQL y cualquier secreto. CSP limita recursos y conexiones al mismo origen. La API no entra en caché.

## Despliegue pendiente

Vercel CLI no encontró sesión ni token. El intento de despliegue temporal fue rechazado con `login_required`; no se obtuvo una URL publicada. Se solicitó configurar VERCEL_TOKEN de forma segura y se guardó únicamente ese requisito en el borrador del entorno, con destino api.vercel.com. Guardar el requisito no aporta su valor ni activa el acceso.

## Límites

- No probado en un iPhone físico ni Safari real. La descarga de WebKit fue denegada por la política de red para cdn.playwright.dev y playwright.download.prss.microsoft.com. El viewport móvil de Chromium no es Safari.
- Instalación iOS, teclado real y áreas seguras requieren comprobación final en dispositivo.
- PDF depende de la impresión del sistema. No hay exportación Excel ni motor PDF dedicado.
- Asistente: solo cálculo local ficticio; sin modelo, cuentas, backend de datos o acceso al negocio real. Endpoint devuelve 503 hasta implementar los requisitos de seguridad.
- La conversación se conserva al navegar, no al recargar o cerrar la página. Los datos son estáticos y ficticios.
- No se afirma publicación, dominio HTTPS ni validación remota hasta obtener y probar una URL real.
