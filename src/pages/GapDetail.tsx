import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { animate, AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, Diamond, Minus, Play, Plus, Trash2 } from 'lucide-react';
import { getCapacity, getEntry, getForecast, getGap, getOption, meta, periodLabel, REGISTER_NAME } from '../data';
import type { CascadeTier, Check as CheckT, Gap, Option } from '../data/types';
import { cx, f1, f2, kd, signalVar, streamVar, type Signal } from '../lib/format';
import { provDerived, provDuration, provEcMin, provEntry, provForecast, provPar, provSeverity, type ProvRecord } from '../lib/provenance';
import { Panel } from '../components/Panel';
import { PageHeader } from '../components/Shell';
import { Metric } from '../components/Metric';
import { Provenance, RefChip, RefText } from '../components/Provenance';
import { RuleBlock } from '../components/Drawer';
import { SeverityBar } from '../components/SeverityBar';
import { SignalRow } from '../components/SignalRow';
import { StatusChip } from '../components/StatusChip';
import { GapProfileChart } from '../components/charts';
import { NotFound } from './NotFound';

const r1 = (x: number) => Math.round(x * 10) / 10;
interface CustomOption { id: string; title: string; gain: number; cost: number | null; months: number | null }

const TIER_STATUS: Record<CascadeTier['status'], { label: string; signal: Signal; icon: typeof Check }> = {
  applied: { label: 'Applied', signal: 'ok', icon: Check },
  partial: { label: 'Partial', signal: 'warning', icon: AlertTriangle },
  sized: { label: 'Sized', signal: 'ok', icon: Check },
  exhausted: { label: 'None available', signal: 'neutral', icon: Minus },
  not_available: { label: 'None committed', signal: 'neutral', icon: Minus },
  not_required: { label: 'Not required', signal: 'neutral', icon: Minus },
};
const CHECK: Record<CheckT['result'], { label: string; signal: Signal; icon: typeof Check }> = {
  pass: { label: 'Pass', signal: 'ok', icon: Check }, governs: { label: 'Governs', signal: 'info', icon: Diamond },
  flag: { label: 'Flag', signal: 'warning', icon: AlertTriangle }, info: { label: 'Note', signal: 'neutral', icon: Minus },
};

function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const c = animate(shown, value, { duration: 0.45, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setShown(v) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{f1(shown)}</>;
}

export function GapDetail() {
  const { id } = useParams();
  const gap = getGap(id);
  if (!gap) return <NotFound what={`Gap ${id}`} />;
  return <GapView key={gap.id} gap={gap} />;
}

function GapView({ gap }: { gap: Gap }) {
  const [discarded, setDiscarded] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<CustomOption[]>([]);
  const [step, setStep] = useState<number | null>(null); // null = all tiers shown; 0–5 = walking
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [adding, setAdding] = useState(false);

  // Live residual chain: R(i) = max(0, R(i−1) − ΔC(i)) over retained options only.
  const live = useMemo(() => {
    let r = gap.peakGap;
    const tiers = gap.cascade.map((t) => {
      const on = !t.optionId || !discarded[t.optionId];
      const before = r;
      r = r1(Math.max(0, r - (on ? t.delta : 0)));
      return { ...t, on, before, after: r, relief: r1(before - r) };
    });
    const customs = custom.map((c) => { const before = r; r = r1(Math.max(0, r - c.gain)); return { ...c, before, after: r, relief: r1(before - r) }; });
    return { tiers, customs, final: r };
  }, [gap, discarded, custom]);

  const walking = step !== null;
  const shown = walking ? step : 5;
  const residual = shown === 0 ? gap.peakGap : shown < 5 ? live.tiers[shown - 1].after : live.final;
  const changed = Object.values(discarded).some(Boolean) || custom.length > 0;

  useEffect(() => {
    if (!walking) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') setStep((s) => Math.min(5, (s ?? 0) + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, (s ?? 0) - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [walking]);

  const peakRow = getCapacity(gap.facilityId, gap.service, gap.peakPeriod)!;
  const firstRow = getCapacity(gap.facilityId, gap.service, gap.firstBreach)!;
  const provPeak = provDerived(`${f1(gap.peakGap)} ${gap.unit} — peak gap, ${periodLabel(gap.peakPeriod)}`, `${f1(gap.peakForecast)} − ${f1(gap.capacityAtPeak)} = ${f1(gap.peakGap)}`, 'RULE-R02');
  const sevSignal: Signal = gap.severity.band === 'Critical' ? 'critical' : gap.severity.band === 'Low' ? 'planned' : 'warning';

  const opts = gap.optionIds.map((o) => getOption(o)!).filter((o) => !discarded[o.id]);
  const basisOption = [...gap.optionIds].reverse().map((o) => getOption(o)!).find((o) => o.economics);

  return (
    <div className="p-5 max-w-[1680px] mx-auto">
      <PageHeader
        eyebrow={<><Link to="/gaps" className="hover:text-ink-2">Gap register</Link> <span className="text-line-strong">/</span> {gap.facilityId} <span className="text-line-strong">/</span> {gap.stream}</>}
        title={<span className="flex items-center gap-3"><span className="num">{gap.id}</span><span className="text-ink-2 font-normal">{gap.facilityId} · {gap.bindingComponentName}</span><StatusChip status={gap.status} /></span>}
        actions={<Link className="btn" to={`/facility/${gap.facilityId}?service=${gap.service}&period=${gap.firstBreach}`}><ArrowLeft size={13} />Capacity ladder at <span className="num">{periodLabel(gap.firstBreach)}</span></Link>}
      />

      {/* Plain-language statement of the gap */}
      <SignalRow signal={sevSignal} className="ticks border border-l-2 border-line-subtle bg-raised px-5 py-4 mb-3">
        <p className="text-section leading-relaxed text-ink-2 max-w-[1100px]">
          <span className="text-ink">{gap.bindingComponentName} at {gap.facilityId}</span> is forecast to exceed effective capacity of{' '}
          <Provenance p={provEcMin(firstRow)} className="num text-ink">{f1(gap.capacityAtFirstBreach)} {gap.unit}</Provenance> from <span className="num text-ink">{periodLabel(gap.firstBreach)}</span>, peaking at{' '}
          <Provenance p={provPeak} className="num text-ink">{f1(gap.peakGap)} {gap.unit}</Provenance> over, for{' '}
          <Provenance p={provDuration(gap)} className="num text-ink">{gap.durationQuarters} consecutive quarter{gap.durationQuarters > 1 ? 's' : ''}</Provenance>{gap.openEnded ? ' to the end of the horizon' : ''}, placing{' '}
          <Provenance p={provPar(gap)} className="num text-ink">{f1(gap.parOil)} MBOPD</Provenance> at risk.
        </p>
        <div className="mt-4 pt-4 border-t border-line-subtle grid grid-cols-6 gap-4">
          <Metric label="Peak gap" value={<Provenance p={provPeak}>{f1(gap.peakGap)}</Provenance>} unit={gap.unit} signal="critical" sub={<span className="num">{periodLabel(gap.peakPeriod)}</span>} />
          <Metric label="Forecast at peak" value={<Provenance p={provForecast(gap.facilityId, gap.service, gap.peakPeriod)}>{f1(gap.peakForecast)}</Provenance>} unit={gap.unit} sub={<><span className="num">{Math.round(gap.utilisationPct)}%</span> of effective capacity</>} />
          <Metric label="Effective capacity" value={<Provenance p={provEcMin(peakRow)}>{f1(gap.capacityAtPeak)}</Provenance>} unit={gap.unit} sub={<>governed by {gap.bindingComponentName}</>} />
          <Metric label="Production at risk" value={<Provenance p={provPar(gap)}>{f1(gap.parOil)}</Provenance>} unit="MBOPD" sub="at peak" />
          <Metric label="Duration" value={<Provenance p={provDuration(gap)}>{gap.durationQuarters}</Provenance>} unit="quarters" sub={<span className="num">{periodLabel(gap.firstBreach)} – {periodLabel(gap.lastBreach)}</span>} />
          <div>
            <div className="eyebrow mb-1.5">Severity</div>
            <Provenance p={provSeverity(gap)} className="!no-underline"><span className="flex items-center gap-2.5 h-[26px]"><SeverityBar band={gap.severity.band} /><span className="num text-title font-medium leading-none">{gap.severity.score}</span></span></Provenance>
            <div className="mt-1.5 text-dense text-ink-3">{gap.severity.band}</div>
          </div>
        </div>
      </SignalRow>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)] items-start">
        {/* ───────────── Recommendation cascade ───────────── */}
        <Panel flush eyebrow="Recommendation cascade" title="cheapest feasible relief first, capital sized to what is left"
          actions={walking ? (
            <>
              <button className="btn" onClick={() => setStep((s) => Math.max(0, (s ?? 0) - 1))} disabled={step === 0} aria-label="Previous tier"><ArrowLeft size={13} /></button>
              <button className="btn btn-primary" onClick={() => setStep((s) => Math.min(5, (s ?? 0) + 1))} disabled={step === 5}>{step === 0 ? 'Tier 1' : step! < 5 ? `Tier ${step! + 1}` : 'Done'}<ArrowRight size={13} /></button>
              <button className="btn" onClick={() => setStep(null)}>Show all</button>
            </>
          ) : <button className="btn" onClick={() => { setStep(0); setExpanded({}); }}><Play size={12} />Walk the cascade</button>}>

          {/* Residual bar: shrinks as each tier is applied */}
          <div className="px-4 pt-4 pb-3.5 border-b border-line-subtle">
            <div className="flex items-end gap-6 mb-2.5">
              <div>
                <div className="eyebrow mb-1">Residual gap</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="num text-hero font-medium leading-none" style={{ color: residual > 0 ? 'var(--signal-critical)' : 'var(--signal-ok)' }}><AnimatedNumber value={residual} /></span>
                  <span className="unit">{gap.unit}</span>
                </div>
              </div>
              <div className="num text-dense text-ink-3 pb-1 flex items-center flex-wrap gap-x-1.5">
                <span className={shown === 0 ? 'text-ink' : ''}>{f1(gap.peakGap)}</span>
                {live.tiers.slice(0, 4).map((t, i) => (
                  <span key={t.tier} className={cx('inline-flex items-center gap-1.5 transition-opacity', i >= shown && 'opacity-30')}>
                    <ArrowRight size={11} /><span className={i === shown - 1 || (shown === 5 && i === 3) ? 'text-ink' : ''}>{f1(t.after)}</span>
                  </span>
                ))}
              </div>
              <div className="ml-auto text-right text-dense text-ink-3 pb-1">of <span className="num text-ink-2">{f1(gap.peakGap)} {gap.unit}</span> peak gap, <span className="num">{periodLabel(gap.peakPeriod)}</span></div>
            </div>
            <div className="flex h-6 gap-[2px]" role="img" aria-label={`Residual ${f1(residual)} of ${f1(gap.peakGap)} ${gap.unit}`}>
              {live.tiers.map((t, i) => (i < shown && t.relief > 0) && (
                <motion.div key={t.tier} layout initial={{ flexGrow: 0, opacity: 0 }} animate={{ flexGrow: t.relief, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                  className="basis-0 min-w-0 overflow-hidden rounded-[2px] flex items-center px-1.5 num text-micro whitespace-nowrap" style={{ background: `color-mix(in srgb, var(--signal-ok) ${t.tier >= 4 ? 30 : 46}%, var(--bg-panel))`, color: 'var(--text-primary)' }}>
                  T{t.tier} −{f1(t.relief)}
                </motion.div>
              ))}
              {shown === 5 && live.customs.map((c) => c.relief > 0 && (
                <motion.div key={c.id} layout initial={{ flexGrow: 0 }} animate={{ flexGrow: c.relief }} className="basis-0 min-w-0 overflow-hidden rounded-[2px] flex items-center px-1.5 num text-micro whitespace-nowrap" style={{ background: 'color-mix(in srgb, var(--signal-info) 42%, var(--bg-panel))' }}>ENG −{f1(c.relief)}</motion.div>
              ))}
              <motion.div layout animate={{ flexGrow: Math.max(residual, 0.0001), opacity: residual > 0 ? 1 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 30 }} className="basis-0 min-w-0 hatch-critical rounded-[2px]" />
            </div>
          </div>

          <div>
            {live.tiers.map((t, i) => (
              <TierRow key={t.tier} gap={gap} t={t} pending={i >= shown} current={walking && i === shown - 1} open={Boolean(expanded[t.tier]) && i < shown}
                onToggle={() => setExpanded((e) => ({ ...e, [t.tier]: !e[t.tier] }))}
                onRetain={(keep) => t.optionId && setDiscarded((d) => ({ ...d, [t.optionId!]: !keep }))} />
            ))}
            {live.customs.map((c) => (
              <SignalRow key={c.id} signal="info" className="px-4 py-3 border-t border-line-subtle flex items-center gap-3">
                <span className="eyebrow w-[52px] shrink-0 !text-info">Eng.</span>
                <div className="min-w-0">
                  <div className="text-body text-ink truncate">{c.title}</div>
                  <div className="text-dense text-ink-3">Engineer-entered · not derived from a rule or register{c.cost != null && <> · <span className="num">{kd(c.cost)}</span> entered</>}{c.months != null && <> · <span className="num">{c.months}</span> months</>}</div>
                </div>
                <span className="ml-auto num text-body whitespace-nowrap">−{f1(c.gain)} <span className="unit">{gap.unit}</span></span>
                <span className="num text-dense text-ink-2 w-[104px] text-right whitespace-nowrap">residual <span className="text-ink">{f1(c.after)}</span></span>
                <button className="btn !px-1.5" aria-label={`Remove ${c.title}`} onClick={() => setCustom((x) => x.filter((y) => y.id !== c.id))}><Trash2 size={13} /></button>
              </SignalRow>
            ))}
          </div>

          <AnimatePresence>
            {shown === 5 && live.final > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <SignalRow signal="critical" className="mx-4 mt-3 bg-panel px-3 py-2.5 text-body text-ink-2 flex items-start gap-2.5">
                  <AlertTriangle size={14} className="text-critical shrink-0 mt-[2px]" />
                  <span>Uncovered residual of <span className="num text-ink">{f1(live.final)} {gap.unit}</span>. The retained options no longer close the gap{gap.cascade[3].status === 'sized' && !discarded[gap.cascade[3].optionId!] ? <>; Tier 4 was sized to a residual of <span className="num text-ink">{f1(gap.cascade[3].residualBefore)}</span> and needs re-running against the new basis</> : ''}.</span>
                </SignalRow>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 py-3 flex items-center gap-3">
            {adding ? <AddOption unit={gap.unit} onCancel={() => setAdding(false)} onAdd={(c) => { setCustom((x) => [...x, c]); setAdding(false); setStep(null); }} /> : (
              <>
                <button className="btn" onClick={() => setAdding(true)}><Plus size={13} />Add your own option</button>
                {changed && <button className="btn !border-transparent" onClick={() => { setDiscarded({}); setCustom([]); }}>Reset to analysis recommendation</button>}
                <span className="ml-auto text-dense text-ink-3">The engineer decides: retain, discard or add options; residuals recompute live.</span>
              </>
            )}
          </div>
        </Panel>

        {/* ───────────── Gap profile ───────────── */}
        <div className="space-y-3 min-w-0">
          <Panel eyebrow="Gap profile" title={<>{gap.stream} forecast against effective capacity, <span className="num">{gap.unit}</span></>}>
            <GapProfileChart facilityId={gap.facilityId} service={gap.service} first={gap.firstBreach} last={gap.lastBreach} />
          </Panel>
          <Panel eyebrow="Breach quarters" flush>
            <table className="w-full text-dense">
              <thead><tr className="border-b border-line-subtle">{['Quarter', 'Forecast', 'Capacity', 'Gap', 'At risk'].map((h, i) => <th key={h} className={cx('eyebrow font-normal h-8 px-4', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
              <tbody>
                {gap.profile.map((p) => {
                  const r = getCapacity(gap.facilityId, gap.service, p.period)!;
                  return (
                    <tr key={p.period} className="border-b border-line-subtle last:border-b-0 h-8">
                      <td className="px-4 num">{periodLabel(p.period)}</td>
                      <td className="px-4 text-right"><Provenance p={provForecast(gap.facilityId, gap.service, p.period)} className="num">{f1(r.forecast)}</Provenance></td>
                      <td className="px-4 text-right"><Provenance p={provEcMin(r)} className="num">{f1(r.ecMin)}</Provenance></td>
                      <td className="px-4 text-right num text-critical">{f1(p.gap)}</td>
                      <td className="px-4 text-right num">{f1(p.parOil)} <span className="unit">MBOPD</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>

      {/* ───────────── Option comparison ───────────── */}
      <Panel className="mt-3" flush eyebrow="Option comparison" title="retained options side by side"
        actions={<span className="inline-flex items-center h-5 px-2 font-mono uppercase text-warning border" style={{ fontSize: 10.5, letterSpacing: '0.08em', borderColor: 'color-mix(in srgb, var(--signal-warning) 45%, transparent)' }}>Class 5 · indicative</span>}>
        <Comparison gap={gap} options={opts} custom={custom} basis={basisOption} />
      </Panel>
    </div>
  );
}

function TierRow({ gap, t, pending, current, open, onToggle, onRetain }: {
  gap: Gap; t: CascadeTier & { on: boolean; before: number; after: number; relief: number }; pending: boolean; current: boolean; open: boolean;
  onToggle: () => void; onRetain: (keep: boolean) => void;
}) {
  const st = TIER_STATUS[t.status];
  const option = getOption(t.optionId);
  const signal: Signal = !t.on ? 'neutral' : st.signal;
  const primaryRef = t.registerRefs[0];
  const deltaProv: ProvRecord | null = primaryRef ? provEntry(primaryRef, `−${f1(t.delta)} ${gap.unit} — ${t.name.toLowerCase()}`) : null;
  return (
    <SignalRow signal={pending ? 'neutral' : signal} dim={pending} className={cx('border-t border-line-subtle first:border-t-0 transition-colors', current && 'bg-panel')}>
      <div className="grid grid-cols-[52px_minmax(0,1fr)_132px_128px_112px_28px] items-center gap-x-3 px-4 pt-3">
        <span className="eyebrow">Tier {t.tier}</span>
        <span className="uppercase tracking-wide text-dense text-ink font-medium truncate">{t.name}</span>
        <span className="inline-flex items-center gap-1.5 eyebrow" style={{ color: pending ? undefined : signal === 'neutral' ? undefined : signalVar[signal] }}>
          <st.icon size={12} />{!t.on ? 'Discarded' : st.label}
        </span>
        <span className={cx('num text-body text-right whitespace-nowrap', !t.on && 'line-through text-ink-3')}>
          {t.delta > 0 ? <>{deltaProv ? <Provenance p={deltaProv}>−{f1(t.delta)}</Provenance> : <>−{f1(t.delta)}</>} <span className="unit">{gap.unit}</span></> : <span className="text-ink-3">—</span>}
        </span>
        <span className="num text-dense text-ink-2 text-right whitespace-nowrap">
          {!pending && (t.status !== 'not_required' || t.after > 0) && <>residual <Provenance p={provDerived(`${f1(t.after)} ${gap.unit} — residual after Tier ${t.tier}`, `max(0, ${f1(t.before)} − ${f1(t.on ? t.delta : 0)}) = ${f1(t.after)}`, t.ruleId, 'R(i) = max(0, R(i−1) − ΔC(i)); recomputed live from retained options')} className={cx('text-body', t.after > 0 ? 'text-ink' : 'text-ok')}>{f1(t.after)}</Provenance></>}
        </span>
        <button className="btn !px-1 !h-6 justify-center" onClick={onToggle} disabled={pending} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} tier ${t.tier}: rule, register rows and checks`}>
          <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      <div className="pl-[80px] pr-4 pb-3 pt-1 flex items-start gap-4">
        <div className="min-w-0 flex-1 text-body leading-relaxed">
          <div className={cx(t.status === 'not_required' || t.status === 'exhausted' || t.status === 'not_available' ? 'text-ink-3' : 'text-ink')}><RefText text={t.headline} /></div>
          {t.lines.map((l) => <div key={l} className="text-ink-2 flex gap-2"><ArrowRight size={12} className="shrink-0 mt-[5px] text-ink-3" /><span><RefText text={l} /></span></div>)}
        </div>
        {option && !pending && (
          <div className="flex border border-line rounded-sm overflow-hidden shrink-0 mt-0.5" role="group" aria-label={`Engineer decision for ${option.title}`}>
            <button aria-pressed={t.on} onClick={() => onRetain(true)} className={cx('h-6 px-2.5 text-dense border-r border-line', t.on ? 'bg-hover text-ink' : 'text-ink-3 hover:text-ink')}>Retain</button>
            <button aria-pressed={!t.on} onClick={() => onRetain(false)} className={cx('h-6 px-2.5 text-dense', !t.on ? 'bg-hover text-ink' : 'text-ink-3 hover:text-ink')}>Discard</button>
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            <div className="ml-[80px] mr-4 mb-4 grid gap-4 2xl:grid-cols-2">
              <div className="space-y-4 min-w-0">
                <div><div className="eyebrow mb-1.5">Rule that fired</div><RuleBlock id={t.ruleId} /></div>
                <div>
                  <div className="eyebrow mb-1.5">Register rows read</div>
                  {t.registerRefs.length === 0 ? <p className="text-dense text-ink-3">The register was searched and returned no matching approved row.</p> : (
                    <div className="border border-line-subtle bg-base divide-y divide-line-subtle">
                      {t.registerRefs.map((id) => {
                        const e = getEntry(id)!;
                        return (
                          <div key={id} className="px-3 py-2 text-dense">
                            <div className="flex items-center gap-2"><RefChip id={id} /><span className="eyebrow truncate">{REGISTER_NAME[e.register]}</span><span className="ml-auto"><StatusChip status={e.status} /></span></div>
                            <div className="mt-1 num text-ink">{e.valueText}</div>
                            <div className="mt-0.5 text-ink-3">{e.status === 'Proposed' ? `Proposed ${e.proposedBy}` : `Approved ${e.approvedBy} · ${e.dept} · ${e.approvedDate}`} · <span className="num">{e.vintage}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div className="eyebrow mb-1.5">Feasibility checks run</div>
                <ul className="border border-line-subtle bg-base divide-y divide-line-subtle">
                  {t.checks.map((c) => {
                    const k = CHECK[c.result];
                    return (
                      <li key={c.label} className="px-3 py-2 grid grid-cols-[76px_1fr] gap-x-3 text-dense">
                        <span className="eyebrow inline-flex items-center gap-1.5 self-start pt-[2px]" style={{ color: k.signal === 'neutral' ? undefined : signalVar[k.signal] }}><k.icon size={11} />{k.label}</span>
                        <span><span className="text-ink">{c.label}</span><span className="block text-ink-2 leading-snug mt-0.5"><RefText text={c.detail} /></span></span>
                      </li>
                    );
                  })}
                </ul>
                {t.tier === 2 && gap.id === meta.summary.earliestBreach.gapId && <ReceivingCheck />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SignalRow>
  );
}

/** GC-21 re-evaluation for the ROUTE-0031 transfer: which stream governs, and utilisation after transfer. */
function ReceivingCheck() {
  const rc = meta.receivingCheck;
  const src = getForecast(rc.from, rc.period)!;
  return (
    <div className="mt-4">
      <div className="eyebrow mb-1.5">{rc.to} receiving check · {periodLabel(rc.period)} · source GOR {src.gor} scf/bbl, WOR {src.wor?.toFixed(2)}</div>
      <table className="w-full text-dense border border-line-subtle bg-base">
        <thead><tr className="border-b border-line-subtle">{['Stream', 'Headroom', 'Ratio', 'Oil equiv.', 'After'].map((h, i) => <th key={h} className={cx('eyebrow font-normal h-7 px-3 whitespace-nowrap', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
        <tbody>
          {rc.streams.map((s) => {
            const row = getCapacity(rc.to, s.service, rc.period)!;
            return (
              <tr key={s.service} className="border-b border-line-subtle last:border-b-0 h-8" style={s.governs ? { boxShadow: 'inset 2px 0 0 var(--signal-info)' } : undefined}>
                <td className="px-3"><span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-[1px]" style={{ background: streamVar[s.service] }} />{s.service[0].toUpperCase() + s.service.slice(1)}{s.governs && <span className="eyebrow !text-info ml-1">governs</span>}</span></td>
                <td className="px-3 text-right whitespace-nowrap"><Provenance p={provDerived(`${f1(s.headroom)} ${s.unit} — ${rc.to} headroom`, `${f1(row.ecMin)} − ${f1(row.forecast)} = ${f1(s.headroom)}`, 'RULE-R05')} className="num">{f1(s.headroom)}</Provenance> <span className="unit">{s.unit}</span></td>
                <td className="px-3 text-right num text-ink-2 whitespace-nowrap">÷ {s.divisor.toFixed(2)}</td>
                <td className="px-3 text-right num whitespace-nowrap">{f1(s.oilEquivalent)} <span className="unit">MBOPD</span></td>
                <td className="px-3 text-right"><Provenance p={provDerived(`${s.afterPct}% — ${rc.to} ${s.service} after transfer`, `(${f1(row.forecast)} + ${f1(s.added)}) ÷ ${f1(row.ecMin)} = ${s.afterPct}%`, 'RULE-R12')} className="num" ><span style={{ color: s.afterPct >= 90 ? 'var(--signal-warning)' : undefined }}>{s.afterPct}%</span></Provenance></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1.5 text-dense text-ink-3 leading-snug">Stream check allows <span className="num text-ink-2">8.3 MBOPD</span> (<span className="num">11.8 MBFPD</span>); the route limit of <Provenance p={provEntry(rc.routeId)} className="num text-ink-2">{f1(rc.transfer)} {rc.unit}</Provenance> is lower and governs the final transfer.</p>
    </div>
  );
}

function AddOption({ unit, onAdd, onCancel }: { unit: string; onAdd: (c: CustomOption) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(''); const [gain, setGain] = useState(''); const [cost, setCost] = useState(''); const [months, setMonths] = useState('');
  const g = parseFloat(gain);
  const valid = title.trim().length > 2 && g > 0;
  const input = 'h-7 px-2 rounded-sm border border-line bg-base text-dense text-ink placeholder:text-ink-3 focus:border-line-strong';
  return (
    <form className="flex items-end gap-2 w-full" onSubmit={(e) => { e.preventDefault(); if (valid) onAdd({ id: `ENG-${Date.now()}`, title: title.trim(), gain: r1(g), cost: cost ? parseFloat(cost) : null, months: months ? parseInt(months, 10) : null }); }}>
      <label className="flex-1 min-w-0"><span className="eyebrow block mb-1">Your option</span><input autoFocus className={cx(input, 'w-full')} placeholder="e.g. Temporary rental separator package" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label><span className="eyebrow block mb-1">Capacity gain · {unit}</span><input className={cx(input, 'w-[132px] num')} inputMode="decimal" placeholder="0.0" value={gain} onChange={(e) => setGain(e.target.value)} /></label>
      <label><span className="eyebrow block mb-1">Cost · KD M</span><input className={cx(input, 'w-[96px] num')} inputMode="decimal" placeholder="optional" value={cost} onChange={(e) => setCost(e.target.value)} /></label>
      <label><span className="eyebrow block mb-1">Months</span><input className={cx(input, 'w-[80px] num')} inputMode="numeric" placeholder="optional" value={months} onChange={(e) => setMonths(e.target.value)} /></label>
      <button type="submit" className="btn btn-primary" disabled={!valid}>Add</button>
      <button type="button" className="btn" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function Comparison({ gap, options, custom, basis }: { gap: Gap; options: Option[]; custom: CustomOption[]; basis?: Option }) {
  const B = meta.economicBasis;
  const dash = <span className="text-ink-3">—</span>;
  const be = basis?.economics;
  const cols: { key: string; head: ReactNode; sub: ReactNode; cells: ReactNode[]; signal: Signal }[] = [
    {
      key: 'nothing', signal: 'critical', head: 'Do nothing', sub: be ? <>residual left unprotected</> : <>no screening basis</>,
      cells: [<><span className="num">0.0</span> <span className="unit">{gap.unit}</span></>, <span className="num">KD 0.00M</span>, dash,
        be ? <Provenance p={provDerived(`${kd(be.doNothingKDm)} — do nothing`, `${f2(be.protectedOil)} MBOPD deferred × ${be.protectedQuarters} quarters × ${B.daysPerQuarter} d × KD ${f2(B.netbackKDperBbl)}/bbl, discounted at ${B.discountRatePct}%/yr`, 'RULE-R08', `Present value of production left unprotected if ${basis!.id} is not built; netback and discount rate KOC-supplied (economics v1.3)`)} className="num font-medium text-critical">{kd(be.doNothingKDm)}</Provenance> : dash,
        dash, dash],
    },
    ...options.map((o) => {
      const e = o.economics;
      const costEntry = o.costRef ? provEntry(o.costRef, `${e ? kd(e.capexKDm) : ''} — Class 5 cost, ${o.title}`) : null;
      return {
        key: o.id, signal: (o.kind === 'capital' ? 'info' : 'ok') as Signal,
        head: <span className="flex items-baseline gap-2"><span className="eyebrow shrink-0">Tier {o.tier}</span><span className="truncate" title={o.title}>{o.title}</span></span>,
        sub: <span className="num">{o.id}</span>,
        cells: [
          <><Provenance p={provEntry(o.registerRefs[0])} className="num text-ink">{f1(o.capacityGain)}</Provenance> <span className="unit">{o.unit}</span></>,
          e && costEntry ? <Provenance p={costEntry} className="num text-ink">{kd(e.capexKDm)}</Provenance> : <span className="text-ink-3 text-dense">committed</span>,
          o.scheduleMonths ? <><span className="num text-ink">{o.scheduleMonths}</span> <span className="unit">months</span></> : <span className="num text-ink-2">{periodLabel(o.onStream)}</span>,
          e ? <Provenance p={provDerived(`${kd(e.npvKDm)} — NPV, ${o.title}`, `PV protected ${f2(e.pvProtectedKDm)} − PV capex ${f2(e.pvCapexKDm)} = ${f2(e.npvKDm)} (${f2(e.protectedOil)} MBOPD × ${e.protectedQuarters} qtr)`, 'RULE-R10', `${o.economicsNote}. Netback KD ${f2(B.netbackKDperBbl)}/bbl and ${B.discountRatePct}%/yr are KOC-supplied (economics v1.3)`)} className="num font-medium text-ink">{kd(e.npvKDm)}</Provenance> : dash,
          e?.paybackQuarters != null && e.protectedQuarters > 0 ? <><span className="num text-ink">{f1(e.paybackQuarters)}</span> <span className="unit">quarters</span></> : dash,
          e?.costPerBblKD != null ? <><span className="num text-ink">KD {f2(e.costPerBblKD)}</span><span className="unit">/bbl</span></> : dash,
        ],
      };
    }),
    ...custom.map((c) => ({
      key: c.id, signal: 'info' as Signal, head: <span className="flex items-baseline gap-2"><span className="eyebrow shrink-0 !text-info">Eng.</span><span className="truncate">{c.title}</span></span>, sub: <>engineer-entered · not screened</>,
      cells: [<><span className="num text-ink">{f1(c.gain)}</span> <span className="unit">{gap.unit}</span></>, c.cost != null ? <span className="num text-ink">{kd(c.cost)}</span> : dash, c.months != null ? <><span className="num text-ink">{c.months}</span> <span className="unit">months</span></> : dash, dash, dash, dash],
    })),
  ];
  const labels = ['Capacity gained', 'Class 5 cost', 'Schedule', 'NPV', 'Payback', 'Cost per barrel protected'];
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-max" style={{ gridTemplateColumns: `168px repeat(${cols.length}, minmax(176px, 1fr))` }}>
        <div className="border-b border-line-subtle" />
        {cols.map((c) => (
          <div key={c.key} className="px-4 py-3 border-b border-l border-line-subtle min-w-0" style={{ boxShadow: `inset 0 2px 0 ${signalVar[c.signal]}` }}>
            <div className="text-body text-ink font-medium truncate">{c.head}</div>
            <div className="text-micro text-ink-3 mt-0.5 truncate">{c.sub}</div>
          </div>
        ))}
        {labels.map((l, i) => (
          <div key={l} className="contents">
            <div className={cx('px-4 h-10 flex items-center eyebrow', i < labels.length - 1 && 'border-b border-line-subtle')}>{l}</div>
            {cols.map((c) => <div key={c.key} className={cx('px-4 h-10 flex items-center gap-1 border-l border-line-subtle text-body whitespace-nowrap', i < labels.length - 1 && 'border-b', c.key === 'nothing' && 'bg-panel')}>{c.cells[i]}</div>)}
          </div>
        ))}
      </div>
      <p className="px-4 py-2.5 border-t border-line-subtle text-dense text-ink-3">
        {be ? <>Do nothing is the present value of the production left unprotected if <span className="num">{basis!.id}</span> is not taken up. </> : <>This gap is closed by a committed project; no screening economics apply. </>}
        Netback <span className="num text-ink-2">KD {f2(B.netbackKDperBbl)}/bbl</span> and discount rate <span className="num text-ink-2">{B.discountRatePct}%/yr</span> are {B.source} (economics v1.3). Costs are Class 5 screening norms, −30% / +50%.
      </p>
    </div>
  );
}
