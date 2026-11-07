# Guía de Codex para DataCore AI PWA

## Skill de diseño
Antes de modificar `pwa/`, lee **`.agents/skills/interface-design/SKILL.md`**. Es una copia de la skill open-source [Dammyjay93/interface-design](https://github.com/Dammyjay93/interface-design), con licencia MIT incluida. Úsala para revisar y mejorar el diseño; no ejecutes scripts externos sin inspeccionarlos.

## Objetivo
Aplicación de gestión comercial móvil, visualmente profesional, con identidad **petróleo oscuro, blanco frío, turquesa y violeta sutil**. Debe sentirse como una herramienta real de datos, no como una landing genérica.

## Reglas de implementación
- Prioriza la PWA estática `pwa/` en PR #15, independiente de Streamlit, SQL Server y SwiftUI.
- Mantén las seis pantallas. En demo, todos los datos son ficticios y se deben identificar como tales.
- Usa jerarquía clara, tarjetas con datos legibles, navegación accesible, diseño responsive 375px–desktop, estados vacíos y foco de teclado visible.
- No simules funciones reales de IA, cobros, ventas o persistencia. Indica claramente lo pendiente.
- Añade iconos PNG 192/512 y apple-touch-icon; verifica manifest y service worker.
- Ejecuta `python -m unittest discover -s pwa/tests -v` y comprueba el render en móvil y escritorio cuando dispongas de navegador.
- Revisa contrastes, accesibilidad, rendimiento, caching y comportamiento en Safari iOS.
- No incluyas credenciales, datos reales ni llamadas a SQL/Groq. No publiques el repositorio privado.
- Antes de publicar, verificar hosting gratuito, límites del plan, ausencia de secretos, URL HTTPS y aprobación de exposición pública **solo de la demo**.
- No fusiones `main` ni ejecutes macOS CI o servicios de pago sin permiso.

## Handoff
Documenta capturas, pruebas ejecutadas, limitaciones y el enlace HTTPS **solo cuando esté realmente publicado**.
