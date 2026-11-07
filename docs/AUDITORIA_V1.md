# Auditoría de estabilización de la PR #8

Candidata para revisión, no publicación de v1.0 ni despliegue de producción.
Se actualiza la misma rama release/integracion-final; no se crea otra PR.

## Alcance revisado

| Módulos | Revisión y evidencia |
| --- | --- |
| app.py, tema y componentes | Seis rutas, modo lector, colores, tablas, anchuras y navegación con AppTest/Chromium |
| database/connection.py | Autenticación integrada y base explícita; cierre ante fallo; login y consulta con tiempos separados |
| database/productos.py | Validación antes de conectar, parámetros, Decimal, UNIQUE, ROWVERSION, rollback y cierre |
| database/ventas.py | Límites SQL INT, transacción, locks ordenados, precios históricos, UUID/huella y respuesta perdida; simulaciones existentes |
| database/dashboard.py | Intervalos semiabiertos, agregados sin duplicar cabeceras, ranking estable, SELECT y stock actual |
| seis vistas | Sesión, envío explícito, errores seguros, persistencia de carrito/reportes y bloqueo de escrituras |
| services/reportes.py y exportaciones.py | CSV seguro, celdas Excel tipadas y sin enlaces, PDF escapado/paginado, tamaños y precisión |
| services/groq.py y asistente.py | Allowlist y exclusión de identificadores, secretos fuera de payload/repr, endpoint fijo y manejo de errores HTTP/JSON |
| scripts y CI | Diagnóstico no conectado por defecto, ejecución aislada, rechazo de cero tests, artefactos Linux/Windows sin secretos |
| sql/ y documentación | Revisión estática de esquema y dependencias; ningún script ejecutado |

No es una certificación de seguridad ni una demostración de compatibilidad con
una instancia SQL real. Los permisos, los planes de ejecución y los bloqueos
requieren evidencia en tu equipo; véase [PRUEBAS_LOCALES_V1.md](PRUEBAS_LOCALES_V1.md).

## Defectos reproducidos y atendidos

- Recargar producto podía mantener el borrador: ahora descarta también el estado
  de los widgets. Alta exitosa reinicia el formulario sin repetir envío.
- Un nombre actualizado remotamente podía reiniciar la selección; selector con
  clave estable y campos/versiones cargados juntos hasta recarga explícita.
- Historial sin límite cargaba todos los detalles: ahora pagina 100 cabeceras
  antes del JOIN; orden estable por Fecha/ID y detalles completos por venta.
- Timeout de login no limitaba consultas bloqueadas: añade timeout de consulta
  de 15 s, y cierra si no puede configurarlo. Se mantiene lock timeout de ventas.
- Una fila PDF válida con muchas líneas podía producir LayoutError: permite
  dividir la fila entre páginas y comprueba que sus 70 líneas se conservan.
- Excel anterior a 1900 podía representarse como serial fuera de su calendario:
  se conserva como texto ISO. Rechazo de NaN/Infinity en los tres formatos.
- CSV sin límite podía consumir memoria de sesión sin cota: 100.000 filas y
  10 MiB, rechazando el archivo completo sin truncar ni ofrecer resultados parciales.
- Una variable de modo lector mal escrita podía permitir escrituras: solo 0
  (o ausencia histórica) las permite; otros valores quedan en modo lector.
- Validación de texto/categoría/producto/cliente se ajusta a los límites SQL INT
  antes de conectar. Formulario de producto agrupado para escritorio/móvil.

## Privacidad y errores de Groq

No se llama a Groq real ni se utilizan claves reales. Las pruebas simulan
configuración ausente, lista permitida, datos que contienen instrucciones,
credencial privada, 307/401/429/500, timeout, corte de lectura, JSON malformado,
respuestas excesivas/truncadas y tool calls. Verifican cierre, mensajes seguros,
texto plano, autorización y ausencia de reenvío en rerun. El adaptador no importa
conexiones SQL, no tiene herramientas y no ejecuta salida del modelo. Su texto
no reemplaza la respuesta calculada. Las claves se configuran solo por entorno.

## Límites que siguen abiertos

- SQL Server Express/Windows real y Groq real no se probaron aquí.
- Análisis en consultas independientes, sin instantánea transaccional.
- Catálogo e inventario aún cargan su selección completa; el historial pagina
  cabeceras, pero una venta con muchísimas líneas sigue consumiendo memoria.
- OFFSET puede desplazar páginas si entran ventas concurrentes; no es un cursor
  de auditoría. Revisar planes/índices y comportamiento bajo carga en pruebas.
- La exportación limita el archivo, no el resultado SQL ya obtenido en memoria.
- Sin autenticación web multiusuario; TLS SQL actual es para desarrollo local.
- Fuente PDF probada en español, sin cobertura garantizada de todo Unicode.
- No hay costos, historial completo de stock ni pronósticos implementados.

La suite y la CI se reportan en [INFORME_FINAL.md](INFORME_FINAL.md) y en los
checks/comentarios de la PR #8 por commit. Nunca se presentan como SQL/Groq reales.
