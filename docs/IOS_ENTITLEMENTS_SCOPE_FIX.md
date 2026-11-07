# Cuarto run: entitlements de simulador limitados al target de la app

## Evidencia y causa raíz

Se continuó el HEAD local/remoto `1efc5956fa16a5af7262be15dc2b178778487a3b`,
sin retroceder ni descartar correcciones. Se revisaron los logs completos del
[run 42389527111](https://github.com/Arsubas002/DataCoreAI/actions/runs/42389527111)
y el artefacto **13581141535**. Se verificaron tamaños y hashes de **36 archivos**
del manifiesto. [Resultados y hashes](IOS_FOURTH_RUN_RESULTS.json).

El primer error de `small-tests.log` está en la línea **400**, para
`DataCoreDomain_DataCoreDomain`; el segundo en **411**, para `DataCoreDomain`:

```text
Build input file cannot be found:
ios/Packages/DataCoreDomain/Config/Simulator.entitlements
```

El comando real pasaba `CODE_SIGN_ENTITLEMENTS=Config/Simulator.entitlements`
globalmente. Los build settings de línea de comandos se aplican también a los
targets del paquete. Allí SRCROOT es `ios/Packages/DataCoreDomain`, no `ios`, por
lo que el input de ProcessProductPackaging no existe. No falta un recurso del
paquete ni hay que copiar un entitlement de app a SwiftPM.

La modificación anterior introdujo ese alcance incorrecto. Se corrige el alcance,
no solo la ruta: pasar la misma ruta absoluta global seguiría asignando permisos
de app a la biblioteca y a su bundle de recursos.

Preflight real: Xcode **26.3 (17C529)**, SDK **26.2**. El paquete aprobó 26 tests
macOS antes del build. App/UI: **0 ejecutados**, summary result=unknown, exit 65.
No se validó Keychain, segundo tamaño ni Release en este run. El tercer run ya
había compilado/ejecutado la app; eso no valida los cambios de firma posteriores.

## Corrección

- `ios/tools/run_simulator_tests.sh`: elimina toda la lista de overrides globales
  de firma de tests y showBuildSettings. Los comandos de test usan el proyecto.
  Los dos builds Release conservan `CODE_SIGNING_ALLOWED=NO`.
- `ios/tools/generate_project.py` y proyecto regenerado: cada target **nativo**
  (`DataCoreAI`, `DataCoreAITests`, `DataCoreAIUITests`) configura firma ad hoc,
  requerida/permitida, identidad `-`, Manual y equipo/perfil vacíos, **solo Debug**
  y con condición `[sdk=iphonesimulator*]`. No requiere certificados ni Apple ID.
- Únicamente el target **DataCoreAI**, host de la prueba real de Keychain, recibe
  `CODE_SIGN_ENTITLEMENTS[sdk=iphonesimulator*]` con valor
  `$(SRCROOT)/Config/Simulator.entitlements`. Xcode lo expande desde el proyecto
  nativo. XCTest hospedado ejecuta el código del Keychain en ese proceso.
- Los bundles de tests y el runner UI se firman ad hoc sin ese archivo explícito;
  el UI runner no accede al Keychain. No se añade entitlements a Package.swift,
  DataCoreDomain o su recurso. No hay ajustes de firma a nivel de proyecto.
- Release y Debug/iPhoneOS no reciben las condiciones nuevas. La configuración
  de firma real del propietario para dispositivo/TestFlight sigue pendiente.
- No se cambia `Simulator.entitlements`, el wrapper de Keychain, accesibilidad
  WhenUnlockedThisDeviceOnly ni ninguna prueba Swift de seguridad.

## Prevención

`ios/tools/signing_policy.py`, integrado en `verify_project.py`, comprueba el
alcance por target/configuración/SDK, que existe el archivo y que no haya un
CODE_SIGN_ENTITLEMENTS global en el script. Rechaza su uso en Release o tests y
rutas relativas al target. La generación determinista comprueba proyecto guardado
contra el generador, evitando arreglar uno y dejar el otro roto.

La comprobación de ajustes efectivos previa al build conserva un bloque `signing`
filtrado en `debug-architecture-settings.json`: ruta absoluta existente desde
SRCROOT y política ad hoc de app. Si Xcode devuelve otros targets, rechaza
entitlements heredados por cualquiera de ellos. **showBuildSettings puede devolver
solo la app** (así ocurrió en el run anterior); no se afirma haber observado
settings de SwiftPM cuando no estén presentes. La protección estática y la ausencia
de overrides globales complementan esa limitación. No se registra el entorno completo.

Ocho tests nuevos de política reproducen el override original, rutas bajo SRCROOT
de ambos targets de paquete, rutas absolutas globales (también prohibidas),
fugas a proyecto/tests/Release, identidad efectiva y ruta de app. Una regresión
nueva de orquestación asegura que una fuga detectada detenga el script antes de
compilar. La regresión de comandos existente ahora exige que los tests **no**
pasen overrides de firma y que dispositivo siga sin firma; no se elimina la prueba
real de Keychain para hacer pasar la suite.

## Verificaciones gratuitas ejecutadas

Linux, Python 3.13 y Swift 6.2.4:

| Suite | Resultado |
| --- | --- |
| Swift Domain/sesión | 26 aprobadas |
| API FastAPI | 21 aprobadas |
| Herramientas | 40 aprobadas, ninguna omitida |
| Regresión comercial aislada | 86 aprobadas, 4 SQL omitidas; cero intentos SQL/HTTP reales |

**173 aprobadas, 4 omitidas**. No se suman los resultados macOS históricos otra vez.
Correctos: contrato OpenAPI, grafo/proyecto/plists/esquema, generación determinista,
política Debug/Release, parse de fuentes/tests Swift, Ruff, Bash, actionlint y diff.
Las pruebas de comandos/settings usan dobles explícitos; la regresión del wrapper
Swift usa sustitutos Security. No equivalen a ejecutar Xcode o Keychain nativo.

## Quinta ejecución preparada, no iniciada

No se envió review autorizante, no se activó macOS, no se hizo re-run ni se
consumieron nuevos minutos. Commits con `[skip ci]`; mismo guard de propietario,
PR/SHA y primer intento. Tras revisar HEAD nuevo y costo/cuota, el propietario
puede autorizar una única ejecución mediante nueva review **Comment**:

```text
AUTHORIZE_IOS_SIMULATOR SHA_COMPLETO_ACTUAL_DE_PR_12 MAX_30_MINUTES
```

[Procedimiento y artefactos](../ios/README.md#ci-macos-sin-fusionar-main).
No reusar el permiso ni el run del commit anterior. Sin cambios en main.

Verificar con Xcode real:

1. Settings efectivos de app: Debug/simulador, firma ad hoc y ruta absoluta.
2. Ningún ProcessProductPackaging de DataCoreDomain ni su recurso pide ese archivo.
3. Firma/entitlements efectivos de app y prueba real Keychain completa, sin skips;
   los errores deben conservar operación y OSStatus si persisten.
4. Todos los tests, UI/capturas reales, segundo tamaño y builds Release sin firma.
5. Descargar logs, XCTest/xcresult y capturas antes de retención de **1 día**.

**Esta corrección no ha sido compilada con Xcode.** El acceso nativo al Keychain
sigue sin confirmarse. No hay IPA, distribución, cambios en Streamlit/SQL/datos,
credenciales reales ni contratación de servicios.
