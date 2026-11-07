# DataCore AI · PWA de demostración

Prototipo móvil **estático** y **sin datos reales**. No conecta SQL Server, Groq, API ni autenticación. Las seis pantallas muestran datos ficticios; Ventas y Reportes no efectúan operaciones reales.

## Probar desde Windows
```powershell
py -m http.server 8080 --directory pwa --bind 127.0.0.1
```
Abrir http://127.0.0.1:8080 en el PC. El service worker se registra en HTTPS; para probar instalación y caché en iPhone, publicar bajo una URL HTTPS **solo después de autorizar el despliegue**. No publicar la app Streamlit ni la instancia SQL local.

## Instalación en iPhone
Abrir la URL HTTPS en Safari > Compartir > Añadir a pantalla de inicio. La compatibilidad de iconos SVG varía según iOS: generar iconos PNG de 192 y 512 y apple-touch-icon antes de considerar la PWA terminada. Verificar manualmente instalación, navegación y modo sin conexión.

## Pendiente
Pruebas en Safari real, PNG de iconos, exportaciones, UX accesible, datos persistentes, autenticación y backend seguro. No hay URL pública todavía.
