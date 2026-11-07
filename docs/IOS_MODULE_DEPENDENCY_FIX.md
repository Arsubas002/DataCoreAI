# Primer fallo real de Xcode: DataCoreDomain y arquitecturas

> Informe histórico del primer fallo. La segunda ejecución confirmó el módulo
> arm64 y avanzó hasta un error distinto; ver [estado actual](IOS_SECOND_BUILD_FIX.md).

## Ejecución investigada

[GitHub Actions 42381387852](https://github.com/Arsubas002/DataCoreAI/actions/runs/42381387852),
HEAD `f674f05b625411ebf32c154d8469d592b08f7d0b`, job 128429549240.
No se volvió a ejecutar ese job. Se leyeron sus logs completos y se descargó el
artefacto `ios-simulator-evidence-f674f05…` (ID 13578026354, ZIP 56079 bytes).
Se verificaron tamaño/SHA-256 de los **29 archivos** de su manifiesto; el artefacto
indica source_dirty=false, exit_code=65 y last_phase=small-tests.
[Resultados y hashes verificables](IOS_MODULE_FIX_RESULTS.json).

**Estado real:** sí hubo ejecución macOS/Xcode autorizada por el propietario.
La app no terminó de compilar. No se ejecutaron los tests nativos/UI, no se
produjeron capturas de la app y no hay IPA. La corrección actual todavía no fue
compilada con Xcode; está pendiente una segunda ejecución autorizada.

## Primer error real, no el resumen final

En `small-tests.log`, el primer diagnóstico `error:` está en la línea **590**:

```text
ios/DataCoreAI/Sources/APIRepository.swift:1:8:
error: Unable to find module dependency: 'DataCoreDomain'
```

No hay un error de compilación anterior de DataCoreDomain en ese log. El análisis
se hizo desde resolución/grafo y comandos del compilador, no solo desde las líneas
“Testing cancelled” o “exit 65”. El log del job también contiene los 26 tests del
paquete ejecutados correctamente en macOS **antes** de intentar construir la app.
No se suman esos 26 históricos otra vez a los tests gratuitos de esta revisión.

La evidencia previa al error:

1. Preflight observado: runner **macos-15-arm64**, Xcode **26.3 / 17C529**, SDK
   iPhoneSimulator **26.2**. Ya no se trata solo del inventario público del runner.
2. Resolve Package Graph encuentra `Packages/DataCoreDomain @ local`.
3. El grafo de seis targets incluye dependencias explícitas App → DataCoreDomain
   y UnitTests → App/DataCoreDomain. El recurso del paquete también se genera.
4. El compilador ejecuta DataCoreDomain con `-target arm64-apple-ios17.0-simulator`
   y copia el producto:

   ```text
   Debug-iphonesimulator/DataCoreDomain.swiftmodule/arm64-apple-ios-simulator.swiftmodule
   ```

5. DataCoreAI solicita **dos** invocaciones:

   ```text
   -module-name DataCoreAI -target arm64-apple-ios17.0-simulator
   -module-name DataCoreAI -target x86_64-apple-ios17.0-simulator
   ```

6. El resumen de comandos fallidos identifica específicamente
   **SwiftDriver DataCoreAI normal x86_64**. No se emitió una slice x86_64 del
   paquete en ese build Debug.

## Causa raíz

El generador omitía la política de arquitecturas de las configuraciones del
proyecto. App y targets nativos heredaron Debug de todas las arquitecturas estándar
(arm64 + x86_64 para ese SDK de simulador). SwiftPM Debug construyó únicamente la
arquitectura activa del destino, arm64. Por tanto la app intentó importar un módulo
x86_64 que no se había producido.

**No era un paquete ausente ni un producto mal nombrado**: fue resuelto, dependido,
compilado y copiado para arm64. Tampoco se estaba importando el producto macOS de
`.build` desde iOS: el producto iOS tenía el triple y directorio iphonesimulator
correctos. El search path `-I .../Debug-iphonesimulator` era coherente; no hacía falta
inventar rutas hacia `.build`, cambiar a biblioteca dinámica ni añadir DEFINES_MODULE.

Se revisó `Package.swift`: producto/módulo/target DataCoreDomain coinciden, ruta
local válida, herramientas Swift 5.9, iOS mínimo 17 y macOS mínimo 14. Se conserva
sin cambios. El esquema mantiene test en Debug y archive en Release.

## Corrección y archivos

- `ios/tools/generate_project.py`: política **del proyecto**, compartida por todos
  los targets nativos: `Debug ONLY_ACTIVE_ARCH=YES`, `Release ONLY_ACTIVE_ARCH=NO`.
- `ios/DataCoreAI.xcodeproj/project.pbxproj`: regenerado; solo esas dos propiedades
  nuevas en configuraciones de proyecto. App y tests heredan la misma política.
- No se fija ARCHS a arm64 ni se añade EXCLUDED_ARCHS. En un host Intel, Debug
  seleccionará la arquitectura Intel de su destino; Release conserva las
  arquitecturas estándar soportadas, incluidas las de simulador. No se elimina
  soporte Intel ni se desactivan pruebas para conseguir un verde.
- `ios/tools/module_integration.py`: comprueba referencia local, producto declarado
  y enlazado, política de proyecto/targets y ajustes efectivos de Xcode. Diagnostica
  también slices/comandos/primer error en el log completo.
- `ios/tools/verify_project.py`: llama a la nueva comprobación gratuita de integración.
- `ios/tools/run_simulator_tests.sh`: antes de tests pide los build settings reales
  de Debug/destino y falla si no coinciden con SwiftPM Debug. Solo conserva campos
  permitidos, no el JSON completo con posibles variables de entorno. Al terminar,
  añade `module-diagnostic.json`, conservando el error original del compilador.
- `ios/tools/tests/test_module_integration.py`: diez regresiones de política,
  binding/linkage, overrides, Intel/ARM y reproducción del fallo real normalizado.
- `ios/tools/tests/test_first_build.py`: comprueba que el mismatch efectivo detenga
  la compilación antes de gastar en tests, además de todos los casos previos.
- Fixture `.txt` reducido y con rutas normalizadas del run real: sin logs privados
  completos ni URLs temporales de descarga incorporados al repositorio.

El analizador de logs es **diagnóstico**, no un sustituto del compilador. Una
compilación incremental puede reutilizar una slice sin volver a copiarla en el
log; por eso una ausencia observada no se trata por sí sola como prueba global.
El guard de settings valida ONLY_ACTIVE_ARCH, sin asumir que ARCHS de
-showBuildSettings ya haya sido filtrado por el planificador de Xcode.

## Pruebas gratuitas ejecutadas en la corrección

| Suite | Resultado |
| --- | --- |
| Swift 6.2.4 Linux, dominio y sesión | **26 aprobadas** |
| API Python 3.13 | **21 aprobadas** |
| Herramientas Python | **25 aprobadas**, incluyendo diez regresiones de integración y el guard previo a compilar |
| Regresión aislada Streamlit | **86 aprobadas, 4 SQL omitidas**; cero intentos SQL/HTTP reales |
| Grafo Xcode / generación / política Debug-Release | Correctos |
| OpenAPI, sintaxis Swift UI/tests, Ruff, Bash, actionlint y diff | Correctos |

**158 aprobadas y 4 omitidas**, sin una nueva ejecución macOS o Windows. Las pruebas
de orquestación usan dobles de comandos; no producen evidencia de compilación iOS.
La regresión reconstruye la omisión original y la rechaza; otra reproduce las
slices/comandos del run fallido y detecta x86_64 no observado. Las pruebas para
Intel/ARM validan la política sin fijar una CPU; no son compilaciones de esas CPUs.

Los resultados del primer run no son cero tests “aprobados” de app: su summary tiene
totalTestCount=0/result=unknown porque el build falló. Sí hay 26 tests del paquete
macOS aprobados previamente en su `domain-tests.log`, y un módulo iOS arm64 generado.
Eso no implica que la app SwiftUI ni sus tests nativos hayan compilado.

## Segunda ejecución: preparada, no iniciada

Se mantiene el mismo workflow de autorización; no se envía una review autorizante,
no se hace re-run ni se altera su condición. Los commits llevan `[skip ci]` para
no iniciar otras matrices facturables. El permiso anterior del SHA f674f05 no se
reutiliza para este nuevo código.

Cuando el propietario lo autorice, seguir [el procedimiento SHA-bound](../ios/README.md#ci-macos-sin-fusionar-main)
con el **nuevo SHA completo revisado de la PR #12**. No usar Re-run del fallo
anterior: validaría código antiguo y su guard no reutiliza el permiso. Revisar
cuota/precio antes de enviar una nueva review Comment autorizante. El job conserva
el límite de 30 min, el paso principal de 25 min, evidencias/JSON/xcresult y los
builds Release sin firma. No se han generado gastos adicionales desde esta tarea.

En la segunda ejecución comprobar:

1. `debug-architecture-settings.json`: Debug, iphonesimulator y ONLY_ACTIVE_ARCH=YES
   para los targets observados; sin overrides del usuario/CLI que lo reviertan.
2. `small-tests.log`: consumidor y paquete para la arquitectura del destino; ausencia
   del error de importación. Conservar cualquier diagnóstico nuevo, no ocultarlo.
3. Tests nativos/UI completos, capturas de seis pantallas normal/oscuro/AX3,
   segundo tamaño y builds Release de simulador e iPhoneOS sin firma.
4. Summaries y exit codes reales, no solo presencia del ZIP. Si aparece un error
   posterior de SwiftUI/UIKit, corregirlo después de verlo en el SDK real.

**No se afirma que el build corregido funcione.** La causa observada y la política
fueron corregidas y verificadas estáticamente; solo Xcode confirmará el resultado.
Sin merge a main, cambios en SQL/Streamlit/datos, secretos, despliegue ni firma.
