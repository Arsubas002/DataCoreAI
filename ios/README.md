# DataCore AI para iPhone

Base SwiftUI **nativa**, iOS **17.0+**, Swift 5.9+ (modo de lenguaje Swift 5),
referencia preparada Xcode **26.3** / macOS **15.7.9** de referencia (inventario del runner consultado). Deployment target iOS 17.
Para pruebas del paquete en Mac se requiere macOS 14+ por Observation.
Usa Swift Charts, Foundation, UIKit/PDFKit y Security del sistema. No contiene
WebView, CocoaPods, dependencias Swift remotas ni claves API.

**Estado:** [preparación actual y resultados](../docs/IOS_FIRST_BUILD.md). Dominio
y coordinador Observation probados en Linux (26 tests); interfaz, firma, archivo Release y
simulador iOS todavía pendientes de ejecución en macOS. El proyecto Xcode
incluido se genera determinísticamente con Python, sin XcodeGen. La validación
estructural y sintáctica no demuestra que Xcode compile o que Apple lo acepte.

## Desde Windows

Requisitos: Git, editor (por ejemplo VS Code), Python 3.13; acceso autorizado al
repositorio privado. No cambies su visibilidad. Desde PowerShell:

```powershell
git fetch origin
git switch feature/datacore-ios
py -3.13 ios/tools/verify_project.py
py -3.13 -m venv api/.venv
.\api\.venv\Scripts\python.exe -m pip install -c api/constraints-tested.txt -r api/requirements-dev.txt
.\api\.venv\Scripts\python.exe -m unittest discover -s api/tests -v
.\api\.venv\Scripts\python.exe scripts/check_api_contract.py
.\api\.venv\Scripts\python.exe -m uvicorn api.datacore_api.main:app --host 127.0.0.1 --port 8100 --no-access-log --no-proxy-headers
```

Abre `http://127.0.0.1:8100/docs`. La API no necesita SQL, Streamlit ni Groq.
No abras puertos del router, no uses `0.0.0.0` ni publiques este servicio.
No hay que modificar la instalación/servicios SQL Server de tu computadora.

Edita `ios/DataCoreAI/Sources/` y `ios/Packages/DataCoreDomain/` desde Windows.
Si agregas archivos Swift/recursos o cambias targets, regenera el proyecto:

```powershell
py -3.13 ios/tools/generate_project.py
py -3.13 ios/tools/verify_project.py
```

Incluye en el commit el generador, fuentes y proyecto resultante. Las copias de
`contracts/demo-v1.json` en API/paquete deben ser idénticas; la prueba lo verifica.
El generador de ícono opcional usa Pillow (`generate_icon.py`), solo herramienta
de autoría: el PNG final ya está incluido y no es una dependencia de compilación.

**Windows no ejecuta Xcode, SwiftUI Previews, el simulador iOS ni firma un IPA.**
Un iPhone físico tampoco puede compilar estas fuentes por sí mismo. Se necesita
macOS propio, prestado o CI autorizado para instalar una compilación nativa.
No se contrató ni ejecutó un servicio macOS en esta entrega.

## Desde macOS: compilar y probar

1. Instala Xcode 26.3 y sus componentes iOS; ábrelo y acepta sus licencias.
   Verifica `xcodebuild -version`. Una versión posterior puede requerir actualizar
   la selección de SDK/runner; las exigencias de SDK de App Store cambian.
2. Clona el repositorio privado y selecciona `feature/datacore-ios`.
3. Desde su raíz:

```bash
python3 ios/tools/verify_project.py
swift test --package-path ios/Packages/DataCoreDomain
open ios/DataCoreAI.xcodeproj
```

4. Selecciona esquema **DataCoreAI**, un simulador iPhone con iOS 17+ y **Run**.
   No necesita una cuenta de pago ni firma para el simulador.
5. En CLI, sustituye el nombre por uno que exista en `xcrun simctl list devices available`:

```bash
xcodebuild -resolvePackageDependencies -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI
xcodebuild test -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI \
  -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' \
  -resultBundlePath ios-test-results.xcresult CODE_SIGNING_ALLOWED=NO
xcodebuild build -project ios/DataCoreAI.xcodeproj -scheme DataCoreAI \
  -configuration Release -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO
xcrun xcresulttool export attachments --path ios-test-results.xcresult --output-path ios-simulator-captures
```

`swift test` cubre modelos/repositorio; `xcodebuild test` añade trece pruebas del
store/API/exportadores nativos y tres recorridos UI. Los adjuntos XCUITest capturan
las seis pantallas. El `#Preview("Demo nativa")` carga el repositorio real demo;
requiere Xcode y todavía no se ha renderizado en esta entrega. No se sustituyen
capturas del simulador por renders HTML. La evidencia disponible de API e ícono
está enlazada en [el informe](../docs/IOS_VALIDATION.md).

## Recorrido funcional sin servidor

- **Inicio:** ingresos calculados del historial, gráfico seleccionable por fecha,
  selector de serie, evidencia tabular y alertas. La semana ficticia por defecto
  es 1–7 de noviembre de 2026: 7 ventas, S/ 1,347.70, 83 unidades y 3 alertas.
- **Productos:** búsqueda, filtro de categoría y ficha; agregar al carrito.
- **Ventas:** selección, cantidades, eliminación, total, confirmación explícita
  de venta simulada e historial. Descuenta stock y agrega historial **en memoria**.
  Dos toques/reintento con el mismo UUID no duplican la venta; no se persiste.
- **Más → Inventario:** estados Todos/Alertas/Agotados, búsqueda, cantidades y mínimos.
- **Más → Reportes:** periodo, gráfico, tabla, CSV UTF-8/PDF y compartir nativo.
- **Más → Asistente IA:** cuatro preguntas permitidas, respuestas deterministas,
  fuentes y periodo. No ejecuta SQL ni utiliza Groq/IA generativa.
- **Ajustes:** restaurar demo con confirmación y conexión opcional a API demo HTTPS.
  El carrito y las ventas se pierden al terminar el proceso/restaurar demo.

La conexión remota solo acepta HTTPS con certificado válido, sin redirecciones,
credenciales en URL ni excepciones ATS. No conectará directamente a la API HTTP
de Windows: esta sirve para probar contratos desde el PC. No hace falta API para
probar el iPhone en modo local. Un servidor HTTPS autorizado para pruebas es
trabajo posterior; no se ha desplegado. En modo remoto la confirmación de venta
está deshabilitada y la API solo calcula previsualizaciones sin persistir.

## Identidad y firma configurables

`ios/Config/Base.xcconfig`: `DATACORE_BUNDLE_ID` (por defecto un identificador de
ejemplo que **no debes registrar tal cual**), versión/build y equipo de desarrollo.
Para valores locales crea `ios/Config/Local.xcconfig` (ignorado):

```xcconfig
DATACORE_BUNDLE_ID = identificador.unico.del.propietario
DATACORE_DEVELOPMENT_TEAM = ID_DE_EQUIPO
```

No pongas certificados, contraseñas, tokens de App Store Connect ni claves de
firma en el repositorio o argumentos visibles de logs. Configura la cuenta Apple
en Xcode y permite firma automática cuando decidas instalar en dispositivo.
Para instalación personal, una cuenta gratuita puede tener limitaciones de
provisionamiento y caducidad; comprueba las condiciones vigentes de Apple.

## CI macOS sin fusionar main

**No ejecutar hasta autorizar costo/cuota.** El HEAD mantiene `[skip ci]`.
La antigua etiqueta `ios-macos-cost-approved` se retiró: el evento pull_request
está afectado por skip y el workflow aún no estaba registrado para dispatch.
No es necesario retirar skip ni provocar las otras matrices para intentar la
ruta documentada de **pull_request_review**.

El propietario revisa el SHA completo de la PR #12 y, después de comprobar su
presupuesto, envía una review de tipo **Comment** (no Approve ni comentario de
Conversation) con una única línea exacta:

```text
AUTHORIZE_IOS_SIMULATOR SHA_COMPLETO_APROBADO MAX_30_MINUTES
```

El workflow compara propietario, PR #12, mismo repo/rama, SHA de review/head,
texto exacto y primer intento. No reusa autorización en pushes o re-runs. La
ruta se contrastó con reglas oficiales y actionlint, y una review neutral permitió
registrar el workflow con job omitido: runner nulo, 0 pasos y 0 ms facturables
([evidencia](https://github.com/Arsubas002/DataCoreAI/actions/runs/42379840879)).
No se envió la autorización positiva ni se inició macOS; el arranque real sigue
dependiendo de presupuesto, permisos/política y disponibilidad.
Dispatch no se da por disponible mientras no exista registro/condiciones de GitHub.
No se cambia main. No envíes una review de autorización solo para probar el evento.

[Receta completa PowerShell, diagnóstico, alternativa y descarga](../docs/IOS_FIRST_BUILD.md).
Si el evento no arranca, comprobar Actions/reviews antes de repetir; no cambiar
main ni contratar servicios para sortearlo. Alternativa: un Mac prestado/de
confianza autorizado, con SDKs ya instalados, ejecutando el mismo script:

```bash
export DEVELOPER_DIR=/Applications/Xcode_26.3.app/Contents/Developer
export DATACORE_EXPECTED_XCODE=26.3
bash ios/tools/run_simulator_tests.sh
```

El inventario del runner anuncia Xcode 26.3, pero la VM real debe superar un
preflight que comprueba directorio, versión real y SDK 26+. No hay sustitución
silenciosa ni descargas. El script exige carpeta de evidencia vacía y dos iPhone
compatibles; conserva logs al fallar y produce hashes, JSON XCTest, xcresult y
capturas reales si Xcode los genera, más build Release iPhoneOS sin firma. Ninguno
es un IPA instalable. Retención de artefactos **1 día**; el job no
firma ni produce IPA. Mainstep 25 min y job 30 min; no es garantía de costo fijo.

No se han ejecutado macOS, tests nativos ni un iPhone en esta revisión. El simulador
puede usar un runtime posterior a iOS 17: sigue pendiente probar el mínimo real.

## TestFlight y App Store: pasos pendientes del propietario

1. Verifica las pruebas macOS/iPhone y corrige compilación, accesibilidad y UI antes
   de crear una entrega. Usa el checklist de [accesibilidad](../docs/IOS_ACCESSIBILITY.md).
2. Revisa costos/condiciones vigentes de Apple Developer Program y decide si deseas
   inscribirte. TestFlight/App Store requieren la cuenta y permisos adecuados;
   no se ha contratado membresía ni creado una ficha.
3. Elige identificador único, equipo, versión y número de build. Revisa ícono,
   nombre comercial y derechos. No se afirma disponibilidad de marca/Bundle ID.
4. Verifica prácticas reales de datos y publica por tu cuenta una política de
   privacidad exacta con URL accesible y soporte. No uses el documento técnico
   como si fuera una política legal aprobada. Completa la ficha App Privacy.
5. Revisa `PrivacyInfo.xcprivacy`, dependencias, cifrado/export compliance y permisos
   tras cada cambio; el manifiesto demo no certifica cumplimiento normativo.
6. En Xcode selecciona dispositivo genérico, **Product → Archive** con Release y
   firma del propietario. Valida en Organizer antes de subir. La compilación
   Release para simulador no es un archivo firmado listo para la tienda.
7. En App Store Connect crea la app privada de desarrollo, carga un build mediante
   Xcode/Transporter autorizado y completa metadatos, clasificación, soporte,
   privacidad y capturas **reales** de tamaños requeridos por Apple entonces.
8. Configura testers internos de TestFlight, instala la app TestFlight en tu iPhone
   de Windows y acepta la invitación. Si eliges testers externos, se puede requerir
   Beta App Review. Windows recibe la app por TestFlight, no la compila.
9. Prueba offline, modo oscuro, Dynamic Type, VoiceOver, Reduce Motion, rotación,
   errores HTTPS, stock, simulación y archivos compartidos en el iPhone físico.
10. Resuelve autenticación, aislamiento por empresa, backend de producción y borrado
    de cuenta si añades cuentas. No cambies a datos reales sin una revisión propia.
11. Evalúa con Apple si una versión solo demo cumple sus criterios de utilidad y
    publicación. Esta base no promete aprobación ni está lista para enviar hoy.

Ninguno de estos pasos implica autorización para fusionar main, publicar código,
contratar servicios, desplegar API ni acceder al SQL Server local.
