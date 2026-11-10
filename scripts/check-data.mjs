// Independent consistency check of src/data. Reads only the JSON the app ships.
// Run: npm run check-data
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const load = (n) => JSON.parse(readFileSync(join(DIR, n), 'utf8'));
const meta = load('meta.json'), facilities = load('facilities.json'), forecast = load('forecast.json'), cps = load('capacity-periods.json');
const gaps = load('gaps.json'), options = load('options.json'), registers = load('registers.json'), rules = load('rules.json');
const plans = load('plans.json'), activity = load('activity.json');

let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('  ✗ ' + msg); } };
const near = (a, b, tol = 0.051) => Math.abs(a - b) <= tol;
const section = (name, fn) => { const before = failures; fn(); console.log(`${failures === before ? '✓' : '✗'} ${name}`); };

const UNIT = { liquid: 'MBFPD', gas: 'MMSCFD', water: 'MBWPD' };
const entries = Object.values(registers).flat();
const entryIds = new Set(entries.map((e) => e.id));
const ruleIds = new Set(rules.map((r) => r.id));
const periodIds = meta.periods.map((p) => p.id);
const fac = (id) => facilities.find((f) => f.id === id);
const cp = (f, s, p) => cps.find((r) => r.facilityId === f && r.service === s && r.period === p);
const fcRow = (f, p) => forecast.find((r) => r.facilityId === f && r.period === p);

section('dataset shape matches the specification', () => {
  ok(facilities.length === 8, `expected 8 facilities, found ${facilities.length}`);
  ok(periodIds.length === 16, `expected 16 periods, found ${periodIds.length}`);
  ok(forecast.length === 8 * 16, `forecast rows ${forecast.length} ≠ 128`);
  ok(gaps.length === 14, `expected 14 gaps, found ${gaps.length}`);
  ok(options.length === 31, `expected 31 options, found ${options.length}`);
  ok(options.filter((o) => o.kind === 'non-capital').length === 22, 'expected 22 non-capital options');
  ok(rules.length === 12, `expected 12 rules, found ${rules.length}`);
  ok(plans.length === 6, `expected 6 plans, found ${plans.length}`);
  ok(activity.length === 30, `expected 30 activity events, found ${activity.length}`);
  ok(Object.keys(registers).length === 5, 'expected five registers');
  for (const [name, rows] of Object.entries(registers)) ok(rows.length >= 15 && rows.length <= 40, `register ${name} has ${rows.length} rows (15–40 required)`);
  ok(entries.some((e) => e.status === 'Proposed'), 'no Proposed register entry');
  ok(entries.filter((e) => e.status === 'Superseded').length === 1, 'exactly one Superseded register entry required');
  ok(new Set(entries.map((e) => e.id)).size === entries.length, 'duplicate register ids');
});

section('units are consistent on every quantity', () => {
  for (const f of facilities) for (const c of f.components) ok(c.unit === UNIT[c.service], `${c.id} unit ${c.unit} ≠ ${UNIT[c.service]}`);
  for (const r of cps) ok(r.unit === UNIT[r.service], `capacity row ${r.facilityId}/${r.service} unit`);
  for (const g of gaps) ok(g.unit === UNIT[g.service], `${g.id} unit`);
  for (const o of options) ok(o.unit === gaps.find((g) => g.id === o.gapId)?.unit, `${o.id} unit differs from its gap`);
  for (const e of [...registers.envelope, ...registers.routing]) ok(Object.values(UNIT).includes(e.unit), `${e.id} unit ${e.unit}`);
});

section('component capacities follow nameplate × δ at 0.5 resolution', () => {
  for (const f of facilities) for (const c of f.components) {
    ok(near(c.derated, c.nameplate * c.derating), `${c.id} de-rated ${c.derated} ≠ ${c.nameplate} × ${c.derating}`);
    ok(near(c.effective, Math.round(c.nameplate * c.derating * 2) / 2, 0.001), `${c.id} effective ${c.effective}`);
    ok((c.derating < 1) === Boolean(c.deratingRef), `${c.id} de-rating reference presence`);
    if (c.deratingRef) ok(entryIds.has(c.deratingRef), `${c.id} references missing ${c.deratingRef}`);
    if (c.config) ok(near((c.config.installed - c.config.spare) * c.config.unitCapacity, c.nameplate, 0.6), `${c.id} redundancy config does not give nameplate`);
  }
});

section('forecast rows add up (liquid = oil + water, contributors sum)', () => {
  for (const r of forecast) {
    if (r.liquid != null) ok(near(r.liquid, r.oil + r.water), `${r.facilityId} ${r.period} liquid ${r.liquid} ≠ oil + water`);
    const basis = r[r.contributorBasis];
    const sum = Object.values(r.contributors).reduce((s, x) => s + x, 0);
    ok(near(sum, basis), `${r.facilityId} ${r.period} contributors ${sum.toFixed(1)} ≠ ${basis}`);
  }
});

section('EC_min equals the minimum of the chain in every capacity-period row', () => {
  for (const r of cps) {
    const f = fac(r.facilityId);
    ok(Boolean(f), `capacity row references unknown facility ${r.facilityId}`);
    const min = Math.min(...r.chain.map((c) => c.effective));
    ok(near(r.ecMin, min, 0.001), `${r.facilityId} ${r.service} ${r.period}: ecMin ${r.ecMin} ≠ min(chain) ${min}`);
    ok(r.chain.find((c) => c.componentId === r.bindingComponentId)?.effective === min, `${r.facilityId} ${r.period}: binding component is not the minimum`);
    ok(r.chain.length === f.components.filter((c) => c.service === r.service).length, `${r.facilityId} ${r.service} chain length`);
    for (const c of r.chain) {
      const base = f.components.find((x) => x.id === c.componentId);
      const add = c.projects.reduce((s, id) => s + entries.find((e) => e.id === id).delta, 0);
      ok(near(c.effective, base.effective + add, 0.001), `${c.componentId} ${r.period}: ${c.effective} ≠ base ${base.effective} + projects ${add}`);
      for (const id of c.projects) ok(periodIds.indexOf(entries.find((e) => e.id === id).onStream) <= periodIds.indexOf(r.period), `${id} credited before on-stream date`);
    }
    const fr = fcRow(r.facilityId, r.period);
    ok(fr[r.service] === r.forecast, `${r.facilityId} ${r.service} ${r.period}: forecast differs from forecast.json`);
    ok(near(r.gap, Math.max(0, r.forecast - r.ecMin), 0.001), `${r.facilityId} ${r.period}: gap arithmetic`);
    ok(near(r.utilisationPct, (r.forecast / r.ecMin) * 100), `${r.facilityId} ${r.period}: utilisation`);
    if (r.nextBindingCapacity != null) ok(near(r.mitigationCeiling, r.nextBindingCapacity - r.ecMin, 0.001), `${r.facilityId} ${r.period}: mitigation ceiling`);
  }
});

section('every gap references a real facility and a component in its chain, and agrees with capacity rows', () => {
  for (const g of gaps) {
    const f = fac(g.facilityId);
    ok(Boolean(f), `${g.id} unknown facility ${g.facilityId}`);
    const c = f?.components.find((x) => x.id === g.bindingComponentId);
    ok(Boolean(c) && c.service === g.service, `${g.id} binding component ${g.bindingComponentId} not in ${g.facilityId} ${g.service} chain`);
    const a = periodIds.indexOf(g.firstBreach), b = periodIds.indexOf(g.lastBreach);
    ok(b - a + 1 === g.durationQuarters && g.profile.length === g.durationQuarters, `${g.id} duration`);
    let peak = 0;
    for (let i = a; i <= b; i++) { const r = cp(g.facilityId, g.service, periodIds[i]); ok(r.gap > 0, `${g.id} ${periodIds[i]} is not a breach`); ok(r.bindingComponentId === g.bindingComponentId, `${g.id} binding component changes in ${periodIds[i]}`); peak = Math.max(peak, r.gap); }
    if (a > 0) ok(cp(g.facilityId, g.service, periodIds[a - 1]).gap === 0, `${g.id} breach starts earlier than recorded`);
    if (b < 15) ok(cp(g.facilityId, g.service, periodIds[b + 1]).gap === 0, `${g.id} breach ends later than recorded`);
    ok(near(peak, g.peakGap, 0.001), `${g.id} peak gap ${g.peakGap} ≠ ${peak}`);
    const pr = cp(g.facilityId, g.service, g.peakPeriod);
    ok(near(g.peakForecast - g.capacityAtPeak, g.peakGap) && pr.forecast === g.peakForecast, `${g.id} peak forecast − capacity`);
    const s = Math.round(100 * (0.35 * Math.min(1, g.peakGap / g.capacityAtPeak / 0.2) + 0.3 * Math.min(1, g.durationQuarters / 8) + 0.35 * (1 - a / 16)));
    ok(s === g.severity.score, `${g.id} severity ${g.severity.score} ≠ ${s}`);
  }
  const breachRuns = new Set();
  for (const r of cps) if (r.gap > 0) breachRuns.add(gaps.find((g) => g.facilityId === r.facilityId && g.service === r.service && periodIds.indexOf(g.firstBreach) <= periodIds.indexOf(r.period) && periodIds.indexOf(r.period) <= periodIds.indexOf(g.lastBreach))?.id ?? `UNREGISTERED ${r.facilityId} ${r.period}`);
  ok(breachRuns.size === gaps.length && ![...breachRuns].some((x) => x.startsWith('UNREG')), 'a breach period exists with no gap in the register');
});

section('cascade residuals chain arithmetically: R(i) = max(0, R(i−1) − ΔC(i))', () => {
  for (const g of gaps) {
    ok(g.cascade.length === 5 && g.cascade.every((t, i) => t.tier === i + 1), `${g.id} must have tiers 1–5 in order`);
    let r = g.peakGap;
    for (const t of g.cascade) {
      ok(near(t.residualBefore, r, 0.001), `${g.id} tier ${t.tier} residualBefore ${t.residualBefore} ≠ ${r}`);
      r = Math.round(Math.max(0, r - t.delta) * 10) / 10;
      ok(near(t.residualAfter, r, 0.001), `${g.id} tier ${t.tier} residualAfter ${t.residualAfter} ≠ ${r}`);
      ok(ruleIds.has(t.ruleId), `${g.id} tier ${t.tier} rule ${t.ruleId} missing`);
      for (const ref of t.registerRefs) ok(entryIds.has(ref), `${g.id} tier ${t.tier} references missing ${ref}`);
      if (t.optionId) { const o = options.find((x) => x.id === t.optionId); ok(o && o.gapId === g.id && o.tier === t.tier && o.capacityGain === t.delta, `${g.id} tier ${t.tier} option ${t.optionId} mismatch`); }
      // any register ID quoted in the visible text must exist
      for (const m of [t.headline, ...t.lines, ...t.checks.map((c) => c.detail)].join(' ').matchAll(/\b(?:DR|ROUTE|ENV|COST|PRJ)-\d+\b/g)) ok(entryIds.has(m[0]), `${g.id} tier ${t.tier} text cites missing ${m[0]}`);
    }
    ok(g.residualAfterCascade === 0, `${g.id} cascade leaves residual ${g.residualAfterCascade}`);
  }
});

section("every option's rule and register references resolve; economics reproduce", () => {
  const B = meta.economicBasis;
  for (const o of options) {
    ok(gaps.some((g) => g.id === o.gapId), `${o.id} unknown gap`);
    ok(ruleIds.has(o.ruleId), `${o.id} rule ${o.ruleId} missing`);
    for (const ref of o.registerRefs) ok(entryIds.has(ref), `${o.id} references missing ${ref}`);
    if (o.costRef) ok(entryIds.has(o.costRef), `${o.id} cost ref ${o.costRef} missing`);
    ok((o.kind === 'capital') === (o.tier >= 4), `${o.id} kind/tier`);
    const e = o.economics;
    if (!e) continue;
    const df = (t) => Math.pow(1 + B.discountRatePct / 100, -t / 4);
    ok(near(e.capexKDm, e.capexPhases.reduce((s, x) => s + x, 0), 0.006), `${o.id} capex phases`);
    ok(near(e.revenuePerQuarterKDm, (e.protectedOil * B.daysPerQuarter * B.netbackKDperBbl) / 1000, 0.006), `${o.id} revenue per quarter`);
    const pvP = e.cashflow.filter((c) => c.kind !== 'capex').reduce((s, c) => s + c.pv, 0);
    const pvC = -e.cashflow.filter((c) => c.kind === 'capex').reduce((s, c) => s + c.pv, 0);
    for (const c of e.cashflow) ok(near(c.pv, c.amount * df(c.t), 0.006), `${o.id} t${c.t} present value`);
    ok(near(e.pvProtectedKDm, pvP, 0.006) && near(e.pvCapexKDm, pvC, 0.006), `${o.id} PV totals`);
    ok(near(e.npvKDm, e.pvProtectedKDm - e.pvCapexKDm, 0.006), `${o.id} NPV`);
    ok(near(e.doNothingKDm, -e.pvProtectedKDm, 0.001), `${o.id} do-nothing`);
  }
});

section("every plan's frozen decision basis exists", () => {
  const vint = Object.fromEntries(meta.vintages.map((v) => [v.key, v.version]));
  for (const p of plans) {
    const b = p.decisionBasis;
    ok(b.analysisId === meta.analysis.id, `${p.id} analysis ${b.analysisId} unknown`);
    ok(Object.keys(vint).length === 4 && Object.entries(b.vintages).every(([k, v]) => vint[k] === v) && Object.keys(b.vintages).length === 4, `${p.id} frozen vintages do not exist`);
    ok(b.scenario === meta.cycle.name, `${p.id} scenario`);
    ok(gaps.some((g) => g.id === b.gapId) && b.gapId === p.gapId, `${p.id} gap ${b.gapId}`);
    const o = options.find((x) => x.id === b.optionId);
    ok(o && o.gapId === b.gapId && b.optionId === p.optionId, `${p.id} option ${b.optionId}`);
    if (o?.economics) ok(p.capexKDm === o.economics.capexKDm && p.capacityGain === o.capacityGain, `${p.id} cost/gain differ from option`);
  }
  for (const a of activity) if (a.ref && /^(DR|ROUTE|ENV|COST|PRJ)-/.test(a.ref)) ok(entryIds.has(a.ref), `activity references missing ${a.ref}`);
  for (const a of activity) if (a.ref?.startsWith('PLN-')) ok(plans.some((p) => p.id === a.ref), `activity references missing ${a.ref}`);
});

section('Command Centre KPIs agree with the underlying rows', () => {
  const s = meta.summary;
  ok(s.openGaps === gaps.length && s.openGaps === 14, 'open gaps');
  ok(s.facilitiesWithGaps === new Set(gaps.map((g) => g.facilityId)).size && s.facilitiesWithGaps === 6, 'facilities with gaps');
  const earliest = [...gaps].sort((a, b) => periodIds.indexOf(a.firstBreach) - periodIds.indexOf(b.firstBreach))[0];
  ok(s.earliestBreach.period === earliest.firstBreach && earliest.firstBreach === '2027-Q2' && earliest.facilityId === 'GC-24', 'earliest breach');
  const net = periodIds.map((p) => facilities.reduce((sum, f) => sum + Math.max(...f.services.map((sv) => cp(f.id, sv, p).parOil)), 0));
  ok(near(Math.max(...net), s.productionAtRisk.value) && s.productionAtRisk.value === 38.6, `production at risk ${Math.max(...net).toFixed(1)} ≠ 38.6`);
  ok(s.mitigations.total === 31 && s.mitigations.nonCapital === 22, 'mitigation counts');
  ok(plans.filter((p) => p.status === 'Awaiting approval').length === 4 && plans.filter((p) => p.status === 'Awaiting approval' && p.pastTarget).length === 2, 'plans awaiting approval: 4, 2 past target');
});

section('locked specification values', () => {
  const gc24 = fac('GC-24');
  const chain = Object.fromEntries(gc24.components.filter((c) => c.service === 'liquid').map((c) => [c.name, c]));
  const exp = { 'Inlet Manifold': [260, 1, 260], 'HP Separator Train': [220, 0.845, 186], Degasser: [240, 1, 240], Desalter: [265, 1, 265], 'Export Pumps': [230, 1, 230] };
  for (const [n, [np, d, eff]] of Object.entries(exp)) ok(chain[n]?.nameplate === np && chain[n].derating === d && chain[n].effective === eff, `GC-24 ${n} locked capacity`);
  ok(chain['HP Separator Train'].deratingRef === 'DR-0042' && chain['HP Separator Train'].derated === 185.9, 'DR-0042 / 185.9');
  const r = cp('GC-24', 'liquid', '2027-Q2'), f = fcRow('GC-24', '2027-Q2');
  ok(f.oil === 148.5 && f.gor === 480 && f.wor === 0.42 && f.gas === 71.3 && f.water === 62.3 && f.liquid === 210.8, 'GC-24 Q2 2027 forecast');
  ok(r.ecMin === 186 && r.nextBindingCapacity === 230 && r.mitigationCeiling === 44 && r.gap === 24.8 && Math.round(r.utilisationPct) === 113 && r.parOil === 17.5, 'GC-24 Q2 2027 capacity row');
  const g = gaps.find((x) => x.facilityId === 'GC-24' && x.service === 'liquid');
  ok(g.firstBreach === '2027-Q2' && g.durationQuarters === 7 && g.severity.score === 82 && g.severity.band === 'Critical' && g.peakGap === 24.8 && g.parOil === 17.5, 'hero gap attributes');
  ok(JSON.stringify(g.cascade.map((t) => t.residualAfter)) === '[16.8,7.3,4.3,0,0]' && JSON.stringify(g.cascade.map((t) => t.delta)) === '[8,9.5,3,6,0]', 'hero cascade 24.8 → 16.8 → 7.3 → 4.3 → 0.0');
  const rc = meta.receivingCheck.streams;
  ok(JSON.stringify(rc.map((s) => [s.headroom, s.oilEquivalent, s.afterPct])) === '[[43,30.3,79.7],[4,8.3,98.5],[24,57.1,64.7]]', 'GC-21 headroom and after-transfer utilisation');
  for (const s of rc) ok(near(s.headroom / s.divisor, s.oilEquivalent), `GC-21 ${s.service} oil equivalent`);
  ok(entries.find((e) => e.id === 'ROUTE-0031').maxDivert === 9.5 && entries.find((e) => e.id === 'ENV-0014').releasable === 5, 'ROUTE-0031 / ENV-0014');
  const e = options.find((o) => o.gapId === g.id && o.tier === 4).economics;
  ok(e.capexKDm === 1.85 && e.npvKDm === 12.37 && e.paybackQuarters === 5.4 && e.costPerBblKD === 1.68 && e.doNothingKDm === -14.19 && e.protectedOil === 3.03 && e.protectedQuarters === 4 && e.onStreamT === 5, 'hero economics');
  const st = meta.stackDemo.cases;
  ok(JSON.stringify(st.map((c) => [c.nominal, c.realised])) === '[[50,44],[30,0],[80,50]]', 'stack demo');
  // stack demo must follow from the chain itself
  const eff = Object.fromEntries(Object.entries(chain).map(([n, c]) => [n, c.effective]));
  const minWith = (add) => Math.min(...Object.entries(eff).map(([n, v]) => v + (add[n] ?? 0)));
  ok(near(minWith({ 'HP Separator Train': 50 }) - 186, 44) && near(minWith({ 'Export Pumps': 30 }) - 186, 0) && near(minWith({ 'HP Separator Train': 50, 'Export Pumps': 30 }) - 186, 50), 'stack demo realised gains follow from min-of-chain');
});

console.log(`\n${checks} assertions, ${failures} failure${failures === 1 ? '' : 's'}`);
process.exit(failures ? 1 : 0);
