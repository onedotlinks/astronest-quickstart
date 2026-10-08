/**
 * The routes in this app spend the owner's AstroNest credits for whoever calls them. Deployed as-is,
 * anyone who finds the URL could drain the balance. So by default they answer only requests addressed
 * to localhost; set ALLOW_PUBLIC_DEMO=true once your own sign-in sits in front of them.
 *
 * The host comes from the request HEADERS, not `req.url`: under `next start`, `req.url` is built from
 * the address the server listens on (localhost), so checking it would wave every public request through.
 * Any host header that is not local blocks the request.
 */
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function hostnameOf(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0].trim().toLowerCase();
  if (!first) return null;
  if (first.startsWith('[')) return first.slice(0, first.indexOf(']') + 1); // [::1]:3000 → [::1]
  return first.split(':')[0];
}

export function demoBlocked(req: Request): Response | null {
  if (process.env.ALLOW_PUBLIC_DEMO === 'true') return null;
  const hosts = [
    hostnameOf(req.headers.get('x-forwarded-host')),
    hostnameOf(req.headers.get('host')),
    new URL(req.url).hostname.toLowerCase(),
  ].filter((h): h is string => Boolean(h));
  if (hosts.length > 0 && hosts.every((h) => LOCAL.has(h))) return null;
  return Response.json(
    {
      error: 'demo_not_public',
      message:
        'These routes spend your AstroNest credits for anyone who calls them, so they answer only on localhost. '
        + 'Add your own authentication, then set ALLOW_PUBLIC_DEMO=true.',
    },
    { status: 403 },
  );
}
