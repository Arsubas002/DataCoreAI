# Asistente de consultas: alcance y validación

Modo guiado inicial sobre la capa comercial de la PR #3. Las cuatro preguntas
permitidas producen respuestas deterministas, con Decimal para dinero, y tablas
como evidencia. No interpreta instrucciones libres ni genera SQL. Solo consulta
tras enviar el formulario, conserva fuente/periodo/hora y retira la respuesta
previa cuando falla una nueva consulta. No usa API externa ni claves.

Validación: Python 3.13, DATACORE_TEST_SQL=0, 43 pruebas descubiertas,
39 aprobadas y 4 SQL optativas omitidas. Las nuevas regresiones comprueban
redondeo HALF_UP, promedio indefinido sin ventas, alertas en igualdad y cero,
rechazo de preguntas no admitidas, envío explícito, errores sin detalles internos
y navegación desde app.py. compileall y git diff --check completados.
No se validó la apariencia en navegador ni SQL Server Windows.

## Siguientes mejoras

- Integración generativa: elegir proveedor, credenciales por entorno y política
  de envío de información. Mantener herramientas de solo lectura con consultas
  permitidas y respuestas con evidencia; no habilitar ejecución de SQL generado.
- Resumen consistente: diseñar una instantánea transaccional y probar concurrencia
  en SQL Server de pruebas antes de prometer conciliación entre indicadores.
- Excel/PDF: elegir motores, conservar códigos como texto y probar formatos,
  acentos, fórmulas y paginación con datos sintéticos.
- Validar manualmente las vistas en Windows y tamaños de pantalla reducidos.

No se realizaron migraciones, ventas, ajustes de stock ni fusiones a main.
