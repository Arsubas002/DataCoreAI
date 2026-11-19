import { isIP } from 'node:net';
import { analyze, comparePeriods, queryOptions } from '../pwa/js/nova-analysis.js';

const url = 'https://api.groq.com/openai/v1/chat/completions';
const model = 'openai/gpt-oss-120b';
const requestDeadlineMs = 55000;
const intents = ['lookup', 'analysis', 'conversation', 'clarification', 'unavailable'];
const aggregationKeys = ['tool', 'group', 'metric', 'filters', 'view', 'order', 'limit', 'replaceContext',
  'change', 'quantityChange', 'discountRate'];
const comparisonKeys = ['tool', 'periods', 'groups', 'filters', 'replaceContext'];
// Groq strict output requires every property to be present. Optional query
// fields use null on the wire, then undergo the same server validation.
const objectSchema = properties => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
});
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
const list = items => ({ type: 'array', items });
const options = values => ({ type: 'string', enum: values });
const filtersSchema = objectSchema(Object.fromEntries(Object.keys(queryOptions.fields).map(field => [
  field, nullable(list({ type: field === 'discount' ? 'number' : 'string' })),
])));
const querySchema = { anyOf: [
  objectSchema({
    tool: options(['aggregate']),
    group: nullable(options(queryOptions.group)),
    metric: nullable(options(queryOptions.metrics)),
    view: nullable(options(queryOptions.views)),
    order: nullable(options(['asc', 'desc'])),
    limit: nullable({ type: 'integer' }),
    filters: nullable(filtersSchema),
    replaceContext: nullable({ type: 'boolean' }),
    change: nullable({ type: 'number' }),
    quantityChange: nullable({ type: 'number' }),
    discountRate: nullable({ type: 'number' }),
  }),
  objectSchema({
    tool: options(['compare_periods']),
    filters: nullable(filtersSchema),
    replaceContext: nullable({ type: 'boolean' }),
    periods: list(options(queryOptions.fields.month)),
    groups: list(options(queryOptions.comparisonGroups)),
  }),
] };
const outputSchemas = {
  plan: objectSchema({ intent: options(intents), queries: list(querySchema) }),
  review: objectSchema({
    status: options(['ready', 'limited', 'expand']), queries: list(querySchema), discard: list({ type: 'string' }),
  }),
};
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
sharePct representa la participación dentro de todos los grupos filtrados. Para explicar variaciones se
puede comparar períodos. Cada desglose atribuye el mismo diferencial dentro de su dimensión, por lo
que nunca deben sumarse efectos de dimensiones distintas. La descomposición entre transacciones y
ticket es contable y no demuestra causalidad. Comparar meses completos no equivale a comparar promedios diarios.
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
  const structured = stage !== 'answer';
  const gptOss = /^openai\/gpt-oss-(?:20b|120b)$/.test(selectedModel);
  const reasoning = gptOss
    ? { reasoning_effort: stage === 'review' ? 'high' : 'medium', include_reasoning: false } : {};
  const responseFormat = gptOss
    ? { type: 'json_schema', json_schema: { name: 'nova_' + stage, strict: true, schema: outputSchemas[stage] } }
    : { type: 'json_object' };
  const tokenBudget = { plan: 2500, review: 3600, answer: 4000 };
  const modelRequest = {
    model: selectedModel, messages, temperature: 0.2, max_completion_tokens: tokenBudget[stage],
    ...(structured ? { response_format: responseFormat } : {}),
    ...reasoning,
  };
  const response = await fetcher(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(modelRequest),
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
  if (!structured) return content.trim();
  try {
    return JSON.parse(content);
  } catch {
    throw completionError(stage, 'invalid_json', 'El asistente no pudo preparar la consulta. Intenta nuevamente.');
  }
}

function executeQueries(queries, context, results, seen) {
  let missing = 0;
  for (const raw of queries) {
    try {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_query');
      const query = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== null));
      if (query.filters && typeof query.filters === 'object' && !Array.isArray(query.filters)) {
        query.filters = Object.fromEntries(Object.entries(query.filters).filter(([, values]) => values !== null));
      }
      const compare = query.tool === 'compare_periods';
      const allowed = compare ? comparisonKeys : aggregationKeys;
      if ((!compare && query.tool !== undefined && query.tool !== 'aggregate')
        || Object.keys(query).some(key => !allowed.includes(key))
        || (!compare && query.group === undefined && query.metric === undefined)) {
        throw new Error('invalid_tool');
      }
      const result = compare ? comparePeriods(query, context) : analyze(query, context);
      if (compare ? result.coverage !== 'comparable' : result.matches === 0) {
        missing++;
        continue;
      }
      // Equivalent computed evidence only needs one reference, even when returned twice.
      const { view, ...facts } = result;
      const fingerprint = JSON.stringify(facts);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      results.push({ kind: compare ? 'period_comparison' : 'aggregation', evidenceId: 'E' + (results.length + 1), ...result });
    } catch {
      missing++;
    }
  }
  return missing;
}

export async function reply(input, { key, selectedModel = model, fetcher = fetch, signal = AbortSignal.timeout(requestDeadlineMs) }) {
  const { messages, context } = conversation(input);
  const run = (stage, instructions) => complete(fetcher, key, selectedModel, [
    { role: 'system', content: metadata + '\n' + instructions },
    ...messages,
  ], signal, stage);
  const tools = `Herramientas de solo lectura:
- Agregación: {"tool":"aggregate","group":"product","metric":"net","filters":{},"view":"bar"}.
  Opcionales: order "asc"/"desc", limit 1–31, change o quantityChange (variación porcentual -100 a 100)
  y discountRate (tasa que reemplaza las históricas, 0 a 100). Los escenarios usan metric "net".
- Comparación de períodos: {"tool":"compare_periods","periods":["2025-02","2025-03"],"groups":["category","channel"],"filters":{}}.
  Solo dos meses distintos en orden, sin month en filters. Los meses de la consulta prevalecen sobre el contexto.
En el esquema estricto, usa null para campos ajenos a la herramienta elegida y filtros que no aplican.
Si se piden varias dimensiones para dos meses, inclúyelas juntas en groups del comparador.
Cada valor de filtro debe existir en el catálogo y estar en un arreglo. Conserva el contexto ${JSON.stringify(context)}
salvo que se solicite otro alcance. replaceContext:true elimina los filtros iniciales. Las peticiones fuera de
la cobertura de enero–marzo requieren reconocer el límite. No uses el total trimestral como sustituto.`;

  const plan = await run('plan', `Selecciona la intención a partir de la última pregunta y del contexto de conversación.
Devuelve JSON {"intent":"lookup|analysis|conversation|clarification|unavailable","queries":[]}.
lookup es una cifra o lista directa. analysis es una comparación, explicación, diagnóstico, recomendación
o escenario que exige evaluar varios datos. conversation es una interacción sin consulta de cifras.
Usa clarification solo si falta un dato crítico que el historial no aclara. Usa unavailable solo para
una solicitud exclusivamente fuera de la fuente. Los demás casos con cifras requieren 1 a 4 consultas.
Las comparaciones y diagnósticos de ventas de enero, febrero y marzo son consultas disponibles incluso
cuando se piden causas. Consulta la variación observada y aclara después qué causas no pueden demostrarse.
Para una explicación de variación mensual, usa la comparación de períodos y los desgloses solicitados.
Para rankings por dos métricas, ejecuta una agregación por métrica con el orden correcto. Para una recomendación
cruza al menos dos señales pertinentes y evita métricas irrelevantes. Reutiliza entidades de seguimientos, pero
verifica cifras previas con los datos. No presupongas que creció, cayó o fue rentable solo porque lo sugiere la pregunta.
${tools}`);
  if (!intents.includes(plan?.intent) || !Array.isArray(plan.queries) || plan.queries.length > 4) {
    throw completionError('plan', 'invalid_plan', 'El asistente no pudo preparar una consulta válida.');
  }

  const needsData = plan.intent === 'analysis' || plan.intent === 'lookup';
  let evidence = [];
  const seen = new Set();
  let missingQueries = needsData ? executeQueries(plan.queries, context, evidence, seen) : 0;
  const reviewNeeded = plan.intent === 'analysis' || (needsData && (!evidence.length || missingQueries > 0));
  let status = needsData ? 'ready' : 'not_needed';
  if (reviewNeeded) {
    const review = await run('review', `Verifica la cobertura de la evidencia para la última pregunta.
Devuelve JSON {"status":"ready|limited|expand","queries":[],"discard":[]}. Usa discard para referencias cuyos
segmentos, períodos o métricas no correspondan. ready exige evidencia suficiente para cada parte importante.
limited significa que la fuente carece de información o que solo sustenta una respuesta parcial.
expand autoriza 1 o 2 consultas nuevas y pertinentes cuando falta evidencia recuperable.
Contrasta las premisas con los resultados y verifica que no haya meses ausentes, rankings truncados o comparaciones
inconsistentes. La ausencia de registros no equivale a cero. Identifica límites causales y de costos.
Recibiste ${missingQueries} consultas inválidas o sin datos. Evidencia del servidor:
${JSON.stringify(evidence)}
${tools}`);
    if (!['ready', 'limited', 'expand'].includes(review?.status)) {
      throw completionError('review', 'invalid_review', 'El asistente no pudo verificar el análisis. Intenta nuevamente.');
    }
    const discard = Array.isArray(review.discard) ? review.discard : [];
    const keep = new Set(evidence.filter(result => !discard.includes(result.evidenceId)));
    // Keep old references reserved so new results always have distinct IDs.
    const previousCount = evidence.length;
    if (review.status === 'expand' && Array.isArray(review.queries) && review.queries.length > 0 && review.queries.length <= 2) {
      const failed = executeQueries(review.queries, context, evidence, seen);
      missingQueries += failed;
      status = evidence.length > previousCount && failed === 0 ? 'ready' : 'limited';
    } else {
      status = review.status === 'ready' ? 'ready' : 'limited';
    }
    evidence = evidence.filter((result, index) => index >= previousCount || keep.has(result));
  }
  if (needsData && !evidence.length) status = 'limited';

  const findings = JSON.stringify({ status, missingQueries, evidence });
  const requireReference = reviewNeeded && evidence.length > 0;
  const briefing = `Responde en español natural, con la conclusión primero. Ajusta profundidad y tono a la
solicitud. En un dato directo, sé breve. En un análisis, explica qué diferencias importan, cuantifica con la
evidencia, distingue hechos de hipótesis y explica el fundamento y la comprobación de cada recomendación.
Si la premisa contradice los datos, corrígela con tacto. No atribuyas causalidad a una contribución contable.
Con estado limited, aclara qué parte no puede responderse; si no hay evidencia, no enumeres cifras. Con
intención ${plan.intent} (si no hay evidencia), usa la cobertura de la fuente y pregunta solo lo necesario.
Usa el historial para interpretar, no como fuente de cifras. Convierte centavos a USD. Cita con [E1], [E2], etc.,
solo referencias de los resultados que uses. ${requireReference ? 'Incluye al menos una referencia válida.' : 'Cita los datos solo si están visibles como artefactos.'}
No muestres el plan, la revisión ni el razonamiento privado. Usa párrafos breves, sin tablas Markdown.
Resultado de consultas verificadas:
${findings}`;
  let report = await run('answer', briefing);
  const allowedReferences = new Set(evidence.map(item => item.evidenceId));
  const references = text => [...text.matchAll(/\[(E\d+)\]/g)].map(([, ref]) => ref);
  const validReferences = text => {
    const used = references(text);
    return (!requireReference || used.length > 0) && used.every(ref => allowedReferences.has(ref));
  };
  if (!validReferences(report)) {
    report = await run('answer', briefing + '\nLa respuesta debe usar únicamente las referencias de evidencia disponibles y ninguna referencia inventada.');
  }
  if (!validReferences(report)) {
    report = evidence.length
      ? 'Los resultados que pude verificar están en las tablas. No pude respaldar una conclusión adicional con esta evidencia.'
      : 'No pude respaldar una conclusión con los datos de Nova Retail disponibles para esta consulta.';
  }
  const cited = new Set(references(report));
  return {
    sections: [{ kind: 'answer', text: report.slice(0, 10000) }],
    artifacts: evidence.filter(result => reviewNeeded || cited.has(result.evidenceId) || result.view !== 'none')
      .map(result => result.view === 'none' ? { ...result, view: 'table' } : result),
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

export function createHandler({ env = process.env, fetcher = fetch, deadline = () => AbortSignal.timeout(requestDeadlineMs), logger = console } = {}) {
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
