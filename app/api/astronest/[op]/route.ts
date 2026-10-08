import { AstroNestError, getChart, getGuidance, interpret, type BirthData, type Domain } from '@/lib/astronest';
import { demoBlocked } from '@/lib/demoGuard';

/**
 * POST /api/astronest/{chart|guidance|interpret}
 * The browser calls this; this calls AstroNest with the secret key. Only these three operations are
 * forwarded, so the route is not an open proxy to every endpoint on your key.
 */
const DOMAINS: readonly Domain[] = [
  'career', 'business', 'finance', 'children', 'property', 'education', 'travel',
  'spirituality', 'lineage', 'reputation', 'partnerships', 'legal', 'family', 'marriage', 'health',
];

export async function POST(req: Request, { params }: { params: Promise<{ op: string }> }) {
  const blocked = demoBlocked(req);
  if (blocked) return blocked;

  const { op } = await params;
  const body = (await req.json().catch(() => null)) as { birthData?: BirthData; domain?: string } | null;
  if (!body?.birthData) {
    return Response.json({ error: 'invalid_request', message: 'birthData is required' }, { status: 400 });
  }

  try {
    switch (op) {
      case 'chart':
        return Response.json(await getChart(body.birthData));
      case 'guidance':
        return Response.json(await getGuidance(body.birthData));
      case 'interpret': {
        const domain = DOMAINS.find((d) => d === body.domain);
        if (!domain) {
          return Response.json({ error: 'invalid_domain', message: `domain must be one of: ${DOMAINS.join(', ')}` }, { status: 400 });
        }
        return Response.json(await interpret(body.birthData, domain));
      }
      default:
        return Response.json({ error: 'not_found', message: `Unknown operation: ${op}` }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof AstroNestError) return Response.json(e.body, { status: e.status });
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    return Response.json(
      { error: timedOut ? 'timeout' : 'upstream_error', message: e instanceof Error ? e.message : 'Request failed' },
      { status: timedOut ? 504 : 502 },
    );
  }
}
