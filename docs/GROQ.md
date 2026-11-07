# Integración opcional con Groq

## Activación segura

La aplicación funciona completamente en modo guiado sin Groq. Para habilitar
explicaciones generativas en el servidor, configura estas variables del proceso
con el gestor de secretos del entorno de despliegue:

| Variable | Uso |
| --- | --- |
| `DATACORE_GROQ_ENABLED` | `1` habilita la opción; ausente u otro valor la desactiva |
| `GROQ_API_KEY` | Clave secreta inyectada en el proceso; nunca en el repositorio ni en la UI |
| `GROQ_MODEL` | Modelo habilitado en tu cuenta; por defecto `llama-3.3-70b-versatile` |

No se carga `.env` implícitamente. No agregues claves a comandos compartidos,
capturas, logs ni PR. El tema `.streamlit/config.toml` es público y no debe
contenerlas. La aplicación no pide la clave al usuario ni la guarda en sesión.
No se ha configurado ninguna credencial en esta entrega ni se ha llamado a Groq.
La disponibilidad del modelo, la cuota y las políticas de tratamiento/retención
son externas y deben verificarse antes de habilitarlo con información real.

## Flujo y datos enviados

1. El usuario elige una de las cuatro preguntas permitidas y consulta DataCoreAI.
2. La respuesta determinista y la tabla se muestran como fuente verificada.
3. Si el servidor habilitó Groq, aparece una sección opcional con el JSON exacto
   de evidencia comercial que se enviará. No se incluyen fechas ni identificadores.
4. El usuario autoriza ese resumen y pulsa Generar explicación con Groq. La
   autorización se renueva al generar otra consulta. No se envía al renderizar,
   cambiar de pantalla o descargar archivos.
5. Una sola petición al endpoint fijo HTTPS de Groq recibe texto. Se muestra
   como texto plano, separado de la respuesta verificada. El modelo puede
   equivocarse; sus instrucciones, código y enlaces nunca se ejecutan.

| Consulta permitida | Evidencia externa |
| --- | --- |
| Ingresos | Número de ventas e ingresos en PEN |
| Ticket promedio | Los anteriores y respuesta calculada con Decimal/HALF_UP |
| Más vendidos | Hasta ocho posiciones anónimas con unidades e ingresos |
| Alertas | Recuentos de productos activos, con alerta y agotados; stock actual |

La lista permitida excluye nombres, códigos, clientes, documentos, correos,
teléfonos, texto libre y configuración SQL. Incluso nombres con instrucciones
maliciosas no llegan al proveedor. La pregunta tampoco es texto libre.
Los importes y recuentos se validan antes de construir la petición.

## Límites y acceso de lectura

`services/groq.py` no importa conexiones SQL ni herramientas de escritura.
Consume únicamente evidencia agregada de los SELECT parametrizados existentes.
No hay ejecución de SQL generado, tool calling, navegación externa ni acceso a
archivos desde el modelo. No hay posibilidad de escoger endpoint desde la UI.
Conserva proxy/CA del entorno y verificación TLS predeterminada de requests.
Timeouts de conexión/lectura: 3,05/15 s. Sin redirecciones ni reintentos
automáticos. Máximo 500 tokens solicitados, 64 KiB de respuesta HTTP y 6.000
caracteres de contenido. Rechaza respuestas truncadas, herramientas, JSON
inválido y estados HTTP distintos de 200. Siempre cierra la respuesta HTTP.

Esta separación garantiza que este flujo solo llama a consultas de lectura;
**no cambia los permisos de la identidad Windows usada por la aplicación**.
Un aislamiento adicional a nivel SQL requiere una identidad con SELECT limitado
y validación en una base de pruebas. No se modifica autenticación, roles,
esquema ni políticas de producción automáticamente. Las operaciones comerciales
originales conservan sus permisos y confirmaciones explícitas.

## Validación de esta etapa

Python 3.13, `DATACORE_TEST_SQL=0 DATACORE_GROQ_ENABLED=0`:
59 pruebas descubiertas, 55 aprobadas, 4 SQL optativas omitidas. HTTP totalmente
simulado: opt-in, secreto oculto en repr, allowlist, ausencia de datos privados,
precisión, endpoint, timeouts, cierre, 401/429/500, timeout, JSON malformado,
respuesta excesiva/truncada, tool calls y ausencia de reenvíos por rerun.
AppTest verifica autorización explícita, renovación por consulta, texto plano
y permanencia de la respuesta guiada ante un fallo. compileall y diff correctos.
La CI desactiva SQL real y Groq; no requiere secretos. No es una prueba de
integración real con Groq ni con SQL Server Windows.
