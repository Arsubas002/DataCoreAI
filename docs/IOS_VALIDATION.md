# Entrega iOS: funcionalidades, evidencia y límites

**Actualización:** ver [el tercer run real y la corrección de Keychain](IOS_KEYCHAIN_FIX.md).
Para el historial previo, consulta [la preparación actual](IOS_FIRST_BUILD.md) y
[la auditoría posterior](IOS_AUDIT_2026_11.md) para
los cambios y resultados actuales. Lo que sigue conserva la evidencia de la
entrega inicial; sus conteos y toolchain no describen la revisión posterior.

## Código entregado

- SwiftUI iOS 17+ con seis pantallas y navegación inferior nativa, modo oscuro,
  componentes accesibles y sistema petróleo/violeta/turquesa/blanco frío.
- Demo offline con catálogo, búsqueda/filtros, ficha, carrito, cantidades, venta
  simulada atómica/idempotente, historial, stock actualizado, periodos e informes.
- CSV local y PDF nativo para compartir; asistente guiado con cuatro preguntas,
  cálculos y fuentes. No hay generación Groq en iOS/API ni campos de texto SQL.
- Paquete de dominio intercambiable, API FastAPI inmutable, OpenAPI y fixtures
  compartidos; estado de carga/error/vacío y configuración HTTPS opcional.
- Proyecto Xcode/esquema/versiones Debug y Release, ícono original opaco 1024 px,
  lanzamiento nativo, privacidad declarativa demo y guía Windows/macOS/TestFlight.

## Ejecutado realmente en Linux

| Validación | Resultado observado |
| --- | --- |
| Swift 6.0.3 Linux: `swift test --package-path ios/Packages/DataCoreDomain` | **15 aprobadas, 0 fallos**: importes, periodos, ceros, CSV, atomicidad, stock, idempotencia, concurrencia, aislamiento y asistente |
| Python 3.13.5: `api/.venv/bin/python -m unittest discover -s api/tests -v` | **21 aprobadas**: contratos, fixture, resúmenes, filtros, stock, preview sin persistencia, validación, límites, permisos, logs y errores |
| Python 3.13.17: `.venv/bin/python scripts/pruebas_aisladas.py` | **90 descubiertas; 86 aprobadas y 4 SQL omitidas**, cero fallos/errores y cero intentos SQL/HTTP reales |
| `swiftc -frontend -parse` sobre app y tests iOS | Sintaxis aceptada; **no resuelve SwiftUI/UIKit ni compila iOS** |
| Generador/`ios/tools/verify_project.py` + parser OpenStep independiente | Proyecto reproducible, 3 targets, 76 objetos, referencias, scheme, plists/XML, ícono y fixtures correctos; no valida Xcode |
| `scripts/check_api_contract.py` | OpenAPI generado igual al contrato versionado |
| pip-audit sobre todas las dependencias fijadas de API | Sin vulnerabilidades conocidas en la consulta tras actualizar; no garantía permanente |
| API local Uvicorn + Chromium | Nueve operaciones en Swagger y resumen JSON real S/ 1,347.70 verificados; no se prueba TLS ni app móvil |

Los totales observados son **122 pruebas efectivamente aprobadas** entre dominio,
API y regresión Streamlit, más cuatro SQL omitidas. No incluyen los tests Xcode
preparados ni confunden el mensaje adicional “0 tests” de Swift Testing (sin casos
registrados allí) con los 15 XCTest que sí se ejecutaron.

Se corrigió la traducción automática LF→CRLF de ElementTree al generar el
esquema en Windows. El generador ahora escribe XML como bytes y la comprobación
exige artefactos idénticos con LF en las tres plataformas.

## Evidencia visual disponible

- [Captura real de documentación API en Chromium](imagenes/ios/api-openapi-demo.png).
  Es FastAPI en localhost, **no** una captura de iPhone ni una vista SwiftUI.
  Los recursos CDN se descargaron con curl/TLS verificado y se suministraron al
  navegador de prueba porque su almacén de CA no reconocía el proxy del entorno;
  no se desactivó TLS ni se cambiaron los recursos de la aplicación.
- [Ícono original implementado](../ios/DataCoreAI/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png).
- `#Preview("Demo nativa")` y XCUITest de seis rutas incluidos para generar evidencia
  nativa en macOS. No se renderizaron aquí, no hay capturas de simulador inventadas.

## CI preparada

`api-demo.yml`: Python 3.13 en Ubuntu/Windows para 21 pruebas API, estructura y
contrato; contenedor oficial Swift 6.0.3 para 15 pruebas de dominio y parseo.
El workflow de regresión Streamlit existente no se modifica. Los resultados del
commit publicado se registran en la conversación de la PR, sin afirmar resultados
antes de comprobar Actions.

`ios-macos-manual.yml`: **no ejecutado**, disparo manual con autorización expresa
de minutos, Xcode 16.4, tests y compilación Release de simulador sin firma. No se
activa macOS automáticamente, no se contrata un servicio ni se emplean credenciales.

## Preparado pero pendiente de ejecución

- Compilar/resolver frameworks SwiftUI/Charts/UIKit/Security con Xcode real.
- Siete tests app/store/exportadores PDF/CSV y dos recorridos XCUITest; capturas
  de seis pantallas, iPhone pequeño/grande y modo claro/oscuro.
- Compilación Release, archivo de dispositivo, firma/provisionamiento, instalación
  física, TestFlight y revisión App Store. No existe un IPA firmado entregado.
- Validación de cliente HTTPS ante servidor de pruebas real, TLS/errores en iPhone,
  Keychain y compartición real con otras apps; no se usa una clave real para ello.
- Checklist VoiceOver, Dynamic Type máximo, Reduce Motion y contraste físico.
- Backend/identidad por usuario/empresa, autorización real y eliminación de cuenta.
  Las interfaces están preparadas, estos servicios no están implementados.
- SQL Server real, Groq real y cualquier escritura de producción: no ejecutados.
- Excel nativo iOS y reportes de inventario/productos exportables: pendientes de
  evolución. La app actual exporta ingresos diarios CSV/PDF; Streamlit conserva
  todos sus formatos anteriores sin cambios.

## Revisión final sugerida

Revisar fuentes y [arquitectura](IOS_ARCHITECTURE.md), contratos, límites y
[seguridad/privacidad](IOS_SECURITY_PRIVACY.md); después seguir la
[guía macOS](../ios/README.md) y [aceptación de accesibilidad](IOS_ACCESSIBILITY.md).
Antes de usar datos reales se necesita una fase aparte de backend y seguridad.
El resultado es una base funcional de demo con lógica probada; no se presenta
como binario iOS compilado, aplicación de producción o envío aprobado por Apple.
