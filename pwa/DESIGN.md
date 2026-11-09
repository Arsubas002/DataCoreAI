# DataCore AI / Atlas

## Base revisada

Rama `design/atlas-editorial`, basada en `release/public-demo-data` (`08c572c`). Esta base conserva 32 productos, 10 clientes ficticios, ocho categorías, el historial generado PWA y los siete pedidos iOS recuperados. No se modifican SQL, Streamlit o los valores de esos registros.

Referencia principal: [apple-design, commit 5206a950](https://github.com/emilkowalski/skills/tree/5206a950b715e0cabe7043ea0b2304332b91494e/skills/apple-design). Su carpeta en ese commit solo contiene SKILL.md. Se revisaron respuesta inmediata, continuidad de velocidad, resortes interrumpibles, manipulación directa, materiales, tipografía, profundidad y accesibilidad, además de las instrucciones locales de interface-design.

## Dirección antes de implementar

Atlas es un instrumento de lectura comercial para quien dirige una tienda desde su teléfono. Dominio: referencias, operaciones, reposición, mezcla comercial, sucursales y demanda. Materiales: grafito, papel cálido, tinta y una trama técnica tenue. Acento lima; tipografía de sistema con contrapunto editorial Georgia en titulares. No se cargan fuentes externas.

La firma es la relación entre una hoja recortada con el volumen de ingresos y una gran trayectoria acumulada abierta sobre el fondo. Las métricas viven en una franja, no en tarjetas equivalentes. Se eliminan las órbitas animadas, el espectro violeta/cian y las entradas escalonadas largas de la versión anterior.

- Inicio: superficie protagonista asimétrica, área acumulada, métricas integradas, ranking por unidades, donut y movimientos.
- Productos: biblioteca editorial, índice de referencias, categorías desplazables, primera referencia de mayor tamaño y catálogo con comparación. Búsqueda global superior única.
- Ventas: volumen sin tarjeta, barras verticales por sucursal, calendario de ingresos diarios y libro de operaciones/clientes.
- Inventario: cifra de existencias, cola horizontal de reposición y lista filtrable. La instantánea no se atribuye a sucursales.
- Reportes: treemap de ingresos a ancho completo, donut por categoría y dispersión precio/unidades. Exportación y metodología conservadas.
- Asistente: página conversacional, acento tipográfico y sugerencias dentro de la conversación que desaparecen al interactuar. Sin panel lateral ni afirmación de IA real.

## Gráficos con significado

Todos consumen `analytics(days, branch)`; importes agregados en céntimos. Áreas muestran acumulados, barras sucursales, donut categorías, calendario días y treemap participación proporcional. El ranking usa unidades vendidas, no importe. La dispersión relaciona precio con unidades y utiliza color de categoría. La sparkline representa la serie diaria del mismo período.

No se inventan costos, horas u objetivos. Por eso no se dibuja rentabilidad, mapa por hora o cumplimiento radial. Las categorías sin ventas figuran con cero; productos sin ventas permanecen en catálogo e inventario. El treemap agrupa seis líderes y el resto, con leyenda táctil para las celdas pequeñas. Su geometría se valida por área, límites y ausencia de solapamiento.

Tooltips en foco, toque y puntero; comparaciones de período conservadas en modos acumulado/diario. Flechas y Home/End exploran valores temporales. Escape descarta tooltips. Cada representación tiene título, unidades, contexto y fuente compartida; filtros de período/sucursal actualizan todas sus cifras.

## Interacción y accesibilidad

La búsqueda persistente admite nombres, códigos, categorías y consultas de stock, y permite abrir detalles o secciones. Navegación inferior flotante con safe-area. Cola de reposición con scroll-snap nativo. Hojas con resorte amortiguado que conserva posición/velocidad, tracking 1:1, resistencia y proyección; no se bloquean entradas. Se corrigió la transformación de pulsación de los puntos para conservar su posición al tocarlos.

Respeto de reduced-motion, reduced-transparency y contraste aumentado. Sin animación continua de fondo. Contraste reforzado en los textos del treemap y leyenda separada para celdas estrechas. Layout específico para 768px, evitando comprimir cuatro columnas o truncar indicadores.

## Instalación y distribución

La PWA mantiene manifest standalone, iconos 192/512 y apple-touch-icon con nueva paleta, ID estable y shell offline. Versión final `atlas-v7.1` en HTML, importaciones y service worker; API excluida de caché. El build publica exactamente 14 assets y normaliza finales de línea para reproducibilidad Windows/Linux. Fuera de la salida quedan documentación, tests, SQL, Python, metadatos Git y secretos.

La integración generativa continúa desactivada en el servidor. La demo no incorpora claves en el cliente. El token de Vercel del entorno se utiliza por el proxy únicamente hacia api.vercel.com, sin extraer ni guardar su valor.
