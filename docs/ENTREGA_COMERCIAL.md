# Entrega comercial por etapas

| Etapa | Rama / PR | Resultado |
| --- | --- | --- |
| Consolidación | feature/consolidacion-comercial / #5 | Integra #1–#4, interfaz y CI |
| Exportaciones | feature/exportaciones-excel-pdf / #6 | Excel y PDF en memoria, pruebas de lectores |
| Groq | feature/groq-solo-lectura / #7 | Credenciales de entorno, allowlist y envío explícito |

Las ramas forman una cadena: main ← #5 ← #6 ← Groq. Cada PR muestra solo su
etapa respecto de la anterior. Ninguna se ha fusionado. Para auditar el estado
completo usa la última rama; para revisar el conjunto original usa #5.
No se cierran #1–#4 ni se cambian sus bases automáticamente.

Resultados locales: consolidación 41 aprobadas/4 omitidas; exportaciones
48 aprobadas/4 omitidas; Groq 55 aprobadas/4 omitidas. Siempre Python 3.13 y
SQL real desactivado. Las pruebas de ventas, idempotencia y rollback existentes
siguen pasando. CI de #5 y #6 completada en verde; cada push de Groq ejecuta
la misma suite sin secretos. Las capturas de revisión usan datos sintéticos.

Pendiente fuera de este entorno: verificar SQL Server Windows, concurrencia
entre consultas, identidad SQL con permisos mínimos y una llamada Groq con
credencial segura y datos sintéticos. Las consultas comerciales siguen siendo
independientes; no se promete una instantánea transaccional. No se ejecutaron
migraciones, escrituras reales ni despliegues.

## Revisión de conversaciones y validación externa

Las PR #1–#3 no tenían comentarios ni reviews al revisar esta entrega. La review
COMMENTED de #4 exige preservar la cadena #2→#3→#4, distinguir modo guiado de
IA generativa, ejecutar la suite completa y decidir sobre #1. Estos puntos se
atienden mediante #5–#7, pruebas y documentación. Su solicitud de comprobar
Windows/SQL Server permanece pendiente: Chromium/Linux y mocks no la sustituyen.
No se emite aprobación ni se fusiona ninguna PR.
