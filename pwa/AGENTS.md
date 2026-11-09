# Guía de Codex para DataCore AI PWA

## Skill de diseño
Antes de modificar `pwa/`, lee **`.agents/skills/interface-design/SKILL.md`**. Es una copia de la skill open-source [Dammyjay93/interface-design](https://github.com/Dammyjay93/interface-design), con licencia MIT incluida. Úsala para revisar y mejorar el diseño; no ejecutes scripts externos sin inspeccionarlos.

## Objetivo
Aplicación de gestión comercial móvil. Conserva la paleta Atlas existente en `styles.css` (oscuro, papel claro y acento lima); el usuario prohibió sustituirla en esta consolidación. Combina la skill local con [apple-design, commit 5206a950](https://github.com/emilkowalski/skills/tree/5206a950b715e0cabe7043ea0b2304332b91494e/skills/apple-design). Debe sentirse como una herramienta real de datos.

## Reglas de implementación
- La base revisada es `design/atlas-editorial` (`c0f565d`); Streamlit y SwiftUI son aplicaciones separadas.
- Mantén las siete pantallas, incluido Clientes. Solo usa los fixtures de los scripts SQL originales confirmados y su procedencia generada; los datos de prueba se identifican como tales. No inventes historial, sucursales, claves IDENTITY o una conexión en vivo.
- Usa jerarquía clara, tarjetas con datos legibles, navegación accesible, diseño responsive 375px–desktop, estados vacíos y foco de teclado visible.
- No simules funciones reales de IA, cobros, ventas o persistencia. Indica claramente lo pendiente.
- Añade iconos PNG 192/512 y apple-touch-icon; verifica manifest y service worker.
- Ejecuta `python -m unittest discover -s pwa/tests -v` y comprueba el render en móvil y escritorio cuando dispongas de navegador.
- Revisa contrastes, accesibilidad, rendimiento, caching y comportamiento en Safari iOS.
- No incluyas credenciales, contactos de clientes ni acceso directo a SQL/Groq desde el cliente. `api/data.mjs` es un puente Bearer a un origen HTTPS fijo del servidor y permanece sin backend configurado; `backend/` es privado, de lectura y autenticado. No publiques el repositorio privado.
- Antes de publicar, verificar hosting gratuito, límites del plan, ausencia de secretos, URL HTTPS y aprobación de exposición pública **solo de la demo**.
- No fusiones `main` ni ejecutes macOS CI o servicios de pago sin permiso.

## Handoff
Documenta capturas, pruebas ejecutadas, limitaciones y el enlace HTTPS **solo cuando esté realmente publicado**.
