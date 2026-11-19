# Asistente comercial de Nova Retail

La PWA sirve el chat en `/#asistente`. El endpoint de Vercel `POST /api/assistant` envía a Groq los últimos seis intercambios como máximo, la pregunta y los filtros. No persiste conversaciones entre recargas. **Nueva conversación** borra la sesión visible y descarta cualquier respuesta en curso.

La primera llamada pide un plan JSON. El servidor valida sus dimensiones, valores, métricas, límites y escenarios. Luego ejecuta consultas de solo lectura sobre el mismo módulo de datos que usa el dashboard. La segunda llamada redacta texto natural a partir del resultado. Solo el plan exige JSON, por lo que una respuesta narrativa válida ya no depende de nombres de campos. Los registros de errores incluyen estado y etapa, sin preguntas, respuestas ni credenciales. Las tablas, barras, líneas e indicadores se construyen con las cifras devueltas por el servidor. El proveedor recibe el texto de la conversación y resultados agregados. Las cifras en las visualizaciones se calculan en código, y la explicación en lenguaje natural puede requerir revisión.

La fuente cubre 1.671 transacciones de enero a marzo de 2025 en USD. Incluye productos, categorías, precios, descuentos, canales y tiendas. El archivo carece de existencias, stock mínimo, clientes y costos. SQL Server y la aplicación Streamlit tienen sus propias integraciones. Los escenarios permiten modificar precio, volumen o descuento. El volumen escala el neto con mezcla constante. Un descuento hipotético reemplaza las tasas históricas y mantiene las cantidades. Los resultados muestran sus supuestos y las tablas se pueden descargar en CSV.

## Activación

En [Vercel → datacore-ai-demo → Settings → Environment Variables](https://vercel.com/josuecaceresm-2044/datacore-ai-demo/settings/environment-variables), selecciona **Production** para el dominio principal y **Preview** para probar una candidata protegida. Agrega las siguientes variables en cada entorno que corresponda:

- `GROQ_API_KEY` como variable sensible del servidor.
- `DATACORE_ASSISTANT_ENABLED=1` para habilitar las llamadas.
- `GROQ_MODEL` opcional. Predeterminado: `openai/gpt-oss-120b`. Un modelo alternativo debe admitir el modo JSON de Groq.

Una clave ausente produce `groq_key_missing` y la desactivación produce `assistant_disabled`, ambos con estado 503. Credenciales rechazadas y modelos no disponibles reciben mensajes distintos. Tras configurar las variables, vuelve a desplegar el mismo commit. El servidor aplica límites por IP y globales por instancia, un plazo total de 24 segundos y propaga el límite 429 del proveedor con `Retry-After` si está disponible. Para una promoción pública, configura una cuota distribuida para `/api/assistant` en el perímetro y un límite de gasto en Groq. El límite en memoria solo cubre una instancia.

## Verificación

```sh
npm ci --prefix pwa
npm test --prefix pwa
python -m unittest discover -s pwa/tests -v
node pwa/build.mjs
npx --prefix pwa playwright install chromium
node pwa/tests/nova-assistant-browser.mjs
```

Con Chromium del sistema, usa `DATACORE_CHROMIUM=/usr/bin/chromium` en la última orden. Las pruebas de integración usan el endpoint, los datos reales y respuestas controladas del proveedor. La prueba en vivo requiere credenciales de Groq en el entorno de despliegue.
