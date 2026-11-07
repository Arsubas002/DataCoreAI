# Validación previa a despliegue de la demo PWA

Fecha: 2026-11-07. Rama: `feature/datacore-pwa-demo`.

## Comprobaciones estáticas realizadas
- Seis rutas visibles en HTML: Dashboard, Productos, Ventas, Inventario, Reportes, Asistente IA.
- Manifest JSON parseable, `display: standalone`, ruta de inicio y referencia al icono SVG existente.
- Service worker incluye shell offline y recuperación de caché.
- El HTML no contiene conexión directa a SQL Server ni Groq; los indicadores se presentan como datos ficticios.
- Descarga CSV de ejemplo y ausencia de scripts de terceros.
- Se corrigió la navegación hash para evitar cambios redundantes.

**Estas comprobaciones se hicieron sobre contenido recuperado de GitHub.** No se ha ejecutado todavía `unittest` en un runner, ni pruebas E2E, Lighthouse, Safari iPhone ni auditoría completa de accesibilidad.

## Limitaciones pendientes
- Faltan iconos PNG 192/512 y `apple-touch-icon` para experiencia iOS consistente; SVG es un fallback.
- Sin datos reales, persistencia, autenticación, SQL, Groq ni reportes PDF.
- No existe despliegue HTTPS confirmado ni URL pública.
- No publicar contenido privado del repositorio. `vercel.json` establece solo `pwa/` como salida estática, pero antes de conectar un hosting hay que revisar que no se suban archivos del resto del repositorio a la salida.

## Publicación
Configuración estática de Vercel en `vercel.json`. Para publicar, el propietario debe conectar la cuenta de Vercel al repositorio privado y autorizar la importación/despliegue. La publicación de **la demo estática** está autorizada por el propietario, pero no autoriza revelar código privado, base de datos, tokens o contenido fuera de `pwa/`.

No inventar un enlace de producción: verificar el dominio HTTPS real tras despliegue.
