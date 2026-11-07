---
name: datacore-ui
description: "Diseñar o revisar pantallas Streamlit de DataCore AI: navegación, formularios, gráficos, tipografía y coherencia visual."
---

# Interfaz de DataCore AI

1. Lee `app.py`, `views/productos.py`, `views/inventario.py`, `views/ventas.py` y `.streamlit/config.toml` antes de intervenir. La navegación usa botones laterales con iconos y estado de sesión para Dashboard, Productos, Ventas, Inventario, Asistente IA y Reportes. Conserva sus etiquetas y estado salvo cambio solicitado.
2. Mantén la identidad solicitada: fondo #F2F5FA, navegación/texto #0D1726, violeta #7659E8, turquesa #24C9C0 y fuente sans serif. Usa composiciones específicas por tarea; consulta `docs/WORKSPACE_PETROLEO.md`. Usa títulos, subtítulos y captions de Streamlit con jerarquía consistente; evita fuentes remotas y CSS que dependa de clases internas inestables. Revisa `assets/workspace.css` y el tema nativo antes de agregar estilos.
3. Separa presentación en `views/` y acceso a datos en `database/`. Usa columnas que sigan siendo legibles en pantallas estrechas, etiquetas visibles, tablas con encabezados claros y estados indicados con texto además del color.
4. Conserva `st.form` para el alta y edición de productos, límites de campos y confirmación explícita de desactivación. El buscador usa `streamlit-keyup`; no conviertas una búsqueda o un rerun en una escritura. Mantén claves de widgets estables y la versión original del producto en sesión hasta guardar o recargar explícitamente.
5. En Ventas, conserva carrito, confirmación y reintento en `st.session_state`. No registres ventas al renderizar ni regeneres el UUID de una confirmación incierta. Respeta el bloqueo del carrito pendiente descrito en `ETAPA_3.md`.
6. Para gráficos solicitados usa Pandas y Plotly, ya declarados. Define unidades, periodo, filtros y datos de origen; respeta el tema y proporciona una tabla alternativa. Dashboard y Reportes consultan datos reales; conserva filtros, generación explícita y estados vacíos.
7. Muestra importes en soles (S/) con dos decimales; conserva Decimal en los cálculos. Distingue carga, vacío, validación y fallo de conexión con mensajes útiles sin detalles de credenciales o SQL interno.

Valida las rutas afectadas con `streamlit.testing.v1.AppTest`, usando datos simulados para pantallas SQL, y ejecuta las pruebas de interfaz existentes. Revisa navegación, envío único de formularios, errores, contraste y legibilidad; AppTest no sustituye la inspección visual ni simula las teclas del componente externo. Informa lo comprobado y las limitaciones.
