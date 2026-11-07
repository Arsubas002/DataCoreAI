# Datos y pasos para instalar por TestFlight

**Estado:** no hay archive, IPA, firma, build en App Store Connect ni app instalable.
La primera ejecución preparada solo construye/prueba simuladores, sin cuenta Apple.
No recoge credenciales ni distribuye. Ver [primera compilación](IOS_FIRST_BUILD.md).

## Información no secreta que decide el propietario

| Información | Dónde se utiliza / estado |
| --- | --- |
| Bundle ID único de su organización | `DATACORE_BUNDLE_ID`; actualmente `org.example.datacoreai.demo` es ejemplo, no registrado ni disponible verificado |
| Equipo Apple Developer (Team ID) | `DATACORE_DEVELOPMENT_TEAM`; vacío. Puede configurarse en Local.xcconfig ignorado, no es una clave privada |
| Nombre de app, titular y derechos de marca/ícono | Revisar DataCore AI y recursos originales antes de registrar la ficha |
| Versión y build | 1.0.0 / 1 actuales; incrementar build si ya existe uno con ese número en App Store Connect |
| Membresía Apple Developer Program y rol de cuenta | Propietario comprueba vigencia, precio local y permisos de firma/subida/TestFlight; no se contrató aquí |
| Modelo de iPhone e iOS | Para aceptación y compatibilidad iOS 17+. No se necesita IMEI, número de serie ni UDID para TestFlight |
| Contacto de soporte, URL de soporte y privacidad real | Deben corresponder a prácticas verificadas; no se inventan ni se despliega una web como parte de esta PR |
| Decisión sobre testers | Introducir sus correos/invitaciones directamente en App Store Connect, no en el repo |
| Prácticas de datos, regiones, clasificación y cifrado | Revisar manifiesto, ficha de privacidad, export compliance y contenido real de la demo |

Apple ID, contraseña, OTP y claves se introducen solamente en canales Apple o un
almacén seguro aprobado. No se deben proporcionar al agente ni guardarse en código,
PR, logs, parámetros de comandos o Local.xcconfig. Ese archivo es para identificadores,
no secretos. Nunca subir certificados, P12/P8, perfiles de firma o tokens.

## Orden de trabajo posterior

1. Autorizar y ejecutar la validación de simuladores; revisar logs/summaries, UI normal
   y oscuro/AX3, errores, Keychain y PDF. Resolver fallos reales antes de firmar.
2. En Mac autorizado con Xcode/SDK 26+ actual, configurar Bundle ID y Team ID del
   propietario; ingresar la cuenta Apple en Xcode. Revalidar requisitos vigentes
   de Apple y las condiciones de su membresía. No se configura firma en esta CI.
3. Seleccionar destino genérico iPhoneOS (no Simulator), configuración Release;
   Product → Archive. Usar firma/provisionamiento de distribución del propietario.
   No basta renombrar un .app de simulador o comprimirlo como IPA.
4. Revisar archive en Organizer: Bundle ID, 1.0.0/build incrementado, ícono, permisos,
   reporte PrivacyInfo, SDK y declaración de cifrado. `ITSAppUsesNonExemptEncryption`
   es false por uso estándar de TLS/Keychain; propietario verifica su aplicabilidad.
5. Crear/configurar la app en App Store Connect con identificador consistente y rol
   autorizado. Validar y subir desde Organizer/Transporter, solo cuando se autorice
   expresamente distribución. La PR actual no realiza estos pasos.
6. Esperar procesamiento; resolver avisos de firma, privacidad y cumplimiento reales.
   Completar los datos de pruebas beta. Testers externos pueden necesitar Beta App
   Review; no se garantiza aprobación, plazos ni aceptación de una versión solo demo.
7. Configurar testers internos/externos. Instalar TestFlight desde App Store en el
   iPhone del propietario e incorporarse a la invitación. Windows puede gestionar
   App Store Connect/recibir la invitación, pero no compila ni firma iOS.
8. En el dispositivo: seis pantallas sin Internet, periodos, carrito/venta local,
   recuperación, stock, CSV/PDF/compartir, oscuro, Dynamic Type, VoiceOver, Reduce
   Motion y rotación. Registrar versión/build y resultados verificables.

No hay login/cuentas de producción ni SQL/Groq en el móvil. No se anuncia un botón
falso de eliminación de cuenta; si se añaden cuentas habrá que implementar borrado,
revocación y tratamiento de datos en backend antes de distribuir esa función.
No se activa un backend de producción para poder usar la demo TestFlight offline.

Costos posibles separados: minutos/almacenamiento de Actions; acceso a Mac si no
puede obtenerse prestado; membresía Apple Developer si no está vigente. Ninguno se
ha autorizado ni contratado desde esta entrega. La aprobación de minutos de
simulador no autoriza firma, membresía, despliegue o publicación posterior.
