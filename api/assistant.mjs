/**
 * Server-only boundary for the future assistant. No provider is configured.
 * Do not enable until authentication, authorization, quotas and a read-only
 * data source are implemented. Never accept SQL, a system prompt or a provider
 * URL from the public client. A key alone is not sufficient to enable this API.
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
    return res
      .status(400)
      .json({
        error: 'invalid_message',
        message: 'Escribe una pregunta de hasta 2000 caracteres.',
      });
  }
  return res
    .status(503)
    .json({
      error: 'assistant_not_configured',
      message:
        'La integración segura de IA aún no está disponible. Usa la demostración local.',
    });
}
