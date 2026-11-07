# Asistente de consultas: alcance y validación

Modo guiado inicial sobre la capa comercial de la PR #3. Las cuatro preguntas
permitidas producen respuestas deterministas, con Decimal para dinero, y tablas
como evidencia. No interpreta instrucciones libres ni genera SQL. Solo consulta
tras enviar el formulario, conserva fuente/periodo/hora y retira la respuesta
previa cuando falla una nueva consulta. El modo guiado no usa API externa ni claves. La explicación generativa opcional
se documenta en [GROQ.md](GROQ.md).

Validación inicial de la PR #4: Python 3.13, DATACORE_TEST_SQL=0, 43 pruebas descubiertas,
39 aprobadas y 4 SQL optativas omitidas. Las nuevas regresiones comprueban
redondeo HALF_UP, promedio indefinido sin ventas, alertas en igualdad y cero,
rechazo de preguntas no admitidas, envío explícito, errores sin detalles internos
y navegación desde app.py. compileall y git diff --check completados.
En aquella entrega no se validó navegador ni SQL Server Windows; las etapas
posteriores y sus resultados están en [ENTREGA_COMERCIAL.md](ENTREGA_COMERCIAL.md).

## Siguientes mejoras

- Validar Groq con credenciales del entorno y agregados sintéticos antes de
  habilitar información real. El adaptador y las consultas permitidas ya están
  implementados; no se habilita ejecución de SQL generado.
- Resumen consistente: diseñar una instantánea transaccional y probar concurrencia
  en SQL Server de pruebas antes de prometer conciliación entre indicadores.
- Excel/PDF implementados y probados; véase [EXPORTACIONES.md](EXPORTACIONES.md).
- Completar validación en Windows; véase [la revisión visual](VALIDACION_VISUAL.md)
  para capturas de escritorio y móvil en Chromium/Linux.

No se realizaron migraciones, ventas, ajustes de stock ni fusiones a main.
