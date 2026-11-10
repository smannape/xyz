import { getCapacity, getEntry, getFacility, getForecast, getRule, meta, periodLabel, REGISTER_NAME, vintage, vintageTag } from '../data';
import type { CapacityPeriod, Component, Gap, RegisterEntry, Service } from '../data/types';
import { f1 } from './format';

/** What a provenance popover shows for one figure. */
export interface ProvRecord { title: string; rows: [string, string][]; entryId?: string; ruleId?: string }

const approval = (e: RegisterEntry): [string, string] =>
  e.status === 'Proposed'
    ? ['Proposed', `${e.proposedBy} · ${e.dept} · ${e.submittedDate} — not yet approved`]
    : [e.status === 'Superseded' ? 'Was approved' : 'Approved', `${e.approvedBy} · ${e.dept} · ${e.approvedDate}`];

const analysisRows = (): [string, string][] => [
  ['Run', `${meta.analysis.runBy} · ${meta.analysis.runAt} · ${meta.analysis.status}`],
  ['Vintage', `${vintageTag('forecast')} · ${vintageTag('capacity')} · ${vintageTag('rules')}`],
];

export function provEntry(id: string, title?: string): ProvRecord {
  const e = getEntry(id);
  if (!e) {
    const r = getRule(id);
    if (r) return { title: title ?? `${r.id} — ${r.name}`, rows: [['Source', `RULE LIBRARY · ${r.id}`], ['Then', r.then], ['Status', `${r.status} · ${vintage('rules').approvedBy} · ${vintage('rules').approvedDate}`], ['Vintage', `rules ${r.version}`]], ruleId: r.id };
    return { title: title ?? id, rows: [['Source', 'Unresolved reference']] };
  }
  return {
    title: title ?? `${e.id} — ${e.title}`,
    rows: [['Source', `${REGISTER_NAME[e.register]} · ${e.id}`], ['Value', e.valueText], ['Basis', e.basis], approval(e), ['Vintage', e.vintage]],
    entryId: e.id,
  };
}

/** Effective capacity of one component in one period. */
export function provComponent(facilityId: string, c: Component, period: string): ProvRecord {
  const row = getCapacity(facilityId, c.service, period)!;
  const inPeriod = row.chain.find((x) => x.componentId === c.id)!;
  const title = `${f1(inPeriod.effective)} ${c.unit} — effective capacity`;
  const projects = inPeriod.projects.map((id) => { const p = getEntry(id)!; return `+${f1(p.delta!)} ${id} from ${periodLabel(p.onStream!)}`; });
  const projectRow: [string, string][] = projects.length ? [['Projects', `${f1(c.effective)} ${projects.join(' ')} → ${f1(inPeriod.effective)}`]] : [];
  if (c.deratingRef) {
    const e = getEntry(c.deratingRef)!;
    return { title, rows: [['Source', `${REGISTER_NAME.derating} · ${e.id}`], ['Value', e.valueText + (c.effective !== c.derated ? ` · carried as ${f1(c.effective)}` : '')], ...projectRow, ['Basis', e.basis], approval(e), ['Vintage', e.vintage]], entryId: e.id };
  }
  const v = vintage('capacity');
  return { title, rows: [['Source', `CAPACITY BASELINE · ${c.id}`], ['Value', `nameplate ${f1(c.nameplate)} · no de-rating (δ 1.000)`], ...projectRow, ['Basis', 'Design nameplate carried in the capacity baseline'], ['Approved', `${v.approvedBy} · ${v.dept} · ${v.approvedDate}`], ['Vintage', vintageTag('capacity')]], entryId: inPeriod.projects[0] };
}

export function provNameplate(c: Component): ProvRecord {
  const v = vintage('capacity');
  return { title: `${f1(c.nameplate)} ${c.unit} — nameplate capacity`, rows: [['Source', `CAPACITY BASELINE · ${c.id}`], ['Value', c.config ? c.config.text : `${f1(c.nameplate)} ${c.unit} design`], ['Basis', 'Design nameplate carried in the capacity baseline'], ['Approved', `${v.approvedBy} · ${v.dept} · ${v.approvedDate}`], ['Vintage', vintageTag('capacity')]] };
}

const STREAM_UNIT = { oil: 'MBOPD', gas: 'MMSCFD', water: 'MBWPD', liquid: 'MBFPD' } as const;
export function provForecast(facilityId: string, stream: Service | 'oil', period: string): ProvRecord {
  const r = getForecast(facilityId, period)!;
  const v = vintage('forecast');
  const value = r[stream]!;
  const n = Object.keys(r.contributors).length;
  const gc = r.oil != null;
  const how =
    stream === 'liquid' ? `oil ${f1(r.oil!)} + water ${f1(r.water!)} = ${f1(value)} MBFPD`
    : stream === 'gas' && gc ? `oil ${f1(r.oil!)} MBOPD × GOR ${r.gor} scf/bbl = ${f1(value)} MMSCFD`
    : stream === 'water' && gc ? `oil ${f1(r.oil!)} MBOPD × WOR ${r.wor!.toFixed(2)} = ${f1(value)} MBWPD`
    : stream === 'oil' ? `${f1(value)} MBOPD, roll-up of ${n} manifolds`
    : `${Object.entries(r.contributors).map(([k, x]) => `${k} ${f1(x)}`).join(' + ')} = ${f1(value)}`;
  return {
    title: `${f1(value)} ${STREAM_UNIT[stream]} — forecast ${stream}, ${periodLabel(period)}`,
    rows: [['Source', `FORECAST · ${facilityId} · ${periodLabel(period)}`], ['Value', how], ['Basis', `${meta.cycle.name}, ${gc ? `roll-up of ${n} manifolds` : `roll-up of ${n} upstream facilities`}`], ['Approved', `${v.approvedBy} · ${v.dept} · ${v.approvedDate}`], ['Vintage', vintageTag('forecast')]],
  };
}

export function provContributor(facilityId: string, name: string, value: number, unit: string, period: string): ProvRecord {
  const v = vintage('forecast');
  return { title: `${f1(value)} ${unit} — ${name}, ${periodLabel(period)}`, rows: [['Source', `FORECAST · ${name} → ${facilityId}`], ['Value', `${f1(value)} ${unit}`], ['Basis', `${meta.cycle.name}`], ['Approved', `${v.approvedBy} · ${v.dept} · ${v.approvedDate}`], ['Vintage', vintageTag('forecast')]] };
}

/** A figure the analysis derived by applying a rule to locked inputs. */
export function provDerived(title: string, value: string, ruleId: string, basis?: string): ProvRecord {
  const r = getRule(ruleId);
  return { title, rows: [['Source', `ANALYSIS ${meta.analysis.id} · ${ruleId}`], ['Value', value], ['Basis', basis ?? (r ? r.then : '')], ...analysisRows()], ruleId };
}

export function provEcMin(row: CapacityPeriod): ProvRecord {
  const f = getFacility(row.facilityId)!;
  const b = f.components.find((c) => c.id === row.bindingComponentId)!;
  return provDerived(`${f1(row.ecMin)} ${row.unit} — effective capacity, ${periodLabel(row.period)}`, `min(chain) = ${f1(row.ecMin)}, governed by ${b.name}`, 'RULE-R01');
}
export function provUtilisation(row: CapacityPeriod): ProvRecord {
  return provDerived(`${Math.round(row.utilisationPct)}% — utilisation, ${periodLabel(row.period)}`, `${f1(row.forecast)} ÷ ${f1(row.ecMin)} = ${row.utilisationPct.toFixed(1)}%`, 'RULE-R02', 'Forecast load over effective capacity');
}
export function provLoadOverComponent(load: number, cap: number, unit: string): ProvRecord {
  return provDerived(`${Math.round((load / cap) * 100)}% — component utilisation`, `${f1(load)} ÷ ${f1(cap)} ${unit} = ${((load / cap) * 100).toFixed(1)}%`, 'RULE-R01', 'Forecast load over the component effective capacity');
}
export function provGapValue(row: CapacityPeriod): ProvRecord {
  return provDerived(`${f1(row.gap)} ${row.unit} — capacity gap, ${periodLabel(row.period)}`, `${f1(row.forecast)} − ${f1(row.ecMin)} = ${f1(row.gap)}`, 'RULE-R02');
}
export function provPar(g: Gap): ProvRecord {
  const peak = g.profile.reduce((a, b) => (b.parOil > a.parOil ? b : a));
  const f = getForecast(g.facilityId, peak.period)!;
  const ratio = g.service === 'liquid' ? `(1 + WOR ${f.wor?.toFixed(2)})` : g.service === 'gas' ? `GOR ${f.gor} scf/bbl` : `WOR ${(f.wor ?? 0).toFixed(2)}`;
  return provDerived(`${f1(g.parOil)} MBOPD — production at risk`, `${f1(peak.gap)} ${g.unit} ÷ ${ratio} = ${f1(peak.parOil)} MBOPD (${periodLabel(peak.period)})`, 'RULE-R02', 'Gap converted to oil using the forecast fluid ratios of the same period');
}
export function provSeverity(g: Gap): ProvRecord {
  const s = g.severity;
  return provDerived(`${s.score} — severity, ${s.band}`, `35% × ${s.magnitude.toFixed(2)} magnitude + 30% × ${s.duration.toFixed(2)} duration + 35% × ${s.proximity.toFixed(2)} proximity`, 'RULE-R03');
}
export function provDuration(g: Gap): ProvRecord {
  return provDerived(`${g.durationQuarters} quarters — breach duration`, `${periodLabel(g.firstBreach)} to ${periodLabel(g.lastBreach)}, consecutive${g.openEnded ? ' (runs to the end of the horizon)' : ''}`, 'RULE-R02');
}
