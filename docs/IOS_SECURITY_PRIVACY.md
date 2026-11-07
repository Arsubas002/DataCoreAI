# Seguridad y privacidad: estado verificable, no política legal

Este documento describe código y límites de la candidata iOS. No es una política
pública de privacidad ni acredita cumplimiento legal, App Store o seguridad de
producción. No se usaron credenciales reales, no se desplegaron servicios ni se
accedió al SQL Server local. El repositorio conserva su visibilidad privada.

## Flujo de datos implementado

| Modo/acción | Datos y destino | Persistencia implementada |
| --- | --- | --- |
| Inicio y seis pantallas offline | Fixture incluido en bundle, cálculos locales | Snapshot, carrito, ventas y respuestas en RAM |
| Simular venta | Productos/cantidades de demo | Memoria del actor; sin SQL ni red |
| Preparar CSV/PDF | Ingresos ficticios, periodo y moneda | Temporal con protección completa; ocho archivos como máximo; limpieza al siguiente inicio |
| Compartir reporte | Archivo elegido a través de la hoja nativa iOS | La app receptora controla su copia; el usuario decide compartir |
| API demo opcional | Peticiones HTTPS a URL introducida por el desarrollador, pregunta permitida y fechas | App sin caché HTTP/cookies; API usa fixture inmutable |
| Registros API | UUID aleatorio de petición, método, plantilla de ruta, estado | Logging del proceso sin archivo configurado; el operador futuro debe definir retención |

El servidor ve metadatos de red al recibir una conexión aunque el logger propio no
registre IP. La demo no identifica personas, no crea cuentas, no hace analítica,
seguimiento o anuncios ni incorpora un SDK de reporte de fallos. La dependencia
OpenTelemetry API de FastAPI no configura por sí misma exportadores/instrumentación;
no se añade un SDK, collector ni destino de telemetría en esta implementación.
Swagger UI es documentación de desarrollo en el navegador y carga sus recursos
CDN estándar; no forma parte de la aplicación iPhone.

## Controles presentes y límites

- Sin permisos de cámara, fotos, ubicación, contactos, micrófono, Bluetooth,
  notificaciones o seguimiento. Compartir por hoja de iOS no pide acceso general
  a fotos/documentos. Sin grupos compartidos de producción, CloudKit o push.
  Solo el comando CI de simulador usa identidad/grupo Keychain ad hoc por bundle;
  no se aplica a dispositivo ni requiere certificados de distribución.
- ATS sin excepciones. Cliente opcional HTTPS, certificados del sistema,
  timeouts, respuesta <=2 MiB, sesiones efímeras y redirecciones rechazadas. No hay
  certificate pinning: revisar estrategia de rotación/amenazas antes de añadirlo.
- No se guarda URL de servidor ni tokens en UserDefaults. Helper Keychain aislado
  con `WhenUnlockedThisDeviceOnly`, sin Access Group compartido; no se usa para
  simular autenticación ni contiene tokens reales. Login de producción pendiente.
  Los errores Keychain exponen únicamente operación y OSStatus numérico; nunca
  consultas, service, cuentas ni bytes. Ver [corrección y límites](IOS_KEYCHAIN_FIX.md).
- API local: fixture anónimo, scopes demo, producción cerrada, sin writes. Cualquier
  cabecera Authorization se rechaza para impedir que parezca una sesión real.
  No hay administración de cuentas, aislamiento comercial real ni JWT implementado.
- Body <=32 KiB incluso sin Content-Length, periodos <=366 días, límites de campos,
  totales y cantidades, cero texto libre en asistente. Respuestas y fuentes son texto,
  no HTML/Markdown navegable ni SQL. Nunca hay tools de un modelo.
- Logs/errores propios no incluyen entradas, query, IP, tokens, SQL o trazas. Los
  logs del proxy/infraestructura futuros deben revisarse aparte. Uvicorn se inicia
  sin access log y sin confiar en cabeceras de proxy.
- Dependencias API fijadas en constraints; auditoría local de vulnerabilidades tras
  actualización sin hallazgos conocidos en esa consulta. No es una garantía futura:
  repetir auditoría, actualizar parches y ejecutar pruebas antes de distribución.
- No hay cifrado de base local: no existe tal base. El bundle/fixture no es secreto.
  No hay recuperación durable/idempotencia persistente ni multiusuario en la demo.

## Threat model y revisión de producción

| Amenaza | Estado demo | Puerta antes de producción |
| --- | --- | --- |
| Robo/exposición de claves Groq | No hay claves ni cliente Groq | Secret manager servidor, rotación y consentimiento |
| SQL injection / escrituras del modelo | Sin SQL y preguntas enumeradas | Adaptador SELECT parametrizado, cuenta de lectura y pruebas adversariales |
| Acceso cruzado entre empresas | No existen datos empresariales | Identidad verificada, autorización por recurso y tests multiempresa |
| Doble venta / stock insuficiente | Actor y UUID en memoria, pruebas de concurrencia | Transacción y clave durable en backend, no fiarse del precio del móvil |
| Exfiltración de informes | Compartir explícito de datos ficticios | Clasificación, minimización y decisiones informadas con datos reales |
| Abuso de solicitudes | Tasa local acotada, body/rangos limitados | Gateway distribuido, métricas seguras y rate limit por identidad/IP |
| App instalada en dispositivo comprometido | No hay secretos de producción | Evaluación de riesgos, revocación y almacenamiento mínimo |

## Documentación de tienda pendiente

`PrivacyInfo.xcprivacy` declara prácticas de la demo: sin tracking, datos recopilados
ni APIs de razones obligatorias de las categorías declaradas. Debe inspeccionarse
el informe de privacidad real del archivo Xcode, paquetes y nuevas funciones.
El código actual no lee marcas de tiempo de archivos, almacenamiento libre,
identificadores de dispositivo ni preferencias UserDefaults. No se inventan códigos
de razones permitidas para APIs no utilizadas.

`ITSAppUsesNonExemptEncryption=false` se propone porque solo se usan TLS y Keychain
estándar del sistema; el propietario debe revisar la exención/export compliance
real antes de subir y cambiarla si incorpora criptografía no exenta.

Antes de TestFlight/App Store, verificar destinos reales, logs, retención,
subprocesadores, soporte y política pública; completar App Privacy de acuerdo con
prácticas efectivas. No inventar una URL, textos legales, responsable, plazos de
retención o declaraciones regulatorias. La política pública la debe revisar el
propietario antes de publicar.

La demo no permite crear cuentas, por lo que no muestra un falso botón de borrado.
Si la versión futura crea cuentas: implementar borrado dentro de la app según
reglas vigentes de Apple, revocación de sesión, eliminación/anonimización verificable
en backend y tratamiento de obligaciones de conservación. Definir también acceso
y portabilidad si corresponde. Si se usan proveedores externos de login, revisar
la aplicabilidad de Sign in with Apple. Nada de ello está implementado aquí.
