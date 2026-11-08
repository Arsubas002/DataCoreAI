# DataCore AI · Quiet intelligence

## Base y alcance

Base: `feature/datacore-pwa-demo` (`96fa831`). Implementación en `design/apple-pwa-experience`. La rama main aún no contenía `/pwa`. Solo se reconstruye la demo PWA; no se cambia Streamlit, SQL, SwiftUI ni datos reales.

Skill aplicada: [apple-design, commit 5206a950](https://github.com/emilkowalski/skills/tree/5206a950b715e0cabe7043ea0b2304332b91494e/skills/apple-design). En ese commit la carpeta contiene únicamente SKILL.md, sin referencias adicionales. También se revisaron la skill local interface-design y las reglas del proyecto.

## Arquitectura visual

La persona responsable de una pequeña tienda necesita entender ingresos, encontrar una referencia y detectar reposiciones desde el teléfono. La experiencia prioriza calma y confianza, con una lectura editorial en vez de una colección de tarjetas. Vocabulario: referencias, existencias, reposición, períodos, operaciones, ticket y catálogo. Paleta: tinta petróleo, papel frío, lino, índigo, verde salvia y ámbar de alerta.

La firma es la continuidad entre el pulso comercial y el catálogo: cada barra de rendimiento abre la misma ficha de producto que catálogo e inventario. Se evitan rejillas de KPI equivalentes, donuts decorativos y superficies con degradados. Los únicos gradientes son el relleno informativo bajo la serie temporal.

- Inicio: una cifra protagonista, tres métricas secundarias, tendencia, ranking, reposición y movimientos.
- Productos: composiciones de producto con ilustraciones SVG locales, búsqueda, categorías, ordenación, comparación de dos o tres referencias y ficha de detalle.
- Ventas: comparación de períodos, ingresos, ranking y operaciones.
- Inventario: lista ordenada por stock, estados textuales, mínimo y filtros.
- Reportes: comparación, participación por categoría, detalle diario, CSV e impresión a PDF.
- Asistente: conversación libre, mensajes diferenciados, ejemplos opcionales y cálculo local identificado como demostración.

En escritorio la navegación lateral mantiene las seis rutas visibles. En móvil, Inicio, Productos, Ventas y Asistente ocupan la barra inferior; Más abre Inventario y Reportes en una hoja modal. Las áreas seguras usan env(safe-area-inset-*). El compositor se adapta a visualViewport y oculta la barra inferior al detectar el teclado.

## Movimiento y accesibilidad

La hoja usa un resorte críticamente amortiguado con posición y velocidad persistentes, capture de Pointer Events, seguimiento 1:1, resistencia superior y proyección de velocidad al soltar. El mismo recorrido sirve para abrir/cerrar; se puede agarrar durante la transición. El navegador gestiona foco modal y Escape. Los controles responden en :active, sin retraso artificial.

La navegación no bloquea entradas durante el cambio. Los gráficos responden a puntero, toque y flechas de teclado y reportan valores en output. La tabla diaria ofrece alternativa textual. Movimiento reducido desactiva desplazamientos y resortes, transparencia reducida usa superficies opacas y contraste aumentado refuerza líneas/texto. No hay animaciones constantes.

## Datos y seguridad

Todas las cifras proceden de ventas ficticias deterministas compartidas. Importes sumados en céntimos enteros; comparación con el período inmediatamente anterior de igual duración. Existencias son una instantánea, no movimientos históricos. El CSV representa exactamente el período y sucursal seleccionados y neutraliza prefijos de fórmulas en texto.

El asistente no es una IA conectada. El adaptador local reconoce consultas simples y declara sus límites ante preguntas no interpretables. `/api/assistant` es un límite de servidor que responde 503: no tiene claves, llamadas al proveedor ni acceso a datos. Activarlo requerirá autenticación, autorización, cuotas, fuente de datos de solo lectura y secretos exclusivamente del servidor. Una clave por sí sola no debe habilitarlo.

Service worker: shell completo por versión; nunca almacena `/api/`; solo elimina cachés con prefijo datacore-. Sin recursos externos en runtime. El manifiesto conserva standalone e incorpora iconos PNG 192/512 y apple-touch-icon.
