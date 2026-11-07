# Quinto run: comparación de firma efectiva y diagnóstico conservado

## Evidencias y límite de lo recuperable

Se continuó el HEAD actual local/remoto de PR #12:
`2df8f3f0b552998ef71b01c0cfb50190c9e70ce2`. Se revisaron logs completos del
[run 42390365613](https://github.com/Arsubas002/DataCoreAI/actions/runs/42390365613),
script, módulo de integración, política, generador, pbxproj y artefacto ID
**13581018834**. Se verificaron tamaño/hash de sus **9 archivos**.
[Resultados y SHA-256](IOS_FIFTH_RUN_RESULTS.json).

El JSON real del artefacto `debug-architecture-settings.json` solo contiene:

```json
{
  "verified": false,
  "error": "App effective Debug simulator ad hoc signing policy differs"
}
```

**No contiene el JSON original de showBuildSettings ni sus valores de firma.**
Xcode lo envió por stdin al verificador y este lo descartó al lanzar, reemplazando
el informe por ese error genérico. El stderr solo tiene un aviso de destinos
arm64/x86_64 coincidentes, no ajustes de firma. No existe copia adicional de los
valores en los otros archivos o en el log completo del job.

Por tanto **no se puede determinar retrospectivamente la clave exacta que difirió**.
No se presentan valores sintetizados desde pbxproj como si fueran salida real de
Xcode. La revisión corrige un defecto reproducible del verificador y la pérdida
de evidencia; **no confirma que ese defecto fuera la única causa del run**.
No se ejecutó macOS para recuperar los datos que faltan.

## Comparación que sí puede establecerse

Por el orden de ejecución, el guard de arquitectura pasó y el check de ruta de
entitlements también: el error aparece después de ambos. Xcode 26.3 (17C529), SDK
26.2 y los 26 tests del paquete aprobados sí están registrados. El job salió con
**2**, fase debug-architecture-settings, antes de compilar/probar app/UI. No es un
nuevo fallo de XCTest ni hay una app de esta revisión validada por ese run.

| Propiedad | Definición del proyecto / exigencia | Valor bruto del quinto run |
| --- | --- | --- |
| CODE_SIGN_STYLE | Manual, solo Debug/simulador | No conservado |
| CODE_SIGN_IDENTITY | `-` ad hoc, solo Debug/simulador | No conservado |
| CODE_SIGNING_ALLOWED | YES | No conservado |
| CODE_SIGNING_REQUIRED | YES | No conservado |
| DEVELOPMENT_TEAM | Sin equipo seleccionado | No conservado; pudo ser omitido o distinto, no se confirma |
| PROVISIONING_PROFILE_SPECIFIER | Sin perfil seleccionado | No conservado; pudo ser omitido o distinto, no se confirma |
| CODE_SIGN_ENTITLEMENTS | App Debug/simulador: `$(SRCROOT)/Config/Simulator.entitlements` | El check de ruta absoluta existente bajo SRCROOT pasó; cadena original no conservada |

El proyecto mantiene condiciones por target/SDK. El `CODE_SIGN_STYLE=Automatic`
de Base.xcconfig no prueba que el valor efectivo fuera Automatic: la condición
Manual del target tiene mayor prioridad. No se cambia arbitrariamente ese ajuste
ni se restaura un override global para forzar un resultado desconocido.

## Defectos reproducibles y corrección

1. **Comparación de ausencia contra cadena vacía.** El predicado anterior era
   `values.get(key) != expected` para todos los campos. Si el JSON omite un
   selector vacío, produce None y lo rechaza frente a `""`. El nuevo acceso
   normaliza **solo la ausencia** de DEVELOPMENT_TEAM y
   PROVISIONING_PROFILE_SPECIFIER a cadena vacía: ambos significan que no se ha
   seleccionado equipo/perfil. Es una variante de serialización admitida; su
   ocurrencia en el quinto run no puede probarse con lo conservado.
2. **Fallo sin evidencia de valores.** Se toma una instantánea filtrada antes de
   validar y el manejador conserva ese informe al fallar. Cada comparación
   incluye presencia de clave, valor permitido, esperado y matches. El error
   identifica las **claves** discrepantes. Se mantienen exit 2 y parada previa
   al build, sin convertir el fallo en warning o verified=true.

No se normalizan valores no vacíos, null explícito, False o 0. No se permite que
falten identidad, modo o flags de firma. Manual, `-`, YES/YES siguen obligatorios;
Automatic, identidad vacía, firma desactivada o un equipo/perfil no vacío fallan.
La ruta absoluta/existente de app y la prohibición de entitlements en otros targets
siguen intactas, así como las verificaciones estáticas Debug/Release y SwiftPM.

La instantánea usa una lista cerrada. No copia el entorno completo. Valores de
identidad no ad hoc, equipos/perfiles no vacíos y valores desconocidos se redactan;
los errores solo nombran claves. La ruta esperada se representa con SRCROOT y se
registran absolute/matches_srcroot/exists. Una ruta inesperada se redacta y no se
consulta su existencia. Ausencia y null quedan distinguibles por `present`.

## Archivos y regresiones

- `ios/tools/signing_policy.py`: normalización limitada y snapshot seguro, error
  por clave, salida válida normalizada sin KeyError para selectores omitidos.
- `ios/tools/module_integration.py`: conserva observaciones y los checks previos
  aunque la validación posterior falle.
- `ios/tools/tests/test_signing_policy.py`: seis regresiones nuevas de ausencia
  frente a vacío, campos obligatorios ausentes, firma insegura, null/no vacíos,
  redacción y payloads malformados. Los escenarios son **sintéticos y explícitos**,
  no fixtures inventados de salida nativa. Reproducen el predicado defectuoso.
- `ios/tools/tests/test_first_build.py`: el doble omite equipo/perfil vacíos;
  nueva regresión fuerza Automatic y comprueba exit 2, parada antes del build e
  informe conservado con el valor que falló.
- Documentación: este informe, resultados JSON, README iOS y enlaces de estado.

Se inspeccionaron pero **no se modificaron** script de ejecución, generador,
pbxproj, entitlements, workflow, Package.swift, fuentes de app o tests Swift.
Entitlements permanecen únicamente en DataCoreAI Debug/simulador. Se conservan
firma ad hoc nativa y todas las pruebas reales de Keychain/UI sin skips.

## Validación gratuita ejecutada

Linux Python 3.13 y Swift 6.2.4:

| Suite | Resultado |
| --- | --- |
| Domain/sesión Swift | 26 aprobadas |
| API FastAPI | 21 aprobadas |
| Herramientas | 47 aprobadas, ninguna omitida |
| Regresión comercial aislada | 86 aprobadas, 4 SQL omitidas, cero intentos SQL/HTTP reales |

**180 aprobadas y 4 omitidas**. Los 26 tests del run macOS no se suman de nuevo.
Correctos: OpenAPI, grafo/generación Xcode, plists/esquemas, políticas Debug/Release,
parse Swift, Ruff, Bash, actionlint y diff. Los tests de orquestación usan dobles;
los del wrapper usan Security simulado explícito, sin validar el Keychain nativo.
Sin pruebas Windows ni nueva ejecución Xcode.

## Sexta ejecución preparada, no iniciada

Mismo workflow, sin nuevos eventos, sin review de autorización ni re-run. Commits
[skip ci]. El propietario revisa el nuevo HEAD, costo/cuota y autoriza una única
review **Comment** si procede:

```text
AUTHORIZE_IOS_SIMULATOR SHA_COMPLETO_ACTUAL_DE_PR_12 MAX_30_MINUTES
```

[Instrucciones](../ios/README.md#ci-macos-sin-fusionar-main). No reutilizar permiso
del SHA anterior. Descargar artefactos antes de su retención de **1 día**.

La sexta debe confirmar los valores nativos reales. Si el guard falla, el artefacto
ahora identificará cada clave y la discrepancia sin revelar credenciales. Solo si
pasa se ejecutan tests de app/UI, Keychain real, segundo tamaño y Release sin firma.
No se predice que el run vaya a pasar: podría existir otro ajuste efectivo distinto
que la evidencia antigua no permite identificar.

No hay afirmación de corrección validada por Xcode, IPA ni Keychain funcionando.
Sin macOS nuevo/gastos, merge, Streamlit, SQL, datos reales, publicación o servicios.
