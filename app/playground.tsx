'use client';

import { useEffect, useState } from 'react';
import type {
  ApiError,
  BirthData,
  ChartResponse,
  Domain,
  GuidanceResponse,
  InterpretResponse,
} from '@/lib/astronest';

/** A few birthplaces so the demo runs without a geocoder. Add your own, or wire in a place search. */
const PLACES = [
  { label: 'New Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
  { label: 'Mumbai', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { label: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { label: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { label: 'Toronto', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { label: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
];

const DOMAINS: Domain[] = [
  'career', 'finance', 'marriage', 'health', 'education', 'property', 'children', 'business',
  'travel', 'family', 'partnerships', 'reputation', 'spirituality', 'legal', 'lineage',
];

type Result =
  | { kind: 'chart'; data: ChartResponse }
  | { kind: 'guidance'; data: GuidanceResponse }
  | { kind: 'interpret'; data: InterpretResponse };

export default function Playground() {
  const [date, setDate] = useState('1990-05-12');
  const [time, setTime] = useState('14:35');
  const [timeKnown, setTimeKnown] = useState(true);
  const [place, setPlace] = useState(0);
  const [domain, setDomain] = useState<Domain>('career');

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [llmEnabled, setLlmEnabled] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/explain').then((r) => r.json()).then((j) => setLlmEnabled(Boolean(j?.enabled))).catch(() => {});
  }, []);

  const birthData = (): BirthData => {
    const p = PLACES[place];
    return {
      date,
      ...(timeKnown && time ? { time } : {}),
      timezone: p.timezone,
      latitude: p.latitude,
      longitude: p.longitude,
    };
  };

  async function run(op: Result['kind']) {
    setBusy(op);
    setError(null);
    setExplanation(null);
    try {
      const res = await fetch(`/api/astronest/${op}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ birthData: birthData(), domain }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      setResult({ kind: op, data: json } as Result);
      if (typeof json?.usage?.remaining_credits === 'number') setRemaining(json.usage.remaining_credits);
    } catch (e) {
      setError({ error: 'network_error', message: e instanceof Error ? e.message : 'Request failed', requestId: null, statusCode: 0 });
    } finally {
      setBusy(null);
    }
  }

  async function explain() {
    if (!result) return;
    setBusy('explain');
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reading: result.data }),
      });
      const json = await res.json();
      if (!res.ok) setError(json as ApiError);
      else setExplanation(json.explanation);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="card">
        <h2>Birth details</h2>
        <div className="grid">
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="time">Time (local)</label>
            <input id="time" type="time" value={time} disabled={!timeKnown} onChange={(e) => setTime(e.target.value)} />
            <label style={{ marginTop: 4 }}>
              <input type="checkbox" checked={!timeKnown} onChange={(e) => setTimeKnown(!e.target.checked)} style={{ width: 'auto' }} />{' '}
              Time unknown
            </label>
          </div>
          <div>
            <label htmlFor="place">Birthplace</label>
            <select id="place" value={place} onChange={(e) => setPlace(Number(e.target.value))}>
              {PLACES.map((p, i) => (
                <option key={p.label} value={i}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="domain">Reading for</label>
            <select id="domain" value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="actions">
          <button className="primary" disabled={busy !== null} onClick={() => run('chart')}>
            {busy === 'chart' ? 'Computing…' : 'Chart'} <span className="cost">· 1 credit</span>
          </button>
          <button disabled={busy !== null} onClick={() => run('guidance')}>
            {busy === 'guidance' ? 'Reading…' : 'Guidance now'} <span className="cost">· 3 credits</span>
          </button>
          <button disabled={busy !== null} onClick={() => run('interpret')}>
            {busy === 'interpret' ? 'Reading…' : `${domain} reading`} <span className="cost">· 5 credits</span>
          </button>
        </div>
        {remaining !== null ? <p className="muted" style={{ marginBottom: 0 }}>{remaining.toLocaleString()} credits left.</p> : null}
      </section>

      {error ? (
        <section className="card error" role="alert">
          <strong>{error.error}</strong>: {error.message}
          {error.requestId ? <div className="muted">requestId {error.requestId}</div> : null}
        </section>
      ) : null}

      {result?.kind === 'chart' ? <ChartView data={result.data} /> : null}
      {result?.kind === 'guidance' ? <GuidanceView data={result.data} /> : null}
      {result?.kind === 'interpret' ? <InterpretView data={result.data} /> : null}

      {result && llmEnabled ? (
        <section className="card">
          <button disabled={busy !== null} onClick={explain}>
            {busy === 'explain' ? 'Explaining…' : 'Explain in plain words'} <span className="cost">· your LLM, 0 credits</span>
          </button>
          {explanation ? <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{explanation}</p> : null}
        </section>
      ) : null}

      {result ? <p className="muted">{result.data.disclaimer}</p> : null}
    </>
  );
}

function ChartView({ data }: { data: ChartResponse }) {
  const cur = data.dasha?.current;
  return (
    <section className="card">
      <h2>
        Lagna {data.ascendant.sign} {data.ascendant.degree.toFixed(1)}°
        {data.ascendant.nakshatra ? ` · ${data.ascendant.nakshatra}` : ''}
      </h2>
      {cur ? (
        <p className="muted">
          Running daśā: {cur.mahadasha} (to {cur.mahadashaEnd.slice(0, 10)})
          {cur.antardasha ? ` / ${cur.antardasha} (to ${cur.antardashaEnd?.slice(0, 10)})` : ''}
        </p>
      ) : null}
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Graha</th><th>Sign</th><th>House</th><th>Degree</th><th>Nakṣatra</th><th>Dignity</th></tr>
          </thead>
          <tbody>
            {data.planets.map((p) => (
              <tr key={p.planet}>
                <td>{p.planet}{p.retrograde ? ' ℞' : ''}</td>
                <td>{p.sign}</td>
                <td>{p.house}</td>
                <td>{p.degree.toFixed(2)}°</td>
                <td>{p.nakshatra ?? '—'}{p.pada ? ` (${p.pada})` : ''}</td>
                <td>{p.dignity ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GuidanceView({ data }: { data: GuidanceResponse }) {
  return (
    <>
      {data.levels.map((l) => (
        <section className="card" key={`${l.level}-${l.planet}`}>
          <h2>{l.heading}</h2>
          <p className="muted">{l.planet} · {l.start.slice(0, 10)} to {l.end.slice(0, 10)}</p>
          {l.notes.map((n) => <p key={n} className="muted">{n}</p>)}
          {l.cards.filter((c) => !c.cancelled).map((c) => (
            <div key={c.key} style={{ marginTop: '0.75rem' }}>
              <strong>{c.headline}</strong>
              <div className="muted">{c.because}</div>
              {c.do.length ? <ul>{c.do.map((d) => <li key={d}>{d}</li>)}</ul> : null}
              {c.takeCare.length ? <ul className="warn">{c.takeCare.map((d) => <li key={d}>{d}</li>)}</ul> : null}
            </div>
          ))}
        </section>
      ))}
      {data.healthNote ? <p className="muted">{data.healthNote}</p> : null}
    </>
  );
}

function InterpretView({ data }: { data: InterpretResponse }) {
  return (
    <section className="card">
      <h2 style={{ textTransform: 'capitalize' }}>{data.domain}</h2>
      <p>
        <span className="tag">confidence: {data.confidenceTier}</span>
        <span className="tag">timing: {data.timingPattern}</span>
        {data.methodAgreement ? (
          <span className="tag">
            {data.methodAgreement.methodsAgreeing}/{data.methodAgreement.methodsThatSpoke} methods agree
            {data.methodAgreement.verdictContested ? ' · contested' : ''}
          </span>
        ) : null}
      </p>
      {data.keyInsights.length ? (<><strong className="good">Supporting</strong><ul>{data.keyInsights.map((s) => <li key={s}>{s}</li>)}</ul></>) : null}
      {data.cautionNotes.length ? (<><strong className="warn">Cautions</strong><ul>{data.cautionNotes.map((s) => <li key={s}>{s}</li>)}</ul></>) : null}
      {data.timingWindows?.length ? (
        <><strong>Windows</strong><ul>{data.timingWindows.map((w) => <li key={w.period}>{w.period}: {w.description} ({w.tone})</li>)}</ul></>
      ) : null}
      {data.practicalContext ? <p className="muted">{data.practicalContext}</p> : null}
      {data.classicalSources?.length ? <p className="muted">Grounded in: {data.classicalSources.join(', ')}</p> : null}
    </section>
  );
}
