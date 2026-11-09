# DataCore AI · revisión original-v2

Rama `feat/atlas-sql-consolidation`. Esta entrega corrige los colores de Atlas y reconstruye la PWA con la identidad original documentada en `docs/WORKSPACE_PETROLEO.md`: petróleo #0D1726, blanco frío #F2F5FA, violeta #7659E8 y turquesa #24C9C0. La fuente sigue siendo la data de prueba de SQL, confirmada por el usuario.

## Cambios verificables

Se sustituyó el CSS completo y se separaron las vistas, las veinte ilustraciones vectoriales y los cálculos en módulos. Ya no aparecen en el inicio el folio lima, el esquema SQL ni una advertencia de recuperación como elemento protagonista. Inicio, catálogo, directorio, cotizador, matriz de inventario, reportes y conversación tienen composiciones distintas.

Búsqueda única superior en las siete rutas, navegación flotante en móvil, sidebar de secciones en escritorio y detalle técnico de procedencia bajo Demo SQL. Sin búsqueda lateral. La presión responde de inmediato, las hojas conservan su resorte interrumpible y los tooltips flotan sin desplazar los módulos. El estado de inventario se expresa con texto, cifras, formas y color.

Datos idénticos al fixture SQL: 20 productos, 10 clientes ficticios, 4 categorías, 336 unidades; 14 referencias sobre el mínimo, 5 bajas y 1 agotada. Valor de catálogo derivado: S/ 7,350.50. No es ingreso, costo o rentabilidad. La cotización de prueba usa céntimos y no altera stock, inserta ventas ni genera historial.

## Validación ejecutada

| Área | Resultado |
| --- | --- |
| Streamlit/Windows existente, Python 3.13.17 | 90 descubiertas: **86 aprobadas, 4 SQL real omitidas**; cero intentos SQL o HTTP reales en la suite aislada. |
| Backend privado/fuente | **27 aprobadas**: autenticación, scopes, parámetros, fechas, errores, límites, Decimal, cierre/rollback de lecturas, integridad de scripts y contrato cromático original. Conexiones simuladas. |
| Node 24 | **20 aprobadas**: registros exactos de SQL, fuente/privacidad, consultas locales, gráfico proporcional, valoración en céntimos, cotización sin mutaciones, cantidades inválidas, CSV y puente protegido. |
| Empaquetado PWA | **4 aprobadas**: manifiesto/iconos, módulos offline, exclusión de API/archivos privados. |
| Navegador integral | **115 comprobaciones aprobadas**: siete rutas a 320/393/768/1440 px, temas, búsqueda, comparación, orden alfabético, filtros, cotización, CSV, historial conversacional, XSS y offline. |
| Búsqueda/navegación | **42 comprobaciones aprobadas**, siete rutas y móvil/escritorio, productos/clientes, teclado y barra superior única. |
| Gráficos e identidad | **20 comprobaciones aprobadas**: cuatro colores exactos, fondo real de ambos temas, datos/valoración/filtros, tooltips y matriz de veinte productos. |
| Movimiento | **9 comprobaciones aprobadas**: seguimiento 1:1, inversión, agarre durante cierre desde posición presentada, flick, movimiento reducido, Escape y ausencia de errores JS. |
| Accesibilidad | Axe WCAG A/AA sin infracciones detectadas en **16 estados móviles** (rutas/temas/búsqueda); se corrigió el turquesa de texto sobre la selección clara. Se espera el fin de la breve transición de tema antes de medir contraste estable. |
| PDF e interacciones de lectura | Cotización S/ 155.50 comprobada; tooltip sin desplazamiento del contenido; PDF nativo de Papelería, **3 páginas y 5 registros exactos**, leído con pypdf. Contiene S/ 582.50 y no incluye productos de otras categorías. El desplegable restaura su estado al terminar la impresión. |

Se revisaron capturas de las siete pantallas a iPhone 15 emulado (393×852) y escritorio (1440×1000), búsqueda y ambos temas. Artefactos comparativos en `/workspace/artifacts/datacore-original/`, fuera de Git/build. Hay capturas adicionales de conversación y cotización con datos de prueba. Chromium emulado no equivale a Safari físico ni a instalación real iOS. Axe no es una auditoría manual exhaustiva.

## Integridad y exposición

Los tres SQL, el fixture generado, Streamlit, `database/`, `services/` y `views/` permanecen intactos. No se ejecutaron scripts, crearon bases ni escribieron datos SQL. [Auditoría de la fuente](../docs/SQL_ORIGINAL.md).

Build con exactamente **18 assets permitidos**. No incluye SQL, Python, backend privado, documentación, tests, Git ni contactos. No hay claves privadas o credenciales en el JavaScript público. El paquete para Vercel añade únicamente build/configuración y las dos funciones revisadas: **22 archivos en total**. Manifest/ID/iconos, safe areas y caché offline conservados; nuevo worker `datacore-original-v2`, API excluida.

## Publicación y límites

La candidata está preparada para reemplazar la demo anterior mediante la API autorizada del proyecto Vercel existente, sin modificar su producción principal ni las protecciones globales. Se registrarán el deployment y alias cuando Vercel confirme READY.

El acceso del entorno sigue limitado a api.vercel.com. El usuario aplazó la aplicación de permisos para GitHub API y el dominio público. Por ello crear la PR y verificar HTTP anónimo/caché/hashes públicos siguen pendientes; no se presentan como pruebas ejecutadas. El verificador remoto preparado exige release original-v2, 18 hashes, búsqueda y API anónima bloqueada:

```sh
DEPLOYMENT_URL=https://datacore-atlas-sql.vercel.app npm run test:deployed --prefix pwa
```

El despliegue automático desde Git figuraba BLOCKED en la entrega anterior, sin una causa demostrada en los errores consultados. La identidad Git no se reescribe; no se eliminan protecciones ni se compran servicios. La vía de despliegue manual autorizada permite preparar la demo con origen controlado. La conexión SQL/IdP real y Safari físico quedan fuera de esta validación; la demo usa exclusivamente los datos de prueba existentes.
