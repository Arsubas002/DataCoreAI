# Tercer run real: Keychain, firma de simulador y diagnóstico seguro

> Histórico: la cuarta ejecución detectó propagación global de entitlements antes
> de iniciar tests. La corrección por target está en
> [IOS_ENTITLEMENTS_SCOPE_FIX.md](IOS_ENTITLEMENTS_SCOPE_FIX.md).

## Evidencia revisada

HEAD inicial local/remoto: `40f720ce7b5465be3b4a9e193db23b272a4e2e79`.
Se revisaron completos los logs del [run 42387712389](https://github.com/Arsubas002/DataCoreAI/actions/runs/42387712389),
el artefacto ID **13580745911**, summary XCTest, comandos y fuentes exactas.
Se verificaron tamaños/SHA-256 de **1177 archivos** del manifiesto; hay **13 PNG**
exportados de esa ejecución real, no imágenes simuladas. Hashes/resultados:
[IOS_THIRD_RUN_RESULTS.json](IOS_THIRD_RUN_RESULTS.json). Retención CI: 1 día.

Resultados reales del código anterior, Xcode 26.3, simulador SE 3 iOS 26.2:

- DataCoreDomain: 26 aprobadas.
- DataCoreAITests: 13 ejecutadas, 12 casos aprobados y **un caso fallido con dos
  registros de error**, no dos tests fallidos.
- DataCoreAIUITests: 3 aprobadas, incluida navegación por las seis pantallas.
- Summary combinado: 16 casos, 15 aprobados, 1 fallido, exit 65.
- La app **sí compiló y se ejecutó**. No se alcanzaron el segundo iPhone ni builds
  Release de simulador/dispositivo. No se generó IPA.

## Qué falló y qué sabemos exactamente

En `AppTests.swift` del HEAD investigado:

- línea 81: `defer { try? store.clear() }`.
- línea 82: `XCTAssertNil(try store.token())`, primera lectura de un servicio UUID vacío.
- líneas 83–84: guardados ficticios, todavía no hay evidencia de reemplazo exitoso.

El primer error está en la lectura inicial (log completo del job: línea 1419).
La segunda excepción se atribuye a la línea 81 por XCTest. Esa atribución **no
prueba un fallo de clear**: el defer usa try? y el test puede continuar desde la
aserción hasta una operación posterior que lanza. No hay OSStatus en el log.

La implementación original ya devolvía nil solo ante errSecItemNotFound y aceptaba
ese estado en delete; cambiarlo para devolver nil ante cualquier error ocultaría
problemas de seguridad. El fallo no demuestra un error de UTF-8 o de sustitución.

La configuración confirmada es `xcodebuild test ... CODE_SIGNING_ALLOWED=NO`.
El host de pruebas se lanzó sin firma/identidad de Keychain. Esto es incompatible
con un test que necesita identidad y permisos de Keychain del simulador. Es la
causa de entorno que se corrige; **errSecMissingEntitlement (-34018) es una
explicación compatible, no un status recuperado del run**. El código original
colapsaba todos los errores de Security en invalidData, impidiendo distinguir
entitlements, dispositivo bloqueado u otros estados. No puede confirmarse ese
status retrospectivamente ni garantizar la solución nativa sin el siguiente run.

## Cambios

1. `ios/tools/run_simulator_tests.sh`: los dos comandos de test y la consulta de
   settings usan identidad **ad hoc `-`**, signing permitido/requerido, estilo
   Manual, equipo/perfil vacíos y `Config/Simulator.entitlements`. No usan Apple
   ID, certificado, clave privada, perfil ni servicio de pago. Los builds Release
   siguen con CODE_SIGNING_ALLOWED=NO; no se alteran configuración de dispositivo
   ni firma para distribución. El workflow solo aclara su descripción de permiso;
   el guard de autorización/SHA no cambia.
2. `ios/Config/Simulator.entitlements`: application-identifier y grupo local por
   bundle `DataCoreSimulator.$(PRODUCT_BUNDLE_IDENTIFIER)`, exclusivo del comando
   de simulador. Ese prefijo es una identidad local de prueba, **no un Team ID**.
   No copiar este archivo a firma iPhoneOS/TestFlight. Sin grupo compartido entre
   apps ni excepción de acceso global. Xcode debe expandir el bundle por target.
3. `APIRepository.swift`: mantiene SecItemCopyMatching/Update/Add/Delete a través
   de un adaptador inyectable. Sin fallback a UserDefaults/archivos/memoria en
   producción. Se conserva WhenUnlockedThisDeviceOnly, límites y selector privado
   service/account. Solo errSecItemNotFound significa ausencia. Los fallos exponen
   **operación + OSStatus numérico**, sin datos; los datos corruptos fallan cerrados.
4. `AppTests.swift`: prueba original real **intacta y reforzada** con lectura de la
   primera escritura y eliminación repetida. Se añaden tres tests de errores de
   permisos, datos corruptos y estados de update/add/delete con un adaptador
   explícito. Ningún skip, expectativa de fallo ni sustituto en la prueba original.
5. Regresión gratuita de orquestación: verifica que ambos tests usan ad hoc y el
   dispositivo conserva build sin firma. Verificador revisa entitlements aislados.
6. Regresión Swift/Linux: extrae y compila el wrapper real y sus errores, usando
   stand-ins de Security explícitos (sin importar ni simular que ejecuta el SDK
   Apple). Comprueba ida/vuelta, reemplazo, borrado idempotente, errores y política
   WhenUnlockedThisDeviceOnly. No permite fallback de add tras permiso rechazado.

No hay print/Logger/NSLog en las fuentes de la app. Los errores nuevos no contienen
valores, consultas o identificadores del usuario. Las pruebas solo usan valores
ficticios; no se ha introducido una credencial real. La API demo no envía tokens.

## Validación gratuita ejecutada

Linux Python 3.13 y Swift 6.2.4:

| Suite | Resultado |
| --- | --- |
| Swift Domain/sesión | 26 aprobadas |
| FastAPI | 21 aprobadas |
| Herramientas | 31 aprobadas; incluidos wrapper Swift con sustituto y comandos de firma |
| Regresión aislada | 86 aprobadas, 4 SQL omitidas, cero intentos SQL/HTTP reales |

**164 aprobadas, 4 omitidas**. Los tests históricos de macOS no se suman al total.
Los 3 tests nativos nuevos y el test real Keychain reforzado **no se ejecutaron**
en Linux. Parse Swift, estructura/generación Xcode, contrato OpenAPI, Ruff, Bash,
actionlint y diff correctos. El primer intento del harness de regresión encontró
un uso incorrecto de autoclosure throws en el propio fixture; se corrigió antes
de obtener el resultado final, sin cambios para ocultar fallos de la app.

## Cuarta ejecución preparada, pendiente de autorización

No se inició macOS, no se envió review autorizante, no se hizo re-run. Commits
con [skip ci]. El propietario revisa el **nuevo SHA de PR #12**, costo/cuota y el
alcance de firma ad hoc local. Si autoriza, enviar nueva review **Comment** con:

```text
AUTHORIZE_IOS_SIMULATOR SHA_COMPLETO_ACTUAL MAX_30_MINUTES
```

[Procedimiento](../ios/README.md#ci-macos-sin-fusionar-main). No reutilizar el
permiso ni el run previo. No se necesita cuenta Apple para esta firma local de
simulador; TestFlight sigue requiriendo membresía/firma del propietario.

En ese run verificar CodeSign ad hoc y entitlements expandidos por bundle, la
prueba real de lectura/guardado/reemplazo/borrado y todos los tests, seguido de
segundo tamaño, capturas y Release. Si falla, conservar la operación/OSStatus
numérico nuevo: permitirá distinguir la hipótesis de permisos de otros estados.
No convertir errores en nil ni desactivar pruebas. Descargar artefactos en 1 día.

La app anterior compiló; **esta revisión y el Keychain corregido todavía no están
validados nativamente en macOS**. Sin IPA, publicación, despliegue, merge, SQL,
Streamlit, datos reales ni contratación de recursos.
