import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CornerDownRight } from 'lucide-react';
import { facilities, gapAt, gaps, getCapacity, getFacility, getForecast, periodLabel, periods, registers, SERVICE_LABEL } from '../data';
import type { Component, Service } from '../data/types';
import { cx, f1, signalVar, streamVar, utilSignal } from '../lib/format';
import { provComponent, provContributor, provEcMin, provEntry, provForecast, provGapValue, provLoadOverComponent, provPar, provUtilisation } from '../lib/provenance';
import { Panel } from '../components/Panel';
import { PageHeader } from '../components/Shell';
import { CapacityBar } from '../components/CapacityBar';
import { Provenance, RefChip } from '../components/Provenance';
import { SignalRow } from '../components/SignalRow';
import { StatusChip } from '../components/StatusChip';
import { ServiceSpark } from '../components/charts';
import { NotFound } from './NotFound';

const SHORT: Record<string, [string, boolean]> = { // [short name, plural]
  'Inlet Manifold': ['inlet manifold', false], 'HP Separator Train': ['separator', false], 'LP Separator Train': ['LP separator', false],
  Degasser: ['degasser', false], Desalter: ['desalter', false], 'Water KO Drum': ['water KO drum', false], 'Export Pumps': ['export pumps', true],
  'Effluent Export Pumps': ['effluent pumps', true], 'Booster Compressor': ['compressor', false], 'Flare KO': ['flare KO drum', false], 'Injection Pumps': ['injection pumps', true],
};
const STREAM_UNIT = { oil: 'MBOPD', gas: 'MMSCFD', water: 'MBWPD' } as const;

export function FacilityLadder() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const facility = getFacility(id);
  if (!facility) return <NotFound what={`Facility ${id}`} />;

  const service = (facility.services.includes(params.get('service') as Service) ? params.get('service') : facility.services[0]) as Service;
  const firstGap = gaps.find((g) => g.facilityId === facility.id && g.service === service);
  const period = periods.some((p) => p.id === params.get('period')) ? params.get('period')! : firstGap?.firstBreach ?? periods[0].id;
  const set = (next: { service?: Service; period?: string }) => {
    const s = next.service ?? service;
    const p = next.period ?? (next.service ? gaps.find((g) => g.facilityId === facility.id && g.service === s)?.firstBreach ?? period : period);
    setParams({ service: s, period: p }, { replace: true });
  };

  const row = getCapacity(facility.id, service, period)!;
  const chain = facility.components.filter((c) => c.service === service);
  const eff = (c: Component) => row.chain.find((x) => x.componentId === c.id)!;
  const binding = chain.find((c) => c.id === row.bindingComponentId)!;
  const next = chain.find((c) => c.id === row.nextBindingComponentId);
  const scaleMax = Math.max(row.forecast, ...row.chain.map((c) => c.effective)) * 1.04;
  const gap = gapAt(facility.id, service, period);
  const fc = getForecast(facility.id, period)!;
  const projects = registers.project.filter((p) => p.facilityId === facility.id);
  const allRoutes = registers.routing.filter((r) => r.normal === facility.id || r.alternate === facility.id || (r.from ?? '').startsWith(facility.id));
  const routes = allRoutes.filter((r) => (r.maxDivert ?? 0) > 0);
  const years = [...new Set(periods.map((p) => p.id.slice(0, 4)))];

  return (
    <div className="p-5 max-w-[1680px] mx-auto">
      <PageHeader
        eyebrow={<>Capacity ladder <span className="text-line-strong">/</span> {facility.type}</>}
        title={<><span className="num">{facility.id}</span> <span className="text-ink-2 font-normal">{facility.name}</span></>}
        actions={
          <div className="flex items-center gap-1" role="tablist" aria-label="Facility">
            {facilities.map((f) => {
              const worst = Math.max(...periods.map((p) => Math.max(...f.services.map((s) => getCapacity(f.id, s, p.id)!.utilisationPct))));
              return (
                <button key={f.id} role="tab" aria-selected={f.id === facility.id} onClick={() => navigate(`/facility/${f.id}`)}
                  className={cx('h-7 px-2 rounded-sm border num text-dense inline-flex items-center gap-1.5 transition-colors', f.id === facility.id ? 'border-line-strong bg-hover text-ink' : 'border-transparent text-ink-2 hover:bg-hover hover:text-ink')}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: signalVar[utilSignal(worst)] }} title={`Peak utilisation in horizon ${Math.round(worst)}%`} />{f.id}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.62fr)_minmax(340px,1fr)] items-start">
        <div className="space-y-3 min-w-0">
          <Panel flush eyebrow="Component chain" title={<>{SERVICE_LABEL[service]} service, process order</>}
            actions={facility.services.length > 1 && (
              <div className="flex border border-line rounded-sm overflow-hidden" role="tablist" aria-label="Service">
                {facility.services.map((s) => (
                  <button key={s} role="tab" aria-selected={s === service} onClick={() => set({ service: s })}
                    className={cx('h-6 px-2.5 text-dense inline-flex items-center gap-1.5 border-r border-line last:border-r-0', s === service ? 'bg-hover text-ink' : 'text-ink-2 hover:text-ink')}>
                    <span className="w-1.5 h-1.5 rounded-[1px]" style={{ background: streamVar[s] }} />{SERVICE_LABEL[s]}
                  </button>
                ))}
              </div>
            )}>
            {/* Period selector — doubles as a utilisation strip for this facility and service */}
            <div className="px-4 py-3 border-b border-line-subtle flex items-end gap-3">
              <div className="eyebrow pb-1.5 w-[52px] shrink-0">Period</div>
              <div className="flex gap-3 flex-1 min-w-0">
                {years.map((y) => (
                  <div key={y} className="flex-1 min-w-0">
                    <div className="num text-micro text-ink-3 mb-1">{y}</div>
                    <div className="flex gap-[2px]">
                      {periods.filter((p) => p.id.startsWith(y)).map((p) => {
                        const r = getCapacity(facility.id, service, p.id)!;
                        const sig = utilSignal(r.utilisationPct);
                        const on = p.id === period;
                        return (
                          <button key={p.id} onClick={() => set({ period: p.id })} aria-pressed={on} title={`${p.label} · ${Math.round(r.utilisationPct)}% of effective capacity`}
                            className={cx('flex-1 h-7 num text-micro rounded-[2px] transition-colors', on ? 'text-ink' : 'text-ink-2 hover:text-ink')}
                            style={{ background: `color-mix(in srgb, ${signalVar[sig]} ${on ? 34 : sig === 'ok' ? 9 : 20}%, var(--bg-panel))`, boxShadow: on ? 'inset 0 0 0 1px var(--accent)' : `inset 0 -2px 0 ${signalVar[sig]}` }}>
                            {p.label.slice(0, 2)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* The ladder */}
            <div className="px-4 pt-4 pb-3">
              <div className="grid grid-cols-[162px_minmax(0,1fr)_176px_44px_92px] gap-x-3 items-center eyebrow mb-2">
                <span>Component</span>
                <span className="truncate">Load against effective capacity</span>
                <span className="text-right">Load / capacity</span><span className="text-right">Util.</span><span />
              </div>
              <div className="space-y-px">
                {chain.map((c) => {
                  const e = eff(c);
                  const isBinding = c.id === binding.id, isNext = c.id === next?.id;
                  const util = (row.forecast / e.effective) * 100;
                  const sig = utilSignal(util);
                  return (
                    <SignalRow key={c.id} signal="neutral"
                      className={cx('pl-3 -ml-px py-2', isBinding && 'bg-panel')} style={{ borderLeftColor: isBinding ? signalVar[row.gap > 0 ? 'critical' : sig] : 'transparent', opacity: !isBinding && !isNext && row.gap > 0 ? 0.72 : 1 }}>
                      <div className="grid grid-cols-[150px_minmax(0,1fr)_176px_44px_92px] gap-x-3 items-center">
                        <div className={cx('uppercase tracking-wide text-dense truncate', isBinding ? 'text-ink font-medium' : 'text-ink-2')}>{c.name}</div>
                        <CapacityBar load={row.forecast} capacity={e.effective} scaleMax={scaleMax} signal={sig} />
                        <div className="text-right whitespace-nowrap">
                          <Provenance p={provForecast(facility.id, service, period)} className="num text-body">{f1(row.forecast)}</Provenance>
                          <span className="num text-ink-3"> / </span>
                          <Provenance p={provComponent(facility.id, c, period)} className={cx('num text-body', isBinding && 'font-medium')}>{f1(e.effective)}</Provenance>
                          <span className="unit ml-1.5">{c.unit}</span>
                        </div>
                        <div className="text-right"><Provenance p={provLoadOverComponent(row.forecast, e.effective, c.unit)} className="num text-body" ><span style={{ color: sig === 'ok' ? undefined : signalVar[sig] }}>{Math.round(util)}%</span></Provenance></div>
                        <div>
                          {isBinding && <span className="eyebrow !text-ink inline-flex items-center gap-1" style={{ color: row.gap > 0 ? 'var(--signal-critical)' : undefined }}><span aria-hidden>◀</span> Binding</span>}
                          {isNext && <span className="eyebrow inline-flex items-center gap-1 !text-ink-2"><span aria-hidden>◀</span> Binds next</span>}
                        </div>
                      </div>
                      {(c.config || c.deratingRef || e.projects.length > 0) && (isBinding || c.deratingRef || e.projects.length > 0) && (
                        <div className="mt-1.5 ml-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-dense text-ink-3">
                          {c.config && isBinding && <span className="inline-flex items-center gap-1.5"><CornerDownRight size={11} /><span className="num">{c.config.text}</span></span>}
                          {c.deratingRef && <span className="inline-flex items-center gap-1.5"><CornerDownRight size={11} />de-rated <span className="num text-ink-2">{c.derating}</span><RefChip id={c.deratingRef} /></span>}
                          {e.projects.map((p) => <span key={p} className="inline-flex items-center gap-1.5"><CornerDownRight size={11} />includes committed<RefChip id={p} /></span>)}
                        </div>
                      )}
                    </SignalRow>
                  );
                })}
              </div>
            </div>

            {/* The calculation, stated */}
            <div className="mx-4 mb-3 border border-line-subtle bg-base px-3 py-2.5 num text-dense text-ink-2">
              Effective capacity = min(chain) = <Provenance p={provEcMin(row)} className="text-ink font-medium">{f1(row.ecMin)} {row.unit}</Provenance>, governed by <span className="text-ink">{binding.name}</span>
              <span className="text-ink-3"> · {periodLabel(period)} · utilisation </span>
              <Provenance p={provUtilisation(row)}><span style={{ color: signalVar[utilSignal(row.utilisationPct)] }}>{Math.round(row.utilisationPct)}%</span></Provenance>
            </div>
            {next && row.nextBindingCapacity != null && (
              <p className="mx-4 mb-4 text-body text-ink-2 leading-relaxed">
                <span className="eyebrow mr-2">Next binding</span>
                Relieve the {SHORT[binding.name][0]} and the {SHORT[next.name][0]} {SHORT[next.name][1] ? 'bind' : 'binds'} at{' '}
                <Provenance p={provComponent(facility.id, next, period)} className="num text-ink">{f1(row.nextBindingCapacity)} {row.unit}</Provenance> — a ceiling of{' '}
                <Provenance p={provEntry('RULE-R09', `${f1(row.mitigationCeiling!)} ${row.unit} — mitigation ceiling: ${f1(row.nextBindingCapacity)} − ${f1(row.ecMin)}`)} className="num text-ink font-medium">{f1(row.mitigationCeiling!)} {row.unit}</Provenance> on any mitigation here.
              </p>
            )}

            <SignalRow signal={row.gap > 0 ? 'critical' : utilSignal(row.utilisationPct)} className="mx-4 mb-4 bg-panel px-3 py-2.5 flex items-center gap-4">
              {gap ? (
                <>
                  <div className="min-w-0">
                    <div className="eyebrow mb-0.5">Capacity gap · {periodLabel(period)}</div>
                    <div className="text-body">
                      <Provenance p={provGapValue(row)} className="num text-ink font-medium">{f1(row.gap)} {row.unit}</Provenance> <span className="text-ink-2">over effective capacity ·</span>{' '}
                      <Provenance p={provPar(gap)} className="num text-ink">{f1(row.parOil)} MBOPD</Provenance> <span className="text-ink-2">at risk · first breach {periodLabel(gap.firstBreach)}, {gap.durationQuarters} quarters</span>
                    </div>
                  </div>
                  <Link to={`/gaps/${gap.id}`} className="btn btn-primary ml-auto shrink-0">Open gap <span className="num">{gap.id}</span><ArrowRight size={13} /></Link>
                </>
              ) : (
                <div>
                  <div className="eyebrow mb-0.5">Within effective capacity · {periodLabel(period)}</div>
                  <div className="text-body text-ink-2">Headroom <span className="num text-ink">{f1(row.ecMin - row.forecast)} {row.unit}</span> at {binding.name}.{firstGap && <> First breach on this service is <button className="text-accent hover:underline num" onClick={() => set({ period: firstGap.firstBreach })}>{periodLabel(firstGap.firstBreach)}</button>.</>}</div>
                </div>
              )}
            </SignalRow>
          </Panel>
        </div>

        <div className="space-y-3 min-w-0">
          <Panel eyebrow="Forecast vs effective capacity" title={<span className="num">{periods[0].label} – {periods[15].label}</span>}>
            <div className="space-y-3">
              {facility.services.map((s) => {
                const r = getCapacity(facility.id, s, period)!;
                return (
                  <div key={s}>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <button className={cx('text-dense inline-flex items-center gap-1.5 hover:text-ink', s === service ? 'text-ink' : 'text-ink-2')} onClick={() => set({ service: s })}>
                        <span className="w-2 h-[2px]" style={{ background: streamVar[s] }} />{SERVICE_LABEL[s]}
                      </button>
                      <span className="ml-auto num text-dense">
                        <Provenance p={provForecast(facility.id, s, period)}>{f1(r.forecast)}</Provenance><span className="text-ink-3"> / </span><Provenance p={provEcMin(r)}>{f1(r.ecMin)}</Provenance>
                      </span>
                      <span className="unit">{r.unit}</span>
                      <span className="num text-dense w-10 text-right" style={{ color: signalVar[utilSignal(r.utilisationPct)] }}>{Math.round(r.utilisationPct)}%</span>
                    </div>
                    <ServiceSpark facilityId={facility.id} service={s} period={period} onPick={(p) => set({ period: p })} />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-4 text-micro text-ink-3">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-ink" />Effective capacity</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 hatch-critical rounded-[1px]" />Breach</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-px h-3 bg-accent" />{periodLabel(period)}</span>
            </div>
          </Panel>

          <Panel eyebrow="Routing" title={<>Inbound and outbound, <span className="num">{periodLabel(period)}</span></>} flush>
            <div className="grid grid-cols-2 divide-x divide-line-subtle">
              <div className="p-4">
                <div className="eyebrow mb-2">Inbound · {fc.contributorBasis === 'liquid' ? 'MBFPD' : STREAM_UNIT[fc.contributorBasis as 'gas' | 'water']}</div>
                <ul className="space-y-1.5">
                  {Object.entries(fc.contributors).map(([name, v]) => (
                    <li key={name} className="flex items-baseline text-dense">
                      <span className="num text-ink-2">{name}</span>
                      <Provenance p={provContributor(facility.id, name, v, fc.contributorBasis === 'liquid' ? 'MBFPD' : STREAM_UNIT[fc.contributorBasis as 'gas' | 'water'], period)} className="num ml-auto">{f1(v)}</Provenance>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4">
                <div className="eyebrow mb-2">Outbound</div>
                <ul className="space-y-1.5">
                  {facility.outbound.map((o) => (
                    <li key={o.stream} className="flex items-baseline gap-2 text-dense">
                      <span className="w-1.5 h-1.5 rounded-[1px] shrink-0 self-center" style={{ background: streamVar[o.stream] }} />
                      <span className="text-ink-2 truncate">{getFacility(o.to) ? <Link className="num hover:text-accent" to={`/facility/${o.to}?period=${period}`}>{o.to}</Link> : o.to}</span>
                      <span className="ml-auto whitespace-nowrap"><Provenance p={provForecast(facility.id, o.stream, period)} className="num">{f1(fc[o.stream]!)}</Provenance> <span className="unit">{STREAM_UNIT[o.stream]}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {routes.length > 0 && (
              <div className="border-t border-line-subtle px-4 py-3">
                <div className="eyebrow mb-2">Alternate routes in routing register</div>
                <ul className="space-y-1.5">
                  {routes.map((r) => (
                    <li key={r.id} className={cx('flex items-center gap-2 text-dense', (r.maxDivert ?? 0) === 0 && 'opacity-50')}>
                      <RefChip id={r.id} /><span className="text-ink-2 truncate">{r.title}</span>
                      <span className="ml-auto whitespace-nowrap"><Provenance p={provEntry(r.id)} className="num">{f1(r.maxDivert ?? 0)}</Provenance> <span className="unit">{r.unit}</span></span>
                      {r.status !== 'Approved' && <StatusChip status={r.status} />}
                    </li>
                  ))}
                </ul>
                {allRoutes.length > routes.length && <p className="mt-2 text-dense text-ink-3"><span className="num">{allRoutes.length - routes.length}</span> further register rows touch this facility with no transferable capacity.</p>}
              </div>
            )}
          </Panel>

          <Panel eyebrow="Committed projects" title={<>affecting <span className="num">{facility.id}</span></>} flush>
            {projects.length === 0 ? <p className="p-4 text-dense text-ink-3">No project in the project register touches this facility within the horizon.</p> : (
              <ul>
                {projects.map((p) => (
                  <SignalRow key={p.id} signal={p.status === 'Proposed' ? 'warning' : p.affectsCapacity ? 'planned' : 'neutral'} className="px-4 py-2.5 border-b border-line-subtle last:border-b-0 flex items-center gap-3 text-dense">
                    <RefChip id={p.id} />
                    <span className="text-ink-2 truncate">{p.title}</span>
                    <span className="ml-auto whitespace-nowrap num">{p.delta ? <Provenance p={provEntry(p.id)}>+{f1(p.delta)}</Provenance> : <span className="text-ink-3">no capacity change</span>}{p.delta ? <span className="unit ml-1">{p.unit}</span> : null}</span>
                    <span className="num text-ink-2 w-[58px] text-right whitespace-nowrap">{periodLabel(p.onStream!)}</span>
                    {p.status === 'Proposed' && <StatusChip status="Proposed" />}
                  </SignalRow>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
