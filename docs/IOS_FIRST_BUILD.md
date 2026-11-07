# Preparación de primera compilación real · 2026-11-07

## HEAD y alcance

Se comprobó HEAD local, remoto y de PR #12 antes de editar:
`5c81da4b3766fdadd3e5328bfeac9e8d5c728bee`, rama `feature/datacore-ios`.
No se vuelve al commit inicial. Se conservan CommercialSession/Observation,
carrito pendiente, las seis pantallas y su diseño. No se modifican Streamlit,
SQL, servicios comerciales ni datos reales. API permanece exclusivamente demo.

**Estado exacto:** no se ha ejecutado Xcode/macOS, simulador, iPhone ni firma.
No existe un IPA generado ni una aplicación instalable entregada. Parsear Swift,
probar Foundation/Observation en Linux y validar PBX no demuestra compilación iOS.

## Problemas encontrados y corregidos

| Problema | Cambio |
| --- | --- |
| URLSession puede expresar cancelación como URLError.cancelled, no CancellationError | Se conserva la cancelación en el adaptador móvil y la sesión; no muestra un falso fallo de red. Dos tests reales de sesión Linux cubren cancelación/reintento y timeout sin detalles sensibles |
| No había cobertura móvil preparada para respuestas HTTP/JSON/tamaño/timeout | URLProtocol inyectado solo en la sesión de test, sin sockets; cuatro tests nativos nuevos. Se mantienen endpoint fijo, HTTPS, no redirecciones, sesión efímera y límite de 2 MiB |
| Sesiones URLSession podían quedar abiertas después de liberar el repositorio | invalidación/cancelación al destruirlo; almacenamiento de credenciales deshabilitado explícitamente |
| El fallo de Xcode ocurría antes de crear evidencia | Preflight dentro del script crea JSON/log, registra selección y aplicaciones observadas, exige versión real de xcodebuild y SDK, y falla sin instalar/sustituir herramientas |
| Exportación de capturas fallida se ignoraba con `|| true` | Conserva el error original de compilación; si compilación/tests finalizan bien pero falla exportación o faltan capturas, el proceso también falla |
| Resultados difíciles de auditar desde Windows | JSON XCTest por tamaño, logs, xcresult, capturas y manifiesto SHA-256 con SHA y estado dirty del código, fase y código de salida |
| Ruta por etiqueta no era utilizable en el HEAD actual | Se sustituye por autorización mediante review neutral del propietario ligada al SHA. No necesita retirar skip ni disparar matrices Linux/Windows |
| Una reejecución podía volver a gastar con la misma señal | Solo run_attempt=1; no triggers de edited/synchronize/labels. Reintentar requiere una autorización nueva |

No se añadieron funciones comerciales ni se cambió la distribución visual.
Los nuevos cuatro tests URLProtocol y los otros nueve tests nativos siguen **sin
ser ejecutados**. No se presentan los dobles de los tests de scripts como Xcode,
xcresult reales o capturas de iPhone.

## Validación ejecutada realmente en este entorno

| Suite/verificación | Resultado |
| --- | --- |
| Swift 6.2.4 Linux, dominio y CommercialSession | **26 aprobadas**, incluidos stock, concurrencia, UUID, recuperación, CSV, fechas, ranking y errores de red |
| API Python 3.13 | **21 aprobadas**, incluidas OpenAPI, stock, preview sin persistir, límites, autorización demo y errores |
| Herramientas Python | **13 aprobadas**: plan de simuladores, versión/SDK, hash de archivos y orquestación/errores con dobles explícitos |
| Regresión aislada Streamlit | **90 descubiertas, 86 aprobadas y 4 SQL omitidas**; cero intentos SQL/HTTP reales |
| Sintaxis Swift UI/tests, grafo Xcode, esquema/plists | Aceptados/consistentes; no es typecheck de frameworks Apple |
| OpenAPI versionado, pip check, pip-audit | Contrato idéntico, dependencias compatibles, sin vulnerabilidades conocidas en la consulta |
| Bash, actionlint, Ruff y git diff --check | Correctos |

**146 tests aprobados, 4 SQL omitidos.** Los trece tests Python incluyen cuatro
pruebas del script con comandos falsos en carpetas temporales; prueban propagación
de errores e inventario, no el compilador ni la UI. Trece tests nativos y tres
recorridos UI están preparados para macOS, no incluidos entre los aprobados.
PDF UIKit, Keychain, TLS real, exportaciones/compartición iPhone y las capturas
siguen pendientes. CSV y cálculos se verificaron en el paquete Swift real.

No hay Windows en este ejecutor; no se inició un runner facturable para repetirlo.
La evidencia [API/estructura anterior](https://github.com/Arsubas002/DataCoreAI/actions/runs/42373903278)
y [regresión anterior](https://github.com/Arsubas002/DataCoreAI/actions/runs/42373903233)
pertenece a 1ce1c74. No se afirma que valide el HEAD nuevo. La API y Streamlit no
cambian. Los tests Python de preflight/manifest son portables; los cuatro de Bash
se omiten expresamente en Windows, donde se validará el resto tras autorización.

## Resultado de la investigación de GitHub Actions

Antes de la comprobación, la API solo mostraba activos `api-demo.yml` y `tests.yml`.
Después de publicar el YAML se envió **una review neutral no autorizante** de tipo
Comment, sobre 51aa10c: review 5812650992. Su cuerpo niega expresamente el gasto y
no coincide con la frase exigida. No se envió dispatch, etiqueta, re-run ni review
de autorización.

GitHub descubrió el workflow desde la PR y creó el
[run 42379840879](https://github.com/Arsubas002/DataCoreAI/actions/runs/42379840879)
con evento pull_request_review y HEAD 51aa10c, que también tenía skip. Resultado:
**simulator omitido, runner_id=null, runner_name=null, cero pasos**. La API de timing
informó **MACOS.total_ms=0**. El workflow quedó registrado activo con ID 410379129.
Esto comprueba realmente descubrimiento/registro y negación de ejecución, no
compilación ni presencia de Xcode. El YAML no existe en main y main no cambió.

- `workflow_dispatch`: el botón requiere el YAML en la rama predeterminada.
  La documentación también permite dispatch por API/CLI después de una primera
  ejecución registrada. No se presupone que hoy pueda usarse con este YAML.
- `pull_request: labeled`: no exige por sí mismo un YAML en main, pero los
  marcadores `[skip ci]` del HEAD omiten workflows de tipo pull_request. Retirar
  el marcador mediante otro push puede iniciar además las matrices hospedadas.
  Por eso **no se recomienda la etiqueta antigua**.
- `pull_request_review: submitted`: es un evento distinto. La documentación
  lo sitúa en la referencia merge de la PR y no impone la condición de rama
  predeterminada de dispatch. Las instrucciones skip documentadas afectan a
  push/pull_request, no a pull_request_review. Se prepara esta ruta para no
  retirar skip ni consumir otras matrices innecesariamente.
- El propietario puede enviar una review de tipo **Comment** sobre su propia PR;
  no se usa Approve (que no puede aprobar su propia PR) ni un comentario normal
  de Conversation/issue_comment.
- El job comprueba propietario/autor de review, PR #12, repo/rama, commit revisado
  igual al head actual, texto exacto de autorización y primer intento. Checkout del
  SHA del evento; sin secretos de firma y con token read-only no persistido.

**Grado de comprobación:** documentación/actionlint más evento real de descubrimiento
con ejecución denegada y 0 ms facturables. La condición de autorización positiva,
arranque del runner, presencia real de Xcode y ejecución nativa **no se probaron**:
requieren autorización. El endpoint administrativo de permisos de Actions devolvió
403 a la integración; no se eludió esa limitación. El propietario debe revisar cuota,
permisos y política; el registro no garantiza disponibilidad de una VM.
Si no arranca, no repetir el envío a ciegas: revisar review y Actions primero.
La alternativa segura es ejecutar el mismo script en un Mac prestado/autorizado,
sin cambiar main, crear repositorios auxiliares ni contratar servicios.

Referencias oficiales:
[Eventos](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_review),
[skip](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/skipping-workflow-runs),
[reviews REST](https://docs.github.com/en/rest/pulls/reviews#create-a-review-for-a-pull-request).

## Runner y comprobación real de herramientas

El inventario público consultado anuncia macOS 15.7.9, Xcode 26.3 en
`/Applications/Xcode_26.3.app` y SDK/simuladores iOS 26.2. Esto **no prueba** qué
habrá en la VM asignada. La imagen puede cambiar.

El preflight real exige DEVELOPER_DIR existente, observa `xcodebuild -version`,
comprueba versión 26.3 y obtiene el SDK instalado con xcrun (26+). Si algo no
coincide, guarda diagnóstico y se detiene antes de compilar. No usa fallback,
no descarga runtimes ni contrata recursos. El plan exige dos iPhone diferentes
con runtime disponible iOS >=17 y <=SDK. Probar en un runtime posterior no
certifica la ejecución física mínima iOS 17.

[Inventario oficial del runner](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md).
[Apple exige Xcode/SDK 26+ para subir actualmente](https://developer.apple.com/news/upcoming-requirements/).
Deployment target 17.0, Swift language mode 5 y paquete macOS 14+ se conservan.

## Una única ejecución: instrucciones del propietario

**No ejecutar aún sin revisar cuota/precio/presupuesto del repositorio privado.**
El job tiene timeout 30 min, paso de pruebas 25 min y reserva hasta 4 min para subir
artefactos; no es un tope financiero garantizado. Puede consumir minutos macOS y
almacenamiento si supera la cuota. Retención del artefacto reducida a **1 día**.
No se ha consultado ni asegurado saldo gratuito. No hay firma, archive ni subida
Apple; no requiere membresía Apple para esta compilación de simulador.

1. Revisar los cambios de #12, copiar su **SHA completo aprobado**, comprobar que
   sigue siendo el head y que la PR no tiene conflicto de merge. Confirmar que
   Actions está permitido y revisar Billing antes de autorizar.
2. Identificarse en GitHub como propietario Arsubas002. En Files changed → Review
   changes, seleccionar **Comment** y enviar exactamente una línea:

   ```text
   AUTHORIZE_IOS_SIMULATOR SHA_COMPLETO_APROBADO MAX_30_MINUTES
   ```

   Sustituir el marcador por los 40 caracteres hex del SHA, sin backticks ni líneas
   adicionales. No usar la antigua etiqueta ni hacer un commit vacío sin skip.
3. Alternativa PowerShell/gh, solo después de autorizar explícitamente el gasto:

   ```powershell
   $sha = "PEGAR_AQUI_LOS_40_CARACTERES_DEL_SHA_REVISADO"
   if ($sha -notmatch '^[0-9a-f]{40}$') { throw "SHA no válido" }
   $actual = gh pr view 12 --repo Arsubas002/DataCoreAI --json headRefOid --jq .headRefOid
   if ($actual -ne $sha) { throw "Cambió el HEAD; revisar antes de autorizar" }
   $payload = @{ event = "COMMENT"; commit_id = $sha; body = "AUTHORIZE_IOS_SIMULATOR $sha MAX_30_MINUTES" } | ConvertTo-Json
   $path = Join-Path $env:TEMP "datacore-ios-review.json"
   [IO.File]::WriteAllText($path, $payload, [Text.UTF8Encoding]::new($false))
   gh api --method POST repos/Arsubas002/DataCoreAI/pulls/12/reviews --input $path
   ```

   El archivo solo contiene autorización/SHA, no credenciales. Autenticación en el
   propio GitHub CLI, nunca copiar tokens/contraseñas al repo o al chat. Esta receta
   no se ejecutó desde el agente.
4. En Actions comprobar que apareció **una sola ejecución**, SHA correcto y actor.
   Si la respuesta de API fue incierta o no hay run, comprobar primero el historial
   de reviews y Actions; no reintentar automáticamente. Un comentario normal o una
   etiqueta no inicia este job. Cancelarlo manualmente si se supera lo aceptado.
5. No usar Re-run: run_attempt>1 se omite para no reutilizar autorización. Si falla,
   revisar logs antes de autorizar otra review/ejecución.

## Evidencia y descarga

El script genera preflight/toolchain, estructura, Swift, plan de simuladores,
logs de tests pequeños/grandes y Release, dos `.xcresult`, dos summaries JSON y
adjuntos reales producidos por XCUITest. Los tests recorren seis pantallas en
apariencia normal y oscuro/AX3, dos tamaños, venta e historial. No equivalen a una
prueba manual VoiceOver/contraste o a un iPhone físico.

El trap conserva fallo/fase original; fallar al extraer evidencia impide un falso
éxito. El manifiesto SHA-256 inventaría lo que realmente exista, incluido SHA y
estado dirty del código; **no afirma por sí mismo que las pruebas hayan pasado**.
Consultar los summaries y logs, no solo que exista un ZIP. Un timeout/kill externo
puede interrumpir la recolección; el paso de subida usa always y margen de tiempo,
pero no se garantiza evidencia completa ante un cierre forzado de la VM.

Descargar desde la página de la ejecución → Artifacts →
`ios-simulator-evidence-SHA`, con sesión autorizada, antes de 1 día. O:

```powershell
gh run download ID_DE_EJECUCION --repo Arsubas002/DataCoreAI --name "ios-simulator-evidence-$sha" --dir ios-evidence-download
```

Windows abre PNG, logs, JSON y manifiesto; `.xcresult` se inspecciona con Xcode.
Se verificaron listado y descarga autenticada de **un artefacto histórico Windows**
del run 42373903233 (281 bytes, no expirado). Esto confirma acceso existente a
artefactos del repo, no la subida/descarga de un nuevo artefacto macOS inexistente.
La integración upload-artifact actual debe comprobarse en la ejecución autorizada;
si falla, Actions lo marca como error. No se generaron imágenes iPhone simuladas.

## Firma, TestFlight e información que falta

[Lista exacta del propietario](IOS_TESTFLIGHT_CHECKLIST.md). La compilación Release
**de simulador** no es una app de dispositivo y no produce un IPA instalable.
Instalar vía TestFlight requiere después un archive iPhoneOS Release firmado,
cuenta Apple Developer Program/roles correctos, App Store Connect y build procesado.
El iPhone necesita iOS 17+; para TestFlight no se pide UDID ni Developer Mode.

No se solicita ninguna contraseña, OTP, certificado P12, clave P8 ni perfil privado
en GitHub. No se añaden secretos de Apple, no se crea una ficha de tienda ni se
publica. La siguiente acción bloqueada es autorizar una única ejecución macOS
tras revisar su costo. Hasta ella no puede afirmarse compilación iOS ni corregirse
un error dependiente de SDK que solo aparezca en Xcode.
