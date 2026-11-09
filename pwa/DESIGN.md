# Atlas · dirección visual de la consolidación

Base revisada `design/atlas-editorial` (`c0f565d`). Se conserva íntegramente su paleta de papel, tinta oscura y acento lima; los doce tokens principales en ambos temas se comparan con esa base en una prueba automática. No se adoptan los colores de interfaces Apple.

Referencia principal: [apple-design, commit 5206a950](https://github.com/emilkowalski/skills/tree/5206a950b715e0cabe7043ea0b2304332b91494e/skills/apple-design). La carpeta de esa revisión contiene únicamente SKILL.md, sin referencias adicionales. También se aplicó la skill local interface-design. Se estudiaron respuesta al presionar, resortes interrumpibles, continuidad de velocidad, manipulación directa, materiales, tipografía y accesibilidad antes de modificar la PWA.

## Dirección por pantalla

La consolidación tiene una premisa visual y funcional: hacer visible la procedencia. Los datos que faltan merecen un estado diseñado, sin un gráfico financiero ficticio. La arquitectura se definió antes de implementar las siete experiencias:

- **Inicio / El origen.** Folio recortado con 20 referencias frente a un observatorio del modelo original. Seis nodos enlazados por las cinco relaciones reales del esquema; cifras recuperadas separadas del historial ausente. Métricas integradas en una franja, ranking y donut de existencias.
- **Productos / Referencias.** Índice editorial, categorías táctiles y biblioteca de objetos diferenciados por familia. Comparación de hasta tres referencias en una hoja; claves de negocio y precios originales.
- **Clientes / Personas.** Directorio tipográfico con iniciales de gran tamaño y navegación alfabética. No reutiliza las tarjetas del catálogo ni atribuye compras inexistentes. Detalle sin datos de contacto públicos.
- **Ventas / Historia pendiente.** Composición abierta con una raya protagonista y métricas desconocidas. Contexto de las tablas que faltan y comprobación explícita del backend. No utiliza gráficos de cero ventas.
- **Inventario / Disponibilidad.** Número de unidades, cola horizontal de reposición y registro denso con estados comprensibles además del color. Mínimos originales, filtro Por reponer y acceso a detalle.
- **Reportes / Observatorio.** Treemap de ancho completo, composición por categoría y dispersión precio/existencias. Tabla y exportación conectadas al mismo filtro. No parece una repetición del inicio.
- **Asistente / Conversación.** Página completa, historial de sesión y compositor próximo al pulgar. Preguntas sugeridas dentro de la conversación y descartadas al interactuar. Modo local explícito y preguntas abiertas sin fingir un modelo conectado.

## Sistema e interacción

Tipografía de sistema para controles y cifras; Georgia como contrapunto editorial en titulares. Tamaños fluidos, tracking ajustado por escala, leading amplio en lectura. Trama técnica inmóvil, superficies limpias y profundidad para capas funcionales. Translucidez en cabecera, navegación y hojas; no en cada módulo.

Búsqueda global siempre arriba, debajo del encabezado en iPhone y dentro de la barra superior en escritorio. Navegación contextual lateral únicamente para secciones; nunca búsqueda lateral. En iPhone, cinco destinos cómodos con Más para las rutas adicionales y áreas seguras.

Presión inmediata; resorte críticamente amortiguado que conserva posición y velocidad al cambiar de objetivo. Hojas con Pointer Events, captura, seguimiento directo, resistencia al límite y proyección de velocidad. Entrada/salida simétricas; una hoja en cierre puede agarrarse y revertirse. Navegación interrumpible, sin bloquear controles ni temporizadores de falsa espera. Cola horizontal con scroll-snap nativo, sin overflow accidental del documento.

Tooltips accesibles por foco, puntero o toque, descartables con Escape. Treemap de área proporcional validada, leyendas legibles y estados vacíos sin geometría inválida. Las visualizaciones usan stock, no demanda o rentabilidad. Se omiten mapas por hora, ingresos por sucursal y objetivos porque el origen no permite calcularlos.

Se respetan movimiento reducido, transparencia reducida y contraste aumentado. Safe areas, teclado mediante visualViewport, foco visible, nombres accesibles y navegación nativa por enlaces. No hay animaciones de fondo continuas, fuentes remotas ni dependencias de ejecución externas.

## Evidencia

Se revisaron capturas reales de las siete rutas a 393×852 y 1440×1000, ambos temas y búsqueda. Pruebas de layout también a 320 y 768 px. Resultados, límites de Safari físico y comprobación pública pendiente en [VALIDACION_PREPUBLICACION.md](VALIDACION_PREPUBLICACION.md). Las capturas comparativas son artefactos de revisión fuera del build y no incluyen información privada.
