# Auditoría de continuidad iOS · 2026-11-07

## Punto de partida y alcance

PR #12, `feature/datacore-ios`, commit
`1ce1c74942132a11f03cfabce7c1eaffe2e3e7a1`. Se conserva la rama solicitada.
No se modifican Streamlit (`app.py`, `views/`, tema/requisitos), `database/`,
`services/`, SQL ni datos reales. No se cambia main, la visibilidad del repositorio
ni se publica/distribuye la aplicación. No se despliegan servicios.

**Estado:** coordinador/dominio comprobados en Linux; proyecto y sintaxis revisados.
**No hay compilación iOS real, simulador, firma, IPA ni distribución TestFlight.**
Los cambios de presentación son código revisado: su renderizado todavía requiere
Xcode. No hay capturas nativas nuevas ni se presentan capturas de API como iPhone.

## Hallazgos y correcciones

| Hallazgo | Corrección y evidencia |
| --- | --- |
| Una recarga antigua podía reemplazar un estado más reciente, incluso después de una venta | Identificador por carga y por origen; prueba con dos respuestas suspendidas que se resuelven fuera de orden y una venta intermedia |
| Un fallo de refresh después del commit permitía cambiar el carrito/UUID y duplicar un intento | Estado pendiente conserva carrito y UUID, bloquea edición/cambio de origen y permite reintento idempotente. Prueba de commit seguido de fallo y recuperación con una sola venta |
| La lógica del store solo estaba cubierta por tests nativos no ejecutados | `CommercialSession` en el paquete Foundation/Observation, con ocho tests de estado reales ejecutados en Linux; SwiftUI usa la misma instancia mediante Observation de iOS 17 |
| Errores en sheets podían competir con un alert global | Avisos en el Workspace y sección de Ajustes; confirmaciones comerciales siguen siendo explícitas |
| Fecha UTC del gráfico podía etiquetarse como día anterior según zona del teléfono | Calendario gregoriano y UTC explícitos para gráfico/selector. Los días comerciales conservan su significado |
| Un archivo anterior podía seguir disponible tras fallar una nueva generación | Se invalida al empezar, al cambiar periodo/formato o revisión del snapshot |
| PDF con altura de fila fija podía solapar líneas largas | Medición de texto y salto de página según altura. Test PDF nativo paginado preparado, aún no ejecutado |
| Actualizar Keychain eliminaba primero el valor anterior | SecItemUpdate y alta solo si no existe; namespace por Bundle ID; prueba nativa con valores ficticios pendiente |
| Rechazo de una respuesta HTTP grande podía dejar su tarea activa | Cancelación de AsyncBytes en defer, conservando TLS, límite de tamaño y rechazo de redirecciones |
| Resumen repetía búsquedas de ventas por cada día | Agregación en una pasada; ranking usa unidades/precios vendidos. Pruebas de totales y ranking |
| Selección de simulador no filtraba SDK/runtime ni tamaños | Plan determinista de dos iPhone distintos, runtime iOS >=17 y <=SDK elegido; cinco tests Python |
| Solo existía dispatch, difícil de invocar sin el YAML en main | Ruta adicional por etiqueta de autorización del propietario en la PR; no se añade ni ejecuta esa etiqueta aquí |

## Auditoría de configuración y pantallas

- `.xcodeproj`: tres targets, paquete local, pertenencia exacta de fuentes y recursos,
  referencias reales, plists y esquema compartido. El verificador ahora resuelve
  todos los paths y comprueba las configuraciones de test/archivo.
- Debug habilita testabilidad y `-Onone`; Release usa `-O` y compilación de módulo
  completo, sin testabilidad. Bundle ID/equipo continúan configurables y vacíos/de
  ejemplo; no se introducen certificados ni capacidades nuevas.
- iPhone, deployment target **17.0**; las API usadas (Observation, Swift Charts con
  selección, ContentUnavailableView, onChange de dos argumentos) requieren iOS 17
  o anterior. El paquete requiere macOS 14 para Observation en tests de Mac.
- El toolchain Swift 6.0.3 de Linux falló al enlazar su biblioteca Observation con
  un símbolo interno sin resolver. Se actualizó la referencia Linux a **6.2.4**;
  los tests reales enlazan y pasan, sin ignorar símbolos ni instalar shims falsos.
- Dashboard: área/puntos o barras, series ingreso/ventas, selección, tabla alternativa,
  ranking real por unidades. Sin tendencias ni comparaciones inventadas.
- Productos: disponibilidad/categoría/búsqueda, limpiar filtros y ficha actualizada
  desde el snapshot. Sin escritura de catálogo.
- Ventas: catálogo plegable después de agregar, carrito accesible antes, edición
  bloqueada durante cargas/confirmaciones pendientes, reintento con UUID conservado.
- Inventario: estados nativos adaptables a Dynamic Type, alertas con texto/iconos,
  escala relativa al mayor stock visible calculada una sola vez.
- Reportes: selección del día, datos alternativos, CSV/PDF y enlace de compartir
  invalidado al cambiar la evidencia. Excel nativo sigue pendiente.
- Asistente: preguntas guiadas, respuestas en orden conversacional, fuentes,
  autoscroll discreto con Reduce Motion y foco VoiceOver preparado.
- Navegación: Inicio/Productos/Ventas/Más; Inventario/Reportes/Asistente bajo Más.
  Se amplió XCUITest a las seis rutas en apariencia normal y oscuro/AX3, más venta
  e historial. Sigue pendiente ejecutarlo con Xcode.

## Pruebas ejecutadas sin ejecutores remotos

| Prueba | Resultado de esta revisión |
| --- | --- |
| Swift 6.2.4 Linux, paquete DataCoreDomain | **24 aprobadas** (16 dominio y 8 sesión), 0 fallos |
| Python 3.13, API demo | **21 aprobadas**, sin modificar implementación/contratos API |
| Python 3.13, selector de simuladores | **5 aprobadas** |
| Regresión aislada de Streamlit | **90 descubiertas, 86 aprobadas, 4 SQL omitidas**; 0 intentos SQL/HTTP reales |
| Parseo Swift UI/tests | Aceptado; no resuelve SwiftUI/UIKit ni demuestra compilación iOS |
| Proyecto, recursos, plists y Debug/Release | Consistentes, generación idéntica; sin compilación Xcode |
| Bash y workflows | `bash -n` y actionlint aprobados |
| Dependencias API fijadas | Compatibles; pip-audit sin vulnerabilidades conocidas en la consulta |

**136 pruebas aprobadas y 4 omitidas** en total local. Se preparan nueve tests
nativos y tres recorridos UI, no contados entre las aprobadas. Los 24 XCTest del
paquete sí se ejecutaron; el mensaje adicional de Swift Testing con cero tests
no reemplaza ese resultado.

Windows no está disponible en este ejecutor Linux. Se revisó la evidencia del
commit de partida: [API/estructura en Windows y Ubuntu](https://github.com/Arsubas002/DataCoreAI/actions/runs/42373903278)
y [regresión en Windows y Ubuntu](https://github.com/Arsubas002/DataCoreAI/actions/runs/42373903233).
La API y Streamlit no cambian aquí; esa evidencia no se presenta como una ejecución
de las herramientas nuevas en Windows. Falta repetir las cinco pruebas de plan y
el verificador ampliado allí. Comandos PowerShell:

```powershell
py -3.13 -m unittest discover -s ios/tools/tests -v
py -3.13 ios/tools/verify_project.py
.\api\.venv\Scripts\python.exe -m unittest discover -s api/tests -v
```

No se ha confirmado cuota gratuita para runners hospedados del repositorio privado.
No se inician nuevas ejecuciones remotas ni trabajos macOS. Una publicación con
`[skip ci]` conserva ese límite; sus checks pendientes no significan que la nueva
revisión haya pasado CI. Revisar Billing/Actions antes de autorizar una ejecución.

## Compilación macOS preparada, detenida antes de gastar

Consulta [procedimiento y autorización](../ios/README.md#ci-macos-sin-fusionar-main).
El workflow ahora usa `macos-15` y `/Applications/Xcode_26.3.app` y comprueba que
exista, sin sustituirlo silenciosamente. El README oficial consultado anuncia macOS
15.7.9, Xcode 26.3 y SDK iOS 26.2. Es evidencia de catálogo, **no un job ejecutado**;
la imagen puede cambiar. El deployment target sigue siendo iOS 17.

Fuentes consultadas el 2026-11-07:

- [Inventario oficial macOS 15 de GitHub](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md).
- [Requisitos oficiales de Apple](https://developer.apple.com/news/upcoming-requirements/): desde 2026-04-28, entregas a App Store Connect con Xcode 26 y SDK iOS 26 o posterior. Xcode 16.4 puede servir para desarrollo previo, no satisface ese requisito actual de subida.
- [Eventos de GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): dispatch exige YAML en rama predeterminada; pull_request admite labeled y usa contexto de PR.
- [Omitir ejecuciones](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/skipping-workflow-runs): los marcadores skip afectan push/pull_request, incluida la ruta por etiqueta. Deben retirarse mediante un commit posterior autorizado antes de usarla.

Para ejecutar sin main: revisar head, presupuesto y política de Actions; propietario
puede autorizar un nuevo commit sin skip y añadir `ios-macos-cost-approved` a la
PR #12. Solo el propietario, misma rama/repositorio y evento labeled exacto permiten
el job. La autorización no se reutiliza en synchronize. No se usa
pull_request_target ni secretos de firma. No se ha probado el despacho por etiqueta:
queda sujeto a permisos/política de GitHub y disponibilidad de minutos. No se crea
ni añade la etiqueta como parte de esta auditoría.

El script `ios/tools/run_simulator_tests.sh` genera logs, XCTest `.xcresult`, adjuntos
con capturas normal/oscuro/AX3 de dos iPhone y compilación Release de simulador sin
firma. Conserva evidencia al fallar y propaga el código de error con pipefail.
No descarga SDKs, no firma, no archiva ni distribuye. iOS 17 físico/runtime, VoiceOver,
medición de contraste y ejecución real de los exporters siguen pendientes.

## Puertas de TestFlight y seguridad

No se hallaron claves privadas ni credenciales en los archivos nuevos/revisados.
Se conservan API solo demo, SQL aislado, TLS/ATS sin excepciones, preguntas permitidas,
logs sin cuerpos/tokens y exportación explícita con protección temporal. Sin permisos
nuevos del dispositivo ni entitlements de producción.

Antes de TestFlight: macOS autorizado, build real, pruebas/simuladores, dispositivo,
certificados/perfiles del propietario, Apple Developer Program y App Store Connect,
Bundle ID único, archive Release firmado, revisión de manifiesto/privacidad/cifrado,
política pública real, soporte y capturas reales. No se afirma cumplimiento normativo
ni disponibilidad del Bundle ID. No se implementan cuentas/identidad comercial ni
eliminación de cuenta falsa; si se añaden cuentas debe implementarse su borrado.
La demo no se presenta como aplicación comercial de producción o envío listo hoy.
