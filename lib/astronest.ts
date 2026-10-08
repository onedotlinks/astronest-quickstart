/**
 * A small server-side client for the AstroNest Developer API.
 *
 * Server only: it reads ASTRONEST_API_KEY, which must never reach the browser. The API sends no CORS
 * headers, so a browser call would fail anyway; call it from route handlers and server components.
 *
 * Full spec: https://www.astronest.ai/openapi/astronest-v1.json
 */

export type BirthData = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24-hour, local to `timezone`). Omit if unknown. */
  time?: string;
  /** IANA timezone of the birthplace, e.g. "Asia/Kolkata". */
  timezone: string;
  latitude: number;
  longitude: number;
};

export type Domain =
  | 'career' | 'business' | 'finance' | 'children' | 'property' | 'education' | 'travel'
  | 'spirituality' | 'lineage' | 'reputation' | 'partnerships' | 'legal' | 'family'
  | 'marriage' | 'health';

export type Usage = { units_charged: number; remaining_credits: number };

export type Planet = {
  planet: string;
  sign: string;
  house: number;
  degree: number;
  longitude: number;
  retrograde: boolean;
  nakshatra: string | null;
  pada: number | null;
  dignity: string | null;
};

export type CurrentDasha = {
  mahadasha: string;
  mahadashaEnd: string;
  antardasha: string | null;
  antardashaEnd: string | null;
} | null;

export type ChartResponse = {
  requestId: string;
  computationId: string;
  ascendant: { sign: string; degree: number; nakshatra: string | null };
  planets: Planet[];
  houses: Array<{ house: number; sign: string; degree: number; lord: string }>;
  dasha: { current: CurrentDasha; timeline: unknown[] } | null;
  usage: Usage;
  disclaimer: string;
};

export type GuidanceCard = {
  kind: string;
  key: string;
  headline: string;
  because: string;
  do: string[];
  takeCare: string[];
  areas: string[];
  why: string;
  cancelled: boolean;
};

export type GuidanceResponse = {
  requestId: string;
  referenceDate: string;
  levels: Array<{
    level: 'chapter' | 'period' | 'stretch';
    planet: string;
    start: string;
    end: string;
    heading: string;
    notes: string[];
    cards: GuidanceCard[];
  }>;
  relation: GuidanceCard | null;
  formedNotRunning: string[];
  healthNote: string | null;
  usage: Usage;
  disclaimer: string;
};

export type InterpretResponse = {
  requestId: string;
  domain: string;
  confidenceTier: 'high' | 'medium' | 'low';
  timingPattern: 'favorable' | 'cautionary' | 'mixed' | 'unclear';
  keyInsights: string[];
  cautionNotes: string[];
  timingWindows?: Array<{ period: string; tone: 'favorable' | 'cautionary' | 'neutral'; description: string }>;
  practicalContext?: string;
  classicalSources?: string[];
  methodAgreement?: { methodsConsulted: number; methodsThatSpoke: number; methodsAgreeing: number; verdictContested: boolean };
  usage: Usage;
  disclaimer: string;
};

export type ApiError = { error: string; message: string; requestId: string | null; statusCode: number };

export class AstroNestError extends Error {
  constructor(public readonly status: number, public readonly body: ApiError) {
    super(`${body.error}: ${body.message}`);
  }
}

const DEFAULT_BASE_URL = 'https://www.astronest.ai/api/developer';

async function post<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  const key = process.env.ASTRONEST_API_KEY;
  if (!key) {
    throw new AstroNestError(500, {
      error: 'missing_api_key',
      message: 'Set ASTRONEST_API_KEY in .env.local (create a key at https://www.astronest.ai/developer).',
      requestId: null,
      statusCode: 500,
    });
  }
  const base = (process.env.ASTRONEST_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AstroNestError(res.status, (json as ApiError) ?? {
      error: 'http_error',
      message: `HTTP ${res.status}`,
      requestId: null,
      statusCode: res.status,
    });
  }
  return json as T;
}

/** Natal chart. 1 credit. */
export const getChart = (birthData: BirthData) =>
  post<ChartResponse>('/v1/chart', { birthData, western: false });

/** Guidance for the running daśā periods. 3 credits. No language model. */
export const getGuidance = (birthData: BirthData, referenceDate?: string) =>
  post<GuidanceResponse>('/v1/guidance', { birthData, ...(referenceDate ? { referenceDate } : {}) });

/** Deterministic reading of one life domain. 5 credits. No language model. */
export const interpret = (birthData: BirthData, domain: Domain) =>
  post<InterpretResponse>('/v1/interpret', { birthData, domain });
