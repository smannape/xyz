import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { capacityPeriods, forecast, periods } from '../data';
import type { Service } from '../data/types';
import { f1, streamVar } from '../lib/format';

const axis = { fontSize: 10, fontFamily: 'Geist Mono, monospace', fill: 'var(--text-tertiary)' };
const yearTick = (label: string) => (label.startsWith('Q1') ? label.slice(3) : '');
const UNIT: Record<Service, string> = { liquid: 'MBFPD', gas: 'MMSCFD', water: 'MBWPD' };

function TipBox({ title, rows }: { title: string; rows: [string, string, string?][] }) {
  return (
    <div className="border border-line-strong bg-panel px-2.5 py-2 text-dense" style={{ boxShadow: '0 8px 24px -8px rgba(0,0,0,.6)' }}>
      <div className="num text-ink mb-1">{title}</div>
      {rows.map(([k, v, c]) => (
        <div key={k} className="flex items-center gap-2">
          {c && <span className="w-2 h-2 rounded-[1px]" style={{ background: c }} />}
          <span className="text-ink-2">{k}</span><span className="num text-ink ml-auto pl-4">{v}</span>
        </div>
      ))}
    </div>
  );
}

const Hatch = ({ id }: { id: string }) => (
  <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="5" height="5" fill="var(--signal-critical)" opacity="0.14" />
    <line x1="0" y1="0" x2="0" y2="5" stroke="var(--signal-critical)" strokeWidth="2" />
  </pattern>
);

/** Rows for one facility/service: forecast, stepped effective capacity, breach range. A trailing row closes the last step. */
function useSeries(facilityId: string, service: Service) {
  const rows = periods.map((p) => {
    const r = capacityPeriods.find((x) => x.facilityId === facilityId && x.service === service && x.period === p.id)!;
    return { id: p.id, label: p.label, forecast: r.forecast, capacity: r.ecMin, breach: r.gap > 0 ? [r.ecMin, r.forecast] : [r.ecMin, r.ecMin], gap: r.gap };
  });
  return [...rows, { ...rows[rows.length - 1], id: 'end', label: '' }];
}

/** Compact forecast-vs-effective-capacity chart for one service of one facility. */
export function ServiceSpark({ facilityId, service, period, onPick }: { facilityId: string; service: Service; period: string; onPick?: (period: string) => void }) {
  const data = useSeries(facilityId, service);
  const vals = data.flatMap((d) => [d.forecast, d.capacity]);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.18 || 1;
  const id = `h-${facilityId}-${service}`;
  return (
    <ResponsiveContainer width="100%" height={104}>
      <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} onClick={(e) => { const l = e?.activePayload?.[0]?.payload?.id; if (l && l !== 'end') onPick?.(l); }} style={{ cursor: onPick ? 'pointer' : undefined }}>
        <defs><Hatch id={id} /></defs>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="label" tick={axis} tickFormatter={yearTick} interval={0} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} height={18} />
        <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tick={axis} tickLine={false} axisLine={false} width={34} tickCount={3} />
        <Area type="stepAfter" dataKey="breach" fill={`url(#${id})`} stroke="none" isAnimationActive={false} activeDot={false} />
        <Line type="stepAfter" dataKey="capacity" stroke="var(--text-primary)" strokeWidth={1.25} strokeDasharray="4 3" dot={false} isAnimationActive={false} activeDot={false} />
        <Line type="stepAfter" dataKey="forecast" stroke={streamVar[service]} strokeWidth={1.75} dot={false} isAnimationActive={false} activeDot={false} />
        <ReferenceLine x={periods.find((p) => p.id === period)?.label} stroke="var(--accent)" strokeWidth={1} />
        <Tooltip cursor={{ stroke: 'var(--border-strong)' }} isAnimationActive={false}
          content={({ payload }) => { const d = payload?.[0]?.payload; return d && d.id !== 'end' ? <TipBox title={d.label} rows={[['Forecast', `${f1(d.forecast)} ${UNIT[service]}`, streamVar[service]], ['Effective capacity', f1(d.capacity), 'var(--text-secondary)'], ...(d.gap > 0 ? [['Gap', f1(d.gap), 'var(--signal-critical)'] as [string, string, string]] : [])]} /> : null; }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Gap profile: contributing sources stacked against the stepped capacity line, breach region hatched. */
export function GapProfileChart({ facilityId, service, first, last }: { facilityId: string; service: Service; first: string; last: string }) {
  const base = useSeries(facilityId, service);
  const keys = Object.keys(forecast.find((f) => f.facilityId === facilityId)!.contributors);
  const data = base.map((d) => {
    const f = forecast.find((x) => x.facilityId === facilityId && x.period === (d.id === 'end' ? periods[15].id : d.id))!;
    const total = Object.values(f.contributors).reduce((s, x) => s + x, 0);
    // contributors are held on the facility's contributor basis; scale to this service for the stack
    return { ...d, ...Object.fromEntries(keys.map((k) => [k, ((f.contributors[k] ?? 0) / total) * d.forecast])) };
  });
  const hi = Math.max(...data.flatMap((d) => [d.forecast, d.capacity]));
  const color = streamVar[service];
  const shade = (i: number) => `color-mix(in srgb, ${color} ${Math.round(58 - (i * 40) / Math.max(1, keys.length - 1))}%, var(--bg-raised))`;
  const lbl = (id: string) => periods.find((p) => p.id === id)!.label;
  return (
    <div>
      <ResponsiveContainer width="100%" height={248}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs><Hatch id="gap-hatch" /></defs>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
          <XAxis dataKey="label" tick={axis} tickFormatter={yearTick} interval={0} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} height={20} />
          <YAxis domain={[0, Math.ceil((hi * 1.08) / 10) * 10]} tick={axis} tickLine={false} axisLine={false} width={38} tickCount={6} />
          {keys.map((k, i) => <Area key={k} type="stepAfter" stackId="src" dataKey={k} fill={shade(i)} stroke="var(--bg-raised)" strokeWidth={1} fillOpacity={1} isAnimationActive={false} activeDot={false} />)}
          <Area type="stepAfter" dataKey="breach" fill="url(#gap-hatch)" stroke="none" isAnimationActive={false} activeDot={false} />
          <Line type="stepAfter" dataKey="capacity" stroke="var(--text-primary)" strokeWidth={1.75} dot={false} isAnimationActive={false} activeDot={false} />
          <ReferenceLine x={lbl(first)} stroke="var(--signal-critical)" strokeDasharray="2 3" strokeWidth={1} />
          <Tooltip cursor={{ stroke: 'var(--border-strong)' }} isAnimationActive={false}
            content={({ payload }) => {
              const d = payload?.[0]?.payload;
              if (!d || d.id === 'end') return null;
              return <TipBox title={d.label} rows={[['Forecast', `${f1(d.forecast)} ${UNIT[service]}`], ['Effective capacity', f1(d.capacity), 'var(--text-primary)'], ...(d.gap > 0 ? [['Gap', f1(d.gap), 'var(--signal-critical)'] as [string, string, string]] : []), ...[...keys].reverse().map((k) => [k, f1(d[k]), shade(keys.indexOf(k))] as [string, string, string])]} />;
            }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-ink-2">
        {keys.map((k, i) => <span key={k} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[1px]" style={{ background: shade(i) }} /><span className="num">{k}</span></span>)}
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2px] bg-ink" />Effective capacity</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 hatch-critical rounded-[1px]" />Breach {lbl(first)} – {lbl(last)}</span>
      </div>
    </div>
  );
}
