# DataCore AI · petróleo, materia y datos

## Corrección de identidad

La referencia cromática es la identidad original documentada en `docs/WORKSPACE_PETROLEO.md`: petróleo #0D1726, blanco frío #F2F5FA, violeta #7659E8 y turquesa #24C9C0. La interpretación anterior conservó por error la paleta lima de Atlas. Esta revisión recupera los colores institucionales y sustituye su composición y CSS completos.

Referencia de interacción: apple-design, commit 5206a950b715e0cabe7043ea0b2304332b91494e. Se estudió SKILL.md (esa carpeta no contiene referencias adicionales), además de la skill local interface-design.

## Dirección definida antes de implementar

Persona: quien consulta su tienda desde iPhone y profundiza desde escritorio. Tareas: localizar un producto, revisar precio/existencias, priorizar reposición, explorar el catálogo, comparar referencias y consultar los datos de prueba.

Territorio: referencias, disponibilidad, categorías, unidades, clientes, mínimos y cotizaciones. Mundo cromático: petróleo, blanco frío, violeta, turquesa y matices derivados de esos colores. La firma visual combina grandes cifras abiertas, diagramas de inventario legibles y objetos vectoriales específicos de cada producto, con capas funcionales de cristal.

Se descartan: siete titulares iguales sobre tarjetas → composiciones distintas según tarea; datos de ingeniería como protagonista → información comercial con procedencia accesible; ilustración genérica de categoría → veinte objetos dibujados específicamente; curvas financieras inventadas → representaciones calculadas desde las cantidades y precios SQL existentes.

- Inicio: gran cifra de unidades, anillo de estado calculado, foco de reposición, bandas de categoría y ranking; el esquema SQL deja de ocupar el dashboard.
- Productos: vitrina con un objeto protagonista y catálogo de veinte ilustraciones, precio/existencias visibles, filtros y comparación.
- Clientes: directorio con letras de gran formato, ritmo horizontal y fichas; sin contactos públicos ni compras atribuidas.
- Ventas: estudio de cotización interactiva con catálogo y clientes de prueba; cálculo en céntimos, sin guardar una venta ni descontar stock. Historial vacío identificado, sin ceros financieros ficticios.
- Inventario: matriz interactiva de veinte posiciones, prioridades y registro ordenado; estado expresado mediante texto, forma y color.
- Reportes: treemap amplio, barras de categoría, donut y dispersión; controles cercanos, filtros compartidos, valoración al precio de catálogo claramente diferenciada de ingresos/costos.
- Asistente: conversación a página completa, preguntas abiertas y respuestas de consulta local identificadas; sugerencias dentro del diálogo y compositor accesible en móvil.

## Reglas de ejecución

Sistema tipográfico sans de plataforma, tracking óptico, cifras tabulares; petróleo dominante en oscuro y blanco frío en claro. Turquesa para disponibilidad/interacción y violeta para foco/acción. Fondo técnico tenue e inmóvil; sin animaciones perpetuas. Navegación de escritorio contextual y barra inferior flotante en iPhone, búsqueda siempre superior.

Resortes interrumpibles y seguimiento directo en hojas, respuesta al presionar y cambios de vista sin bloqueo. Movimiento/transparencia reducidos y contraste aumentado. SVG sin librerías de ejecución ni fuentes remotas.

Los datos siguen siendo exactamente los fixtures SQL: 20 productos, 10 clientes, 4 categorías y 336 unidades. No se modifica SQL ni se inventa historial. La cotización es cálculo transitorio sobre esos mismos precios, no una operación registrada. El detalle técnico de procedencia se conserva en una hoja accesible desde la cabecera.
