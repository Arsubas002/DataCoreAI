# Atlas SQL · validación de la candidata

Base revisada `design/atlas-editorial` (`c0f565d`); rama `feat/atlas-sql-consolidation`; release `atlas-sql-v1`. El usuario confirmó los scripts SQL como fuente original. Se conservan colores y se añade Clientes como séptima ruta.

## Comprobado localmente

| Área | Resultado ejecutado |
| --- | --- |
| Aplicación Windows existente, Python 3.13.17 | 90 descubiertas: **86 aprobadas, 4 omitidas** (SQL real); cero intentos SQL/HTTP reales en la suite aislada. |
| Backend privado y fuente original | **27 aprobadas**: RS256, emisor/audiencia/expiración, scopes, cuerpo y parámetros limitados, errores, recursos cerrados, rollback de lectura, importes Decimal y ausencia de escritura. Incluye hashes de scripts, seis PK/cinco FK y conservación exacta de paleta. SQL simulado. |
| Node 24 | **16 aprobadas**: fuente original, registros exactos, categorías, gráficos proporcionales, estados vacíos, CSV y puente HTTPS/Bearer, incluidos recursos de prototipo rechazados y errores sanitizados. |
| Empaquetado PWA | **4 aprobadas**: manifiesto, iconos, todos los módulos offline, API fuera de caché y exclusión del repositorio privado. |
| Navegador integral | **103 comprobaciones aprobadas** en siete rutas a 320, 393, 768 y 1440 px; comparación, filtros, clientes, descarga CSV, temas, historial, preguntas sin datos, XSS y offline. |
| Búsqueda/navegación | **42 comprobaciones aprobadas**, siete rutas en móvil/escritorio, búsqueda superior única, teclado, productos y clientes. Sin búsqueda en sidebar. |
| Gráficos y paleta | **14 comprobaciones aprobadas**: valores originales, filtros, tooltips por toque y temas. |
| Movimiento | **9 comprobaciones aprobadas**: tracking 1:1, inversión del arrastre, agarre desde posición presentada durante cierre, reversión de resorte, flick, movimiento reducido, Escape y ausencia de errores JS. Reloj controlado para inspección entre frames. |
| Accesibilidad | Axe WCAG A/AA sin infracciones detectadas en **16 estados móviles** (siete rutas, ambos temas y búsqueda). No equivale a auditoría exhaustiva. |
| Dependencias | Ambos entornos Python compatibles (`uv pip check`); compilación Python sin errores. |

Además se hizo revisión visual de las siete pantallas a iPhone 15 (393×852) y escritorio (1440×1000), ambos temas y búsqueda. Capturas actuales y comparativas respecto a la base anterior en `/workspace/artifacts/atlas-sql/`, fuera de Git y de la distribución. Chromium emulado no sustituye Safari físico.

La vida del proceso y el rechazo de una consulta anónima también se comprobaron por HTTP local: `/health` no afirma conexión y `/api/products` devuelve 401. No hubo lecturas sobre SQL Server real. Las pruebas de API en proceso verifican casos autenticados usando claves temporales en memoria y conexiones simuladas.

## Integridad y exposición

Los tres scripts SQL, Streamlit, `database/`, `services/` y `views/` permanecen idénticos a la base. No se ejecutó DDL, no se cargaron semillas y no se modificó una base local. [Auditoría original](../docs/SQL_ORIGINAL.md).

Build explícito de 15 assets, aproximadamente 160 kB sin comprimir. Revisión de archivos permitidos, ausencia de contactos de clientes y patrones de secretos/claves privadas. No hay SQL, Python, documentación, dependencias o Git en la salida pública. Los endpoints del puente no aceptan peticiones anónimas. La API no se almacena en service worker.

## Vercel y GitHub

La API de Vercel permite consultar el proyecto existente `datacore-ai-demo`; está enlazado al repositorio GitHub correcto. `DATACORE_API_ORIGIN`, servidor SQL y emisor JWT no están configurados en el proyecto: la demo no puede consultar SQL. No se mostraron ni exportaron valores secretos. Se conserva la protección global del proyecto y la producción anterior.

Los dos despliegues automáticos de Git revisados (`c0f565d` y `5e38ea7`) figuraban BLOCKED, sin un motivo específico en sus campos de error o eventos. El autor declarado coincide con la identidad Git existente; no se ha verificado su pertenencia/permisos de cuenta Vercel y no se atribuye el bloqueo a una causa no demostrada. No se reescribió identidad ni historial.

La publicación de esta candidata se preparará mediante la API autorizada del proyecto existente y un alias separado, sin sustituir producción. Se actualizará aquí el identificador al confirmar READY.

El usuario decidió aplicar más adelante las reglas de red para `api.github.com` y `datacore-atlas-sql.vercel.app`. Por tanto, siguen pendientes la creación/lectura de PR mediante API y la prueba HTTP anónima del nuevo alias, incluidos hashes y caché. No se confunde READY con verificación pública. El script preparado es:

```sh
DEPLOYMENT_URL=https://datacore-atlas-sql.vercel.app npm run test:deployed --prefix pwa
```

## Pendiente fuera de este entorno

- Conectar de forma autorizada a la instancia Windows existente con ODBC 18 y TLS válido; verificar esquema físico, FK/CHECK, permisos y registros reales con lecturas. No recrear la base.
- Configurar proveedor de identidad/roles y sesión del cliente antes de habilitar datos en vivo. No abrir el equipo local ni el puerto SQL a Internet.
- Recuperar historial real si existe: los scripts no incluyen ventas/detalles/solicitudes. No se requieren ni inventan nuevos registros para la demo.
- Safari/iPhone físico: instalación desde Compartir, áreas seguras y teclado real. Manifest, iconos y offline sí se verificaron localmente.
- Aplicar los permisos de red aplazados para completar PR y comprobación pública. No se afirma validación remota ni se fusiona main.
