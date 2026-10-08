import { demoBlocked } from '@/lib/demoGuard';

/**
 * POST /api/explain — "bring your own LLM".
 *
 * Takes a reading AstroNest already computed and asks YOUR model to put it in plain words, through any
 * OpenAI-compatible chat-completions endpoint. AstroNest is not called and no credits are spent.
 *
 * The prompt pins the model to the reading it is given. A model asked to "explain a chart" freely will
 * invent placements and dates; that is the failure the deterministic API exists to prevent.
 */
const SYSTEM = [
  'You explain a Vedic astrology reading to a non-specialist in warm, plain language.',
  'Use ONLY the facts in the JSON you are given. Do not add planets, placements, yogas, dates or periods',
  'that are not in it, and do not compute anything yourself. If something is not in the JSON, do not mention it.',
  'Keep it under 200 words. End with one line saying this is symbolic interpretation, not advice.',
].join(' ');

export async function POST(req: Request) {
  const blocked = demoBlocked(req);
  if (blocked) return blocked;

  const key = process.env.LLM_API_KEY;
  if (!key) {
    return Response.json({ error: 'llm_not_configured', message: 'Set LLM_API_KEY to enable explanations.' }, { status: 501 });
  }
  const body = (await req.json().catch(() => null)) as { reading?: unknown } | null;
  if (!body?.reading) {
    return Response.json({ error: 'invalid_request', message: 'reading is required' }, { status: 400 });
  }

  // Strip the billing and boilerplate fields: the model needs the reading, not the envelope.
  const { usage: _u, requestId: _r, disclaimer: _d, ...reading } = body.reading as Record<string, unknown>;

  const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(reading) },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  }).catch((e: unknown) => e as Error);

  if (res instanceof Error) {
    return Response.json({ error: 'llm_unreachable', message: res.message }, { status: 502 });
  }
  const json = (await res.json().catch(() => null)) as { choices?: Array<{ message?: { content?: string } }> } | null;
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!res.ok || !text) {
    return Response.json({ error: 'llm_failed', message: `Model returned HTTP ${res.status}` }, { status: 502 });
  }
  return Response.json({ explanation: text });
}

/** Lets the page show or hide the button without exposing the key. */
export async function GET() {
  return Response.json({ enabled: Boolean(process.env.LLM_API_KEY) });
}
