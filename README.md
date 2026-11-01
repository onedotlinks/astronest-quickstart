# AstroNest: Vedic astrology for apps and AI agents

[AstroNest](https://www.astronest.ai/developers) is a Vedic astrology (Jyotiṣa) engine you can call as a REST API
or connect to an AI agent over MCP. It computes on its own JPL DE440 ephemeris. The chart, periods and the readings
(interpret, guidance, compatibility, guna milan) are deterministic: the same birth data always gives the same answer,
with the reasons and the classical books each reading rests on. Only forecast and timing are worded by a language model,
and they say so.

This repository has two things: how to **connect AstroNest to an AI agent**, and a **Next.js quickstart** on the REST API.

- Docs: <https://www.astronest.ai/developers>
- OpenAPI 3.1 spec: <https://www.astronest.ai/openapi/astronest-v1.json>
- Postman: [AstroNest Developer API workspace](https://www.postman.com/onedotlinks-2238096/astronest-developer-api/collection/oam9lo2/astronest-developer-api)
- Keys: <https://www.astronest.ai/developer>. Sandbox keys are free and return fixed samples.
- Guides: [Kundli API](https://www.astronest.ai/developers/kundli-api) ·
  [Guna Milan API](https://www.astronest.ai/developers/guna-milan-api) ·
  [Muhūrta API](https://www.astronest.ai/developers/muhurta-api) ·
  [Praśna API](https://www.astronest.ai/developers/prashna-api) ·
  [Ephemeris API](https://www.astronest.ai/developers/ephemeris-api) ·
  [Astrology MCP server](https://www.astronest.ai/developers/astrology-mcp-server)
- For LLMs: <https://www.astronest.ai/llms.txt>

## Connect it to an AI agent (MCP)

Endpoint (Streamable HTTP): `https://www.astronest.ai/api/developer/mcp`

**Claude Code**

```bash
claude mcp add --transport http astronest https://www.astronest.ai/api/developer/mcp \
  --header "Authorization: Bearer YOUR_ASTRONEST_KEY"
```

**`mcp.json`** (Cursor, VS Code and other clients that read this format)

```json
{
  "mcpServers": {
    "astronest": {
      "url": "https://www.astronest.ai/api/developer/mcp",
      "headers": { "Authorization": "Bearer YOUR_ASTRONEST_KEY" }
    }
  }
}
```

Also on [Smithery](https://smithery.ai/servers/onedotlinks/astronest) and the
[MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.onedotlinks/astronest`.

### What an agent can ask it

Each tool answers one question. The interpretive ones read the chart the way a practitioner does and return the
reasons, not just positions:

| Tool | The question it answers |
|---|---|
| `get_life_reading` | What does my life look like as a whole — which areas (marriage, children, career, money, property…) come into focus when, past and future? |
| `get_domain_timeline` | When is marriage, career or another area in focus, or what do the next few years hold for it? |
| `get_relationship_reading` | How do two people get on as business partners, siblings, parent and child, or friends? |
| `get_venture_timing` | When should I launch, sign or borrow — and which line of business does my chart support? |
| `assess_gemstone` | Should I wear this stone (blue sapphire, pukhraj, emerald…), and why or why not? |
| `get_compatibility`, `get_guna_milan` | Kundli matching: the 36-point Aṣṭakūṭa score, Manglik from the lagna, Moon and Venus, and the full pair reading |
| `interpret_domain`, `get_guidance` | What does my chart say about one area of life, and what do the running periods ask of me now? |
| `find_muhurta` | Which days and windows in a date range suit an event? |
| `get_chart`, `get_dasha`, ephemeris tools | The chart (with the sixteen divisional charts), Vimśottarī daśā to pratyantar, and raw JPL DE440 positions |

The readings describe what the chart shows and why. They are symbolic interpretation, not predictions, and not
medical, legal, financial or psychological advice; every response carries that disclaimer.

## The Next.js quickstart

A small Next.js app on the [AstroNest Developer API](https://www.astronest.ai/developer). Enter a birth
date, time and place and get:

- **the chart**: lagna, the nine grahas with sign, house, nakṣatra and dignity, and the running daśā (1 credit)
- **guidance now**: plain-language cards for the running mahādaśā / antardaśā / pratyantardaśā (3 credits)
- **a domain reading**: career, marriage, finance and twelve more, with supporting factors, cautions,
  timing windows and how many methods agree (5 credits)
- optionally, **"explain in plain words"** with your own LLM (0 AstroNest credits)

None of the three AstroNest calls uses a language model. They are deterministic, so they return in
seconds and the same input always gives the same answer.

## Run it in five minutes

1. **Get a key.** Sign in at <https://www.astronest.ai/developer> and create a key. Every account gets
   **100 free live credits once**, valid for 60 days from your first live key (they do not renew): enough for
   about 20 domain readings or 100 charts.
   Sandbox keys are free with no time limit and return fixed sample responses. When the free credits are used,
   or after 60 days, live calls return `402 credits_exhausted` until you buy a credit pack; sandbox keys keep working.
2. **Install and configure.**
   ```bash
   npm install
   cp .env.example .env.local
   # put your key in ASTRONEST_API_KEY
   ```
3. **Run.**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

## How it fits together

```
browser ──► /api/astronest/{chart|guidance|interpret} ──► AstroNest API   (your key, server-side)
        └─► /api/explain ──────────────────────────────► your LLM         (optional)
```

- `lib/astronest.ts` is a typed client. It is the file to copy into your own app.
- `app/api/astronest/[op]/route.ts` forwards **only** those three operations, so the route can't be
  used to call every endpoint your key allows.
- `app/api/explain/route.ts` sends the reading AstroNest computed to any OpenAI-compatible
  chat-completions endpoint (OpenAI, Vercel AI Gateway, OpenRouter, a local Ollama) and tells the
  model to use only the facts it was given. Your model writes the words; AstroNest does the astrology.

## Before you deploy

- **Your key is a secret.** It lives in server environment variables only. Never prefix it with
  `NEXT_PUBLIC_`, and never call the API from the browser. The API sends no CORS headers, so browser
  calls fail anyway.
- **The demo routes spend your credits for anyone who calls them.** By default they answer only on
  `localhost`. Put your own sign-in (and ideally a rate limit) in front of them before you set
  `ALLOW_PUBLIC_DEMO=true`. The localhost check reads the request host, so don't rely on it behind a
  proxy that rewrites `Host`.
- **Birth data is personal data.** This app stores nothing, and the API stores nothing either. If you
  add storage, you take on the data-protection duties that come with it.
- **Show the disclaimer** that comes with every response: symbolic interpretation, not medical, legal,
  financial or psychological advice.

## Going further

| Endpoint | Credits | Notes |
|---|---|---|
| `POST /v1/chart` | 1 | add `location` for astrocartography and a relocated frame |
| `POST /v1/dasha` | 1 | full Vimśottarī timeline |
| `POST /v1/guidance` | 3 | `referenceDate` for any other moment |
| `POST /v1/interpret` | 5 | 15 domains |
| `POST /v1/timing/resolve` | 7 | narrated by a language model; allow 90 s |
| `POST /v1/forecast` | 8 | narrated by a language model; allow 90 s |
| `POST /v1/muhurta` | 10 | auspicious windows in a date range |
| `POST /v1/compatibility` | 12 | two charts read together |
| `POST /v1/guna-milan` | 2 | the 36-point Aṣṭakūṭa match + Manglik (lagna, Moon, Venus) for a pair |
| `POST /v1/life-reading` | 10 | the whole-life reading: chapters and 11 life areas, past and future (`areas` narrows it) |
| `POST /v1/domain-timeline` | 3 | one life area across the life: every period that governs it, optionally within a date window |
| `POST /v1/relationship` | 8 | business partners, siblings, parent & child, friends: bond houses, cross-chart contacts, the bond meter |
| `POST /v1/venture-timing` | 10 | when to commit, build, guard or hold; the businesses you describe ranked on the chart |
| `POST /v1/gem-assessment` | 5 | should this chart wear this stone: the verdict, every ground for and against, how long the reason lasts |
| `POST /v1/ephemeris/positions` | 0.1 | raw positions at a moment (JPL DE440); no birth data needed |
| `POST /v1/ephemeris/angles` | 0.1 | ascendant, MC and house cusps for a moment and place |
| `POST /v1/ephemeris/ayanamsa` | 0.1 | Lahiri, Raman, Krishnamurti, Fagan–Bradley |
| `POST /v1/ephemeris/sunrise` | 0.1 | sunrise, sunset and next sunrise for a local date |
| `POST /v1/ephemeris/series` | 1 | per started 100 points, up to 1,000 |

The four single-moment Ephemeris calls cost 0.1 credit each: 1 credit per started block of 10, counted
across them per account (the call that opens a block reports `units_charged: 1`, the next nine report 0).
Only successful (2xx) calls are charged. When credits run out, the API returns
`402 credits_exhausted`; buy a pack in the developer portal. Paid credits do not expire.

- OpenAPI 3.1 spec: <https://www.astronest.ai/openapi/astronest-v1.json> (import it into Postman, or
  generate a client in any language)
- Reference: the developer portal at <https://www.astronest.ai/developer>
