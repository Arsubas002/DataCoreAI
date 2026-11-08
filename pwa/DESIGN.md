## Noir / revisión de fondo

Fondo #101113, paneles #1C1D21, superficies auxiliares #28292F y bordes #37383F.
Se conserva la paleta del usuario solo en controles, iconos, gráficas y detalles.
Sin baño violeta sobre el fondo. Release: orbit-noir-v5.

## Paleta Spectrum

Referencia del usuario: #1A1033, #FF4FD8, #B45CFF, #4BE3FF, #FFF1FB.
Fondo violeta, acciones fucsia, detalles ultravioletas, gráficos cian y texto blanco rosado.
Variantes oscuras de acentos en modo claro para contraste.

# DataCore AI · Orbit 03

Revisión futurista sobre Perspective 02, en `design/futuristic-workspace`.
Fondo azul profundo, superficies instrumentales y acento turquesa. Navegación
agrupada en Inicio, Operación e Inteligencia; acceso secundario al asistente.
El gráfico sigue siendo el instrumento principal: conserva datos, escalas,
comparaciones y controles. Nuevo encabezado compacto, métricas integradas,
franja de reposición y paneles inferiores. Tema oscuro inicial con alternativa clara.

Movimiento: entrada escalonada de paneles, trazado de líneas, revelado de barras,
órbitas decorativas del asistente y respuesta al pasar el puntero. Todas las
animaciones nuevas respetan `prefers-reduced-motion`. Sin dependencias nuevas.
Release y caché: `future-workspace-v3`.

Validación: build público de 14 archivos; 4 pruebas Node de datos y límites de
API y 4 pruebas Python de empaquetado aprobadas. Se corrigió portabilidad de
las pruebas Python (UTF-8 y rutas web). Revisión manual de las seis rutas a
1440 y 390 px sin desbordamiento horizontal; búsqueda de stock, filtros de
período, alternancia a barras y tema claro comprobados. Sin validación de
dispositivo Safari real ni conexión con datos comerciales.

## Referencia anterior: Perspective 02

Corrección del rediseño en `design/global-search-editorial-v2`, sobre `design/apple-pwa-experience`. Skill obligatoria: [apple-design en 5206a950](https://github.com/emilkowalski/skills/tree/5206a950b715e0cabe7043ea0b2304332b91494e/skills/apple-design). Revisión de respuesta inmediata, manipulación directa, resortes interrumpibles, materiales, tipografía y accesibilidad. La carpeta de esa skill no contiene referencias adicionales en ese commit.

## Composición nueva

Inicio se reconstruye como una página editorial: titular de dos tonos, controles por período/sucursal, superficie analítica integrada con cifra y gráfico, métricas en el pie de esa superficie, franja horizontal de reposición y columnas diferenciadas de rendimiento/movimientos. Sustituye la composición anterior de indicador, gráfico independiente y panel de alertas.

La nueva paleta usa tinta azul, papel frío, ultramarino funcional y ámbar para reposición. Fuentes de sistema, tracking por tamaño, números tabulares y jerarquía por peso/escala. El catálogo cambia de mosaico de ilustraciones grandes a referencias horizontales. Inventario es una lista de existencias; Reportes distingue lectura ejecutiva, análisis y distribución. No hay gradientes decorativos. La profundidad corresponde al buscador, la hoja modal y la navegación flotante, no a cada dato.

## Una sola búsqueda, en la cabecera

Hay exactamente un input search y vive en la toolbar persistente. En escritorio está dentro de la barra superior; en móvil ocupa una fila compacta debajo del encabezado. No hay campos ni resultados de búsqueda en aside. El catálogo remite al mismo buscador.

Busca nombres/categorías, reconoce consultas de stock y reposición, muestra precio/existencias, abre fichas y permite saltar a secciones. Resultados alineados debajo del campo; nunca en una columna lateral. Teclado: Cmd/Ctrl K, flechas, Escape, Tab y Enter. Sin resultados se explica cómo reformular. La apertura usa un resorte amortiguado con origen superior.

## Visualizaciones e interacción

Todos los gráficos temporales usan un módulo nuevo, con conmutador Tendencia/Por día y comparación de períodos opcional. Tooltips jerarquizan fecha, valor actual y anterior. El dedo o puntero mueve el cursor directamente; las flechas exploran los valores. Tres referencias de escala, líneas ligeras y ausencia de fondos ornamentales.

La navegación móvil es una isla flotante, separada de los bordes y respetuosa con safe-area. Las hojas conservan tracking 1:1, resistencia y proyección de velocidad con resortes interrumpibles. No se bloquean controles durante transiciones. Se respetan movimiento reducido, transparencia reducida y contraste aumentado.

## Conversación a página completa

El asistente ocupa la vista principal, sin paneles laterales de búsqueda o sugerencias. Las preguntas opcionales viven dentro de la conversación (carrusel horizontal en móvil) y desaparecen al primer texto introducido, incluso antes de enviarlo. El usuario puede preguntar libremente; el adaptador local identifica explícitamente sus cálculos como demostración sin IA conectada. Historial conservado al navegar durante la sesión; errores visibles y compositor adaptado a visualViewport.

## Versión y publicación

El shell lleva `meta[name=datacore-release]=editorial-search-v2`; CSS, entrada JS e imports usan esa versión en sus URL. Service worker con caché `datacore-editorial-search-v2`, precarga completa y activación tras completar la precarga; la nueva caché admite las URL versionadas sin perder offline. No se cachea API. El build publica una lista explícita de 14 assets, con SQL, tests, documentación y secretos fuera de la salida.

`tests/deployed.mjs` requiere una URL HTTPS real: verifica el marcador, la búsqueda, hashes SHA-256 de los 14 assets y recarga con service worker. Es una verificación pendiente hasta disponer de credenciales/acceso de despliegue; un build local no la sustituye.
