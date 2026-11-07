# Accesibilidad iPhone: implementación y aceptación pendiente

## Preparado en código (no equivale a una auditoría con dispositivo)

- Fuentes semánticas SwiftUI, texto multilínea y vistas con scroll; sin tamaños de
  texto fijos en formularios. Paneles métricos con ViewThatFits y columnas apilables.
- Labels de icono + texto; estado de inventario expresa Disponible/Stock bajo/Agotado,
  cantidad y mínimo. No depende solo de color ni representa una capacidad inventada.
- Targets explícitos >=44 puntos para agregar al carrito; controles grandes en la app.
- Elementos decorativos ocultos a VoiceOver; filas combinadas, campos/acciones
  etiquetados y encabezados semánticos. Gráficos con labels/valores y evidencia
  tabular expandible. No usar la selección táctil como única vía para leer datos.
- Colores semánticos foreground/background, superficies claras/oscuras y contraste
  del texto de estado ajustado por esquema. No se ha certificado contraste WCAG.
- La animación discreta del selector de serie se desactiva con Reduce Motion;
  no hay animaciones repetitivas, flashes ni contenido que exija un gesto preciso.
- Errores visibles con texto, confirmación explícita de simulación y restauración;
  estados de carga y sin datos. No se anuncia una venta real ni éxito tras un error.

## Ejecutar en macOS e iPhone antes de aprobar

Registrar Xcode/OS, dispositivo, tamaño de texto, resultado y capturas **reales**.
El esquema XCUITest preparado captura las seis pantallas, pero aún no se ejecutó.

1. iPhone compacto (por ejemplo SE de tercera generación/iOS 17+) y un iPhone grande;
   orientación vertical/horizontal, área segura y teclado. La app está orientada a
   iPhone; no se presenta como diseño iPad validado.
2. Modo claro y oscuro: comprobar ingreso destacado, cards, búsqueda, menús,
   pickers, alertas, sheets y fuentes; medir contraste con Accessibility Inspector.
3. Dynamic Type estándar, XXXL y tamaños de accesibilidad máximos: comprobar que
   navegación, precios, formularios, Steps, botones y fuentes no se cortan.
4. VoiceOver: recorrido Inicio → selección de fechas → tabla del gráfico; búsqueda,
   filtros, ficha, carrito, cantidad, eliminar, confirmar y recibo. Verificar orden,
   nombres de botones, valores anunciados y retorno de foco tras cerrar sheets.
5. Más → Inventario, Reportes, Asistente: recorrer estados y tablas sin depender
   de gráficos; generar/compartir CSV/PDF; abrir fuentes y cambiar periodo.
6. Reduce Motion y Increase Contrast: revisar cambios de serie y transiciones de
   navegación. La preferencia no debe afectar cálculos ni ocultar estados.
7. Testear Switch Control/Voice Control, objetivos táctiles, navegación por teclado
   cuando corresponda y etiquetas/localización española. No asumir que etiquetas
   de test son etiquetas de VoiceOver: se usan APIs separadas.
8. Red apagada: seis pantallas offline. En modo API: TLS inválido, timeout, error,
   cuerpo malformado y tamaño excesivo; verificar mensajes comprensibles y reintento.
9. Confirmar únicamente cambios de memoria; restaurar la demo y comprobar stock e
   historial iniciales. Revisar que el modo remoto nunca habilite confirmar venta.

**Pendiente:** todos estos recorridos nativos, medición de contraste, VoiceOver,
Dynamic Type en ejecución y pruebas físicas. No se sustituyeron por capturas web.
