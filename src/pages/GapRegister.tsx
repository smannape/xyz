import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { facilities, gaps, getPeriod, meta, periodLabel } from '../data';
import type { Gap } from '../data/types';
import { f1, streamVar, type Signal } from '../lib/format';
import { provDuration, provPar, provSeverity, provDerived } from '../lib/provenance';
import { DataTable, type Column } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { PageHeader } from '../components/Shell';
import { Provenance } from '../components/Provenance';
import { SeverityBar } from '../components/SeverityBar';
import { StatusChip } from '../components/StatusChip';

const SEV_SIGNAL: Record<string, Signal> = { Critical: 'critical', High: 'warning', Medium: 'warning', Low: 'planned' };
const FILTERS = [
  { key: 'facility', label: 'Facility', values: () => facilities.filter((f) => gaps.some((g) => g.facilityId === f.id)).map((f) => f.id), get: (g: Gap) => g.facilityId },
  { key: 'stream', label: 'Stream', values: () => ['Liquid', 'Gas', 'Water'], get: (g: Gap) => g.stream },
  { key: 'severity', label: 'Severity', values: () => ['Critical', 'High', 'Medium', 'Low'], get: (g: Gap) => g.severity.band },
  { key: 'period', label: 'First breach', values: () => [...new Set(gaps.map((g) => g.firstBreach.slice(0, 4)))], get: (g: Gap) => g.firstBreach.slice(0, 4) },
  { key: 'status', label: 'Status', values: () => ['Open', 'Mitigation proposed', 'Plan approved', 'Relieved by committed project'], get: (g: Gap) => g.status },
] as const;

export function GapRegister() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const active = FILTERS.filter((f) => params.get(f.key));
  const rows = useMemo(() => gaps.filter((g) => FILTERS.every((f) => !params.get(f.key) || f.get(g) === params.get(f.key))), [params]);
  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };

  const columns: Column<Gap>[] = [
    { key: 'id', header: 'Gap ID', sortValue: (g) => g.id, render: (g) => <span className="num text-ink">{g.id}</span> },
    { key: 'facility', header: 'Facility', sortValue: (g) => g.facilityId, render: (g) => <span className="num">{g.facilityId}</span> },
    { key: 'stream', header: 'Stream', sortValue: (g) => g.stream, render: (g) => <span className="inline-flex items-center gap-1.5 text-ink-2"><span className="w-1.5 h-1.5 rounded-[1px]" style={{ background: streamVar[g.service] }} />{g.stream}</span> },
    { key: 'binding', header: 'Binding component', sortValue: (g) => g.bindingComponentName, render: (g) => <span className="text-ink-2">{g.bindingComponentName}</span> },
    { key: 'first', header: 'First breach', sortValue: (g) => getPeriod(g.firstBreach)!.index, render: (g) => <span className="num">{periodLabel(g.firstBreach)}</span> },
    { key: 'peak', header: 'Peak gap', align: 'right', sortValue: (g) => g.peakGap / g.capacityAtPeak,
      render: (g) => <><Provenance p={provDerived(`${f1(g.peakGap)} ${g.unit} — peak gap, ${periodLabel(g.peakPeriod)}`, `${f1(g.peakForecast)} − ${f1(g.capacityAtPeak)} = ${f1(g.peakGap)}`, 'RULE-R02')} className="num text-ink">{f1(g.peakGap)}</Provenance><span className="unit ml-1.5 inline-block w-[52px] text-left">{g.unit}</span></> },
    { key: 'duration', header: 'Duration', align: 'right', sortValue: (g) => g.durationQuarters, render: (g) => <><Provenance p={provDuration(g)} className="num">{g.durationQuarters}</Provenance><span className="unit ml-1.5">{g.openEnded ? 'qtr +' : 'qtr'}</span>{!g.openEnded && <span className="inline-block w-[13px]" />}</> },
    { key: 'par', header: 'Production at risk', align: 'right', sortValue: (g) => g.parOil, render: (g) => <><Provenance p={provPar(g)} className="num text-ink">{f1(g.parOil)}</Provenance><span className="unit ml-1.5">MBOPD</span></> },
    { key: 'severity', header: 'Severity', sortValue: (g) => g.severity.score, render: (g) => <Provenance p={provSeverity(g)} className="!no-underline"><SeverityBar band={g.severity.band} score={g.severity.score} /></Provenance> },
    { key: 'status', header: 'Status', sortValue: (g) => g.status, render: (g) => <StatusChip status={g.status} /> },
  ];

  return (
    <div className="p-5 max-w-[1680px] mx-auto">
      <PageHeader eyebrow="Gap register" title="Capacity gaps"
        sub={<><span className="num text-ink">{meta.summary.openGaps}</span> gaps across <span className="num text-ink">{meta.summary.facilitiesWithGaps}</span> facilities · analysis <span className="num">{meta.analysis.id}</span> · horizon <span className="num">{meta.periods[0].label} – {meta.periods[15].label}</span></>} />
      <Panel flush>
        <div className="flex items-center gap-2 px-3 h-11 border-b border-line-subtle">
          <span className="eyebrow mr-1">Filter</span>
          {FILTERS.map((f) => (
            <select key={f.key} aria-label={f.label} value={params.get(f.key) ?? ''} onChange={(e) => setFilter(f.key, e.target.value)}
              className="h-7 pl-2 pr-6 rounded-sm border border-line bg-raised text-dense text-ink-2 hover:border-line-strong hover:text-ink"
              style={params.get(f.key) ? { borderColor: 'var(--accent)', color: 'var(--text-primary)' } : undefined}>
              <option value="">{f.label}: all</option>
              {f.values().map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}
          {active.length > 0 && <button className="btn !border-transparent" onClick={() => setParams({}, { replace: true })}><X size={12} />Clear</button>}
          <span className="ml-auto num text-dense text-ink-3">{rows.length} of {gaps.length}</span>
        </div>
        <DataTable rows={rows} columns={columns} rowKey={(g) => g.id} onRowClick={(g) => navigate(`/gaps/${g.id}`)} rowSignal={(g) => SEV_SIGNAL[g.severity.band]} initialSort={{ key: 'first', dir: 1 }} />
      </Panel>
      <p className="mt-3 text-dense text-ink-3">A gap is one unbroken run of quarters in which forecast load exceeds effective capacity at a facility and service. Severity combines magnitude, duration and proximity (RULE-R03); hover any figure for its source.</p>
    </div>
  );
}
