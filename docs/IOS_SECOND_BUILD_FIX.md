# Segundo build real: ambigüedad de CGFloat en exportación PDF

> Histórico: el tercer run ya compiló y ejecutó la app. Estado actual en
> [IOS_KEYCHAIN_FIX.md](IOS_KEYCHAIN_FIX.md).

## Evidencia y primer error

Se partió del HEAD actual de PR #12, `162e03e3d63f3c2fb4c09014932912e1087cda9a`,
sin volver a commits anteriores. Se leyeron completos los logs del
[run 42386740095](https://github.com/Arsubas002/DataCoreAI/actions/runs/42386740095)
y se descargó su artefacto ID **13580077038** por el conector GitHub después de
que la descarga CLI devolviera Forbidden. Se verificaron tamaños y SHA-256 de los
**34 archivos** del manifiesto, incluido xcresult. Los hashes y resultados están
en [IOS_SECOND_BUILD_RESULTS.json](IOS_SECOND_BUILD_RESULTS.json); no se publican
logs completos, URLs temporales ni rutas privadas adicionales.

El primer y único diagnóstico `error:` de `small-tests.log` es la línea **789**:

```text
ios/DataCoreAI/Sources/ReportExporter.swift:43:47:
error: ambiguous use of 'greatestFiniteMagnitude'
```

En el log completo del job aparece en la línea 1051. Las notas siguientes señalan
los candidatos `CoreFoundation.CGFloat.greatestFiniteMagnitude` y
`Swift.Double.greatestFiniteMagnitude`. El fallo es del SwiftCompile arm64 de
ReportExporter, no de resolución de paquetes. Los avisos de bibliotecas XCTest
firmadas que no se pueden strip no son errores del código de la app.

Preflight real: Xcode **26.3 (17C529)**, SDK simulador **26.2**. Los ajustes efectivos
muestran Debug/iphonesimulator/ONLY_ACTIVE_ARCH=YES/ARCHS=arm64; el paquete y ambos
consumidores observados piden arm64, sin slices ausentes. Por tanto el bloqueo
anterior de DataCoreDomain fue superado en esta ejecución. No se modifica esa
corrección ni Package.swift/proyecto/esquemas.

El paquete aprobó **26 tests en macOS antes del build**. El summary app/UI tiene
**totalTestCount=0, result=unknown**. El manifiesto de capturas está vacío. No hay
app comprobada, capturas de sus pantallas, build Release confirmado ni IPA.

## Causa y corrección

CGSize tiene inicializadores que aceptan distintos tipos escalares. Con el literal
523 y `.greatestFiniteMagnitude` sin calificar, el compilador encuentra tanto
CGFloat como Double y no puede seleccionar el overload.

En `ios/DataCoreAI/Sources/ReportExporter.swift:43` se cambia solamente:

```swift
with: CGSize(width: 523, height: CGFloat.greatestFiniteMagnitude),
```

Se conserva un límite finito para la medición de texto, el ancho, paginación,
contenido del PDF y controles de exportación. No se usa infinito ni se elimina la
exportación para evitar compilarla. Las pruebas nativas existentes de contenido
CSV/PDF y paginación permanecen intactas, pendientes de ejecución real.

La búsqueda por todos los Swift (app, tests y paquete, excluyendo productos de
`.build`) encontró un solo greatestFiniteMagnitude. Los otros nueve `.infinity`
son `.frame(maxWidth:)` de SwiftUI, con contexto escalar, y se conservan. No se
identificó otro diagnóstico de compilador en los logs; esto no garantiza que Xcode
no encuentre otro error en fases posteriores.

## Prevención y validación gratuita

- `ios/tools/swift_source_checks.py` exige calificar greatestFiniteMagnitude con
  su tipo en fuentes Swift. Es una regla textual conservadora y específica, no un
  parser ni un sustituto de typecheck iOS.
- `ios/tools/verify_project.py` incorpora la regla; ya lo ejecutan los workflows
  existentes, sin introducir nuevos eventos ni quitar el guard de autorización.
- `ios/tools/tests/test_swift_source_checks.py` añade **4 regresiones**: rechaza la
  expresión original, admite tipos explícitos, revisa los Swift y ejecuta swiftc
  Foundation sobre la expresión real extraída del exportador. Comprueba que el
  original falla por ambigüedad y que la corrección supera typecheck. Esta prueba
  se omite explícitamente si no hay Swift instalado; **aquí sí se ejecutó**.

Resultados ejecutados en Linux, Swift 6.2.4/Python 3.13:

| Suite | Resultado |
| --- | --- |
| Swift Domain/sesión | 26 aprobadas |
| FastAPI | 21 aprobadas |
| Herramientas, incluidas las 4 regresiones nuevas | 29 aprobadas, ninguna omitida |
| Regresión comercial aislada | 86 aprobadas, 4 SQL omitidas; cero intentos SQL/HTTP reales |

**162 aprobadas y 4 omitidas**. Los 26 tests históricos macOS no se suman de nuevo.
También correctos: generación determinista/grafo Xcode, contrato OpenAPI, parse de
Swift UI/tests, Ruff, Bash, actionlint y diff. La prueba Foundation reproduce un
error real de tipos en Linux; **no compila UIKit, SwiftUI ni la app iOS completa**.
No se ejecutaron pruebas Windows ni una tercera ejecución macOS.

## Tercera compilación preparada, no iniciada

No se cambia el workflow ni se envía una review autorizante. Commits con
`[skip ci]`; no re-run del run anterior. El propietario debe revisar el nuevo HEAD
publicado en PR #12 y el costo/cuota, y solo si autoriza enviar una nueva review
**Comment** (no comentario de Conversation), una sola línea:

```text
AUTHORIZE_IOS_SIMULATOR SHA_COMPLETO_ACTUAL_DE_PR_12 MAX_30_MINUTES
```

La autorización anterior no se reutiliza. El workflow verifica propietario, PR,
SHA exacto y primer intento; conserva preflight, tests del paquete/app/UI, dos
tamaños de iPhone, modo oscuro/AX3, builds Release sin firma y carga de evidencias
incluso ante fallo. Ver [procedimiento](../ios/README.md#ci-macos-sin-fusionar-main).
Después descargar artefactos antes de su retención de 1 día y verificar logs,
XCTest, capturas reales y códigos de salida. No basta con la existencia del ZIP.

La corrección espera confirmación con Xcode. No se afirma que la app compile o sea
instalable. Sin nuevas ejecuciones macOS/gastos, merge, SQL, Streamlit, datos,
credenciales, publicación ni despliegue.
