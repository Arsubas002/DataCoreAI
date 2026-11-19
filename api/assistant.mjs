import { isIP } from 'node:net';
import { analyze, queryOptions } from '../pwa/js/nova-analysis.js';

const url = 'https://api.groq.com/openai/v1/chat/completions';
const model = 'openai/gpt-oss-120b';
const budget = new Map();
const minute = 60_000;
let globalWindow = { until: 0, count: 0 };

const metadata = `Fuente: Nova Retail, ventas históricas del 1 de enero al 31 de marzo de 2025 en USD.
No hay existencias, stock mínimo, costos, márgenes, beneficios, clientes ni datos de abril a diciembre.
Las cifras monetarias de herramientas están en centavos de dólar. ticket = neto / transacciones;
price = promedio unitario bruto ponderado, discount como métrica = importe descontado.
periodChangePct = variación porcentual frente al período anterior con registros dentro de los mismos filtros.
Los escenarios modifican solo las variables indicadas. Un cambio de volumen escala el neto agregado
con la misma mezcla de productos y descuentos. Un descuento hipotético sustituye el histórico.
Precios y descuentos por transacción se redondean a centavos; no se estima elasticidad ni beneficio.
sharePct representa la participación dentro de todos los grupos filtrados.
Opciones de consulta: ${JSON.stringify(queryOptions)}.`;

function failure(status, message, retryAfter) {
  return Object.assign(new Error(message), { status, retryAfter });
}

function conversation(body) {
  if (!body || typeof body !== 'object' || JSON.stringify(body).length > 18000) throw failure(400, 'La conversación supera el tamaño permitido.');
  const { message, history = [], context = {} } = body;
  if (typeof message !== 'string' || !message.trim() || message.length > 2000 || !Array.isArray(history)
      || history.length > 12 || history.length % 2 || history.some((turn, i) =>
        turn?.role !== (i % 2 ? 'assistant' : 'user') || typeof turn.content !== 'string'
        || !turn.content.trim() || turn.content.length > (i % 2 ? 2400 : 2000))) {
    throw failure(400, 'Escribe una pregunta de hasta 2000 caracteres.');
  }
  try { analyze({ filters: context }); } catch { throw failure(400, 'Los filtros de la conversación son inválidos.'); }
  return { messages: [...history.map(({ role, content }) => ({ role, content })), { role: 'user', content: message.trim() }], context };
}

function completionError(stage, reason, message) {
  return Object.assign(failure(502, message), { stage, reason });
}

async function complete(fetcher, key, selectedModel, messages, signal, stage) {
  const planned = stage === 'plan';
  const response = await fetcher(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: selectedModel, messages, temperature: 0.2, max_completion_tokens: planned ? 2400 : 4200,
      ...(planned ? { response_format: { type: 'json_object' } } : {}) }),
    signal,
  });
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    throw failure(429, 'Groq alcanzó su límite temporal. Vuelve a intentarlo en unos segundos.', /^\d{1,5}$/.test(retry ?? '') ? retry : undefined);
  }
  if (response.status === 401 || response.status === 403) {
    throw failure(502, 'Groq rechazó la credencial del servidor. El administrador debe revisar la clave y sus permisos.');
  }
  if (!response.ok) {
    const payload = response.status === 400 || response.status === 404
      ? await response.json().catch(() => null) : null;
    if (['model_not_found', 'model_decommissioned', 'model_not_allowed'].includes(payload?.error?.code)) {
      throw failure(502, 'El modelo de Groq configurado no está disponible para esta cuenta. El administrador debe revisar GROQ_MODEL.');
    }
    throw failure(502, 'Groq no pudo procesar la solicitud. Intenta nuevamente.');
  }
  const output = await response.json().catch(() => null);
  const result = output?.choices?.[0];
  if (result?.finish_reason === 'length') {
    throw completionError(stage, 'token_limit', 'La respuesta quedó incompleta. Prueba con una pregunta más acotada.');
  }
  const content = result?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw completionError(stage, 'empty_content', 'Groq no generó texto para esta consulta. Intenta nuevamente.');
  }
  if (!planned) return content.trim();
  try {
    return JSON.parse(content);
  } catch {
    throw completionError(stage, 'invalid_json', 'El asistente no pudo preparar la consulta. Intenta nuevamente.');
  }
}

export async function reply(input, { key, selectedModel = model, fetcher = fetch, signal = AbortSignal.timeout(24000) }) {
  const { messages, context } = conversation(input);
  const plan = await complete(fetcher, key, selectedModel, [
    { role: 'system', content: `${metadata}
Eres el planificador de consultas de un analista comercial en español. Interpreta texto libre, faltas ortográficas
y referencias a turnos anteriores. Devuelve JSON {"queries":[{"group":"month","metric":"net","filters":{},
"view":"line"}]}. Usa entre cero y cuatro consultas; cero solo para saludos, aclaraciones o datos ausentes.
Cada filtro es un arreglo con valores del catálogo exacto. Para comparar categorías coloca ambas en el arreglo.
Opcionales: order "asc" o "desc", limit entero de 1 a 31, change numérico -100 a 100 para variar precios
(solo metric "net"). Usa view "none" para preguntas sencillas, "line" para una serie, "bar" para rankings,
"table" para detalle y escenarios, "distribution" para participación porcentual, "kpi" para un resumen.
Para escenarios usa change (cambio porcentual de precio), quantityChange (cambio porcentual de volumen)
o discountRate (porcentaje que reemplaza las tasas históricas). Agrupa por categoría para compararlas.
Si el usuario retoma una entidad o un orden previo, usa los nombres y hallazgos del historial. Considera el contexto inicial ${JSON.stringify(context)}:
los filtros de una consulta lo amplían o reemplazan por dimensión; usa replaceContext:true para una consulta
explícitamente global. No conviertas rentabilidad en ventas sin explicar la diferencia.` },
    ...messages,
  ], signal, 'plan');
  if (!Array.isArray(plan?.queries) || plan.queries.length > 4) throw completionError('plan', 'invalid_plan', 'El asistente no pudo preparar una consulta válida.');
  let evidence;
  try {
    evidence = plan.queries.map(query => analyze(query, context));
  } catch {
    throw completionError('plan', 'invalid_query', 'El asistente no pudo interpretar el alcance de la consulta. Prueba precisando producto o período.');
  }
  const report = await complete(fetcher, key, selectedModel, [
    { role: 'system', content: `${metadata}
Responde en español como analista comercial, con texto natural y párrafos breves. Estructura análisis
complejos con rótulos Hallazgos, Cálculos y Recomendaciones cuando apliquen. Identifica límites de cobertura,
distingue hipótesis de resultados, explica qué respalda cada recomendación y qué medir para validarla.
Adapta el nivel técnico a la pregunta. En una tendencia, identifica el mejor y el peor período observado.
Usa exclusivamente cifras y entidades de la evidencia calculada para este turno. El historial orienta la
conversación y puede contener errores. Sin evidencia de un dato, reconócelo o pide precisión. Evita atribuir
causalidad a correlaciones. Texto sin Markdown. Evidencia calculada por el servidor:
${JSON.stringify(evidence)}` },
    ...messages,
  ], signal, 'answer');
  return {
    sections: [{ kind: 'answer', text: report.slice(0, 10000) }],
    artifacts: evidence.filter(result => result.view !== 'none' && result.matches > 0),
  };
}

function permit(req) {
  const now = Date.now();
  if (globalWindow.until <= now) {
    globalWindow = { until: now + minute, count: 0 };
    for (const [ip, entry] of budget) if (entry.until <= now) budget.delete(ip);
  }
  const address = req.headers['x-vercel-forwarded-for'];
  const ip = typeof address === 'string' && isIP(address) ? address : req.socket?.remoteAddress ?? 'unknown';
  const current = budget.get(ip);
  const entry = current?.until > now ? current : { until: now + minute, count: 0 };
  if (globalWindow.count >= 24 || entry.count >= 6) return false;
  globalWindow.count++;
  entry.count++;
  budget.set(ip, entry);
  return true;
}

export function createHandler({ env = process.env, fetcher = fetch, deadline = () => AbortSignal.timeout(24000), logger = console } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }
    try {
      if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') {
        throw failure(403, 'Usa el asistente desde DataCore AI.');
      }
      conversation(req.body);
      const key = env.GROQ_API_KEY?.trim();
      if (!key) {
        return res.status(503).json({
          error: 'groq_key_missing',
          message: 'El asistente necesita una clave de Groq. El administrador debe configurar GROQ_API_KEY en Vercel y volver a desplegar.',
        });
      }
      if (env.DATACORE_ASSISTANT_ENABLED?.trim() !== '1') {
        return res.status(503).json({
          error: 'assistant_disabled',
          message: 'El asistente está desactivado. El administrador debe establecer DATACORE_ASSISTANT_ENABLED=1 en Vercel y volver a desplegar.',
        });
      }
      if (!permit(req)) throw failure(429, 'Hay demasiadas consultas en curso. Vuelve a intentarlo en un minuto.', '60');
      const result = await reply(req.body, {
        key, selectedModel: env.GROQ_MODEL?.trim() || model, fetcher, signal: deadline(),
      });
      return res.status(200).json(result);
    } catch (error) {
      const timeout = error.name === 'TimeoutError' || error.name === 'AbortError';
      const status = error.status ?? (timeout ? 504 : 502);
      if (status >= 500) logger.warn('datacore.assistant', {
        status, stage: error.stage ?? 'request', reason: error.reason ?? (timeout ? 'timeout' : 'provider_failure'),
      });
      if (error.retryAfter) res.setHeader('Retry-After', error.retryAfter);
      const message = error.status ? error.message : timeout
        ? 'Groq tardó demasiado en responder. Intenta de nuevo.' : 'No se pudo conectar con el asistente. Intenta de nuevo.';
      return res.status(status).json({ message });
    }
  };
}

export default createHandler();
