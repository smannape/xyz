// Generates the precomputed mock dataset in src/data/*.json.
// The app performs no engineering calculation at runtime; correctness lives here
// and is asserted independently by scripts/check-data.mjs.
//
// LOCKED VALUES (GC-24 chain, Q2 2027 forecast, GC-21 headroom, cascade, economics,
// stack demo) come from the build specification and must not be altered.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
mkdirSync(OUT, { recursive: true });
const write = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 1) + '\n');

const r1 = (x) => Math.round((x + Number.EPSILON) * 10) / 10;
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const round05 = (x) => Math.round(x * 2) / 2; // capacity baseline carries 0.5 resolution
const f1 = (x) => x.toFixed(1);

// ───────────────────────── periods ─────────────────────────
const PERIODS = [];
for (let y = 2027; y <= 2030; y++) for (let q = 1; q <= 4; q++) PERIODS.push({ id: `${y}-Q${q}`, label: `Q${q} ${y}`, index: PERIODS.length });
const N = PERIODS.length;
const pid = (i) => PERIODS[i].id;
const plabel = (i) => PERIODS[i].label;
const pidx = (id) => PERIODS.findIndex((p) => p.id === id);

const UNIT = { liquid: 'MBFPD', gas: 'MMSCFD', water: 'MBWPD', oil: 'MBOPD' };

const META = {
  asset: { code: 'N&WK', name: 'North & West Kuwait' },
  cycle: { id: 'AAP-2027', name: 'AAP-2027 Baseline', scenario: 'Baseline', status: 'In review' },
  analysis: { id: 'ISSPS-2026-0147', runAt: '16 Oct 2026 09:42', runBy: 'S. Rahman', status: 'Locked' },
  vintages: [
    { key: 'forecast', label: 'Forecast', version: 'v4.2', description: 'Subsurface production forecast, manifold level', approvedBy: 'S. Rahman', dept: 'Reservoir Management', approvedDate: '02 Oct 2026' },
    { key: 'capacity', label: 'Capacity', version: 'v2.8', description: 'Capacity baseline with de-rating, routing, envelope and project registers', approvedBy: 'A. Al-Mutairi', dept: 'Facilities Engineering', approvedDate: '14 Aug 2026' },
    { key: 'rules', label: 'Rules', version: 'v1.14', description: 'Recommendation rule library', approvedBy: 'J. Fernandes', dept: 'Operations Technical Services', approvedDate: '21 Sep 2026' },
    { key: 'economics', label: 'Economics', version: 'v1.3', description: 'Screening economic basis and Class 5 cost norms, KOC-supplied', approvedBy: 'M. Khalil', dept: 'Economics', approvedDate: '09 Sep 2026' },
  ],
  horizon: { first: PERIODS[0].id, last: PERIODS[N - 1].id, t0: 'Q4 2026' },
  economicBasis: { netbackKDperBbl: 15.0, discountRatePct: 10, daysPerQuarter: 91, source: 'KOC-supplied' },
  illustrative: true,
};

// ───────────────────────── facilities ─────────────────────────
const DEPT = {
  'A. Al-Mutairi': 'Facilities Engineering',
  'S. Rahman': 'Reservoir Management',
  'J. Fernandes': 'Operations Technical Services',
  'M. Khalil': 'Economics',
};

const SLUG = {
  'Inlet Manifold': 'INLET', 'HP Separator Train': 'HP-SEP', 'LP Separator Train': 'LP-SEP', Degasser: 'DEGAS',
  Desalter: 'DESALT', 'Water KO Drum': 'WKO', 'Export Pumps': 'EXP-PMP', 'Effluent Export Pumps': 'EFF-PMP',
  'Booster Compressor': 'COMP', 'Flare KO': 'FLARE-KO', 'Injection Pumps': 'INJ-PMP',
};
const DR_BASIS = {
  'HP Separator Train': 'Fouling allowance, 2024 turnaround inspection',
  Desalter: 'Electrostatic grid degradation, 2025 performance test',
  'Export Pumps': 'Impeller wear, 2025 pump performance curve re-test',
  'Booster Compressor': 'Recycle margin and summer ambient de-rate, 2025 performance run',
  'Water KO Drum': 'Internals fouling and reduced residence time, 2025 inspection',
};
// C(name, nameplate, derating?, config?)
const C = (name, nameplate, derating = 1, config = null) => ({ name, nameplate, derating, config });
const cfg = (installed, unitCapacity, spare) => ({ installed, unitCapacity, spare });

const FAC_SPEC = [
  { id: 'GC-18', name: 'Gathering Centre 18', type: 'Gathering centre', x: 0.2, y: 0.3, chains: {
      liquid: [C('Inlet Manifold', 240), C('HP Separator Train', 225, 0.96, cfg(3, 112.5, 1)), C('LP Separator Train', 220), C('Degasser', 215), C('Desalter', 210, 0.98), C('Export Pumps', 220, 0.9, cfg(5, 55, 1))],
      gas: [C('Booster Compressor', 45, 0.92, cfg(3, 22.5, 1)), C('Flare KO', 50)],
      water: [C('Water KO Drum', 110, 0.936), C('Effluent Export Pumps', 125)] } },
  { id: 'GC-21', name: 'Gathering Centre 21', type: 'Gathering centre', x: 0.38, y: 0.22, chains: {
      liquid: [C('Inlet Manifold', 200), C('HP Separator Train', 190, 0.95, cfg(3, 95, 1)), C('LP Separator Train', 185), C('Degasser', 180), C('Desalter', 172, 0.96), C('Export Pumps', 175)],
      gas: [C('Booster Compressor', 56, 0.946, cfg(3, 28, 1)), C('Flare KO', 60)],
      water: [C('Water KO Drum', 60), C('Effluent Export Pumps', 70)] } },
  { id: 'GC-24', name: 'Gathering Centre 24', type: 'Gathering centre', x: 0.52, y: 0.4, chains: {
      // LOCKED liquid chain
      liquid: [C('Inlet Manifold', 260), C('HP Separator Train', 220, 0.845, cfg(3, 110, 1)), C('Degasser', 240), C('Desalter', 265), C('Export Pumps', 230)],
      gas: [C('Booster Compressor', 80, 0.925, cfg(3, 40, 1)), C('Flare KO', 85)],
      water: [C('Water KO Drum', 80), C('Effluent Export Pumps', 85)] } },
  { id: 'GC-27', name: 'Gathering Centre 27', type: 'Gathering centre', x: 0.66, y: 0.58, chains: {
      liquid: [C('Inlet Manifold', 250), C('HP Separator Train', 230, 0.95, cfg(3, 115, 1)), C('LP Separator Train', 225), C('Degasser', 222), C('Desalter', 200, 0.975), C('Export Pumps', 226)],
      gas: [C('Booster Compressor', 78, 0.923, cfg(3, 39, 1)), C('Flare KO', 80)],
      water: [C('Water KO Drum', 96, 0.958), C('Effluent Export Pumps', 105)] } },
  { id: 'BS-141', name: 'Booster Station 141', type: 'Booster station', x: 0.3, y: 0.55, chains: {
      gas: [C('Inlet Manifold', 120), C('Booster Compressor', 110, 0.95, cfg(3, 55, 1)), C('Flare KO', 115)] } },
  { id: 'BS-171', name: 'Booster Station 171', type: 'Booster station', x: 0.62, y: 0.78, chains: {
      gas: [C('Inlet Manifold', 170), C('Booster Compressor', 160, 0.9, cfg(3, 80, 1)), C('Flare KO', 165)] } },
  { id: 'WTP-03', name: 'Water Treatment Plant 03', type: 'Water treatment plant', x: 0.82, y: 0.35, chains: {
      water: [C('Inlet Manifold', 335), C('Water KO Drum', 300, 0.9), C('Injection Pumps', 340, 1, cfg(5, 85, 1))] } },
  { id: 'GBS-02', name: 'Gas Booster Station 02', type: 'Gas booster station', x: 0.46, y: 0.82, chains: {
      gas: [C('Inlet Manifold', 260), C('Booster Compressor', 250, 0.92, cfg(4, 83.5, 1)), C('Flare KO', 255)] } },
];

// Committed projects that change effective capacity inside the horizon.
// { facility, component, delta, from (period index) }
const CAP_PROJECTS = [
  { id: 'PRJ-118', facilityId: 'GC-24', component: 'HP Separator Train', service: 'liquid', delta: 8.0, from: pidx('2027-Q4'), title: 'GC-24 separator upgrade' },
  { id: 'PRJ-121', facilityId: 'GC-27', component: 'Desalter', service: 'liquid', delta: 18.0, from: pidx('2029-Q3'), title: 'GC-27 desalter revamp' },
  { id: 'PRJ-109', facilityId: 'GC-18', component: 'Water KO Drum', service: 'water', delta: 12.0, from: pidx('2029-Q2'), title: 'GC-18 produced water handling upgrade' },
  { id: 'PRJ-113', facilityId: 'WTP-03', component: 'Water KO Drum', service: 'water', delta: 36.0, from: pidx('2028-Q3'), title: 'WTP-03 treatment train 4' },
];

let drSeq = 30;
const nextDr = () => { if (drSeq === 42) drSeq++; return `DR-00${drSeq++}`; };
const facilities = FAC_SPEC.map((f) => {
  const components = [];
  for (const service of ['liquid', 'gas', 'water']) {
    for (const c of f.chains[service] ?? []) {
      const id = `${f.id}/${SLUG[c.name]}${service === 'gas' && c.name === 'Inlet Manifold' ? '' : ''}`;
      const isHero = f.id === 'GC-24' && c.name === 'HP Separator Train';
      const derated = r1(c.nameplate * c.derating);
      const comp = {
        id, name: c.name, service, unit: UNIT[service], order: components.filter((x) => x.service === service).length + 1,
        nameplate: c.nameplate, derating: c.derating,
        deratingRef: c.derating < 1 ? (isHero ? 'DR-0042' : nextDr()) : null,
        derated, effective: round05(c.nameplate * c.derating),
        config: c.config ? { ...c.config, text: `${c.config.installed} × ${f1(c.config.unitCapacity)} ${UNIT[service]} installed, ${c.config.spare} spare` } : null,
      };
      if (isHero) comp.config.text = '3 × 110 MBFPD installed, 1 spare';
      components.push(comp);
    }
  }
  return { id: f.id, name: f.name, type: f.type, map: { x: f.x, y: f.y }, services: Object.keys(f.chains), components };
});
const fac = (id) => facilities.find((f) => f.id === id);
const comp = (facilityId, name, service) => fac(facilityId).components.find((c) => c.name === name && (!service || c.service === service));

// ───────────────────────── forecast ─────────────────────────
const lin = (a, step) => Array.from({ length: N }, (_, i) => a + step * i);
const GC = {
  'GC-18': {
    oil: lin(98, -0.8).map(r1), wor: lin(0.95, 0.03), gor: lin(400, 6),
    manifolds: { 'MF-204': 0.31, 'MF-207': 0.24, 'MF-211': 0.27, 'MF-215': null },
  },
  'GC-21': {
    oil: [85.6, 86.0, 85.6, 85.1, 84.6, 84.1, 83.6, 83.1, 82.6, 82.1, 81.6, 81.1, 80.6, 80.1, 79.6, 79.1],
    wor: lin(0.4186 - 0.004, 0.004), gor: lin(570 - 1.5, 1.5),
    manifolds: { 'MF-221': 0.28, 'MF-226': 0.22, 'MF-229': 0.26, 'MF-233': null },
  },
  'GC-27': {
    oil: [112, 113.5, 115, 116.4, 117.6, 118.6, 119.4, 120, 120.4, 120.6, 120.6, 120.4, 120, 119.4, 118.6, 117.6],
    wor: lin(0.55, 0.02), gor: lin(590, 2),
    manifolds: { 'MF-256': 0.3, 'MF-259': 0.21, 'MF-265': 0.26, 'MF-268': null },
  },
};
// GC-24 is authored on a liquid basis so the locked Q2 2027 values fall out exactly.
// Plateau through 2028; MF-262 is re-homed to the GC-29 early production facility in Q1 2029 (PRJ-124).
const GC24_LIQ = [184.2, 210.8, 210.5, 210.7, 210.8, 210.6, 210.4, 210.1, 189.0, 187.5, 186.2, 184.6, 183.0, 181.5, 180.1, 178.8];
const GC24_WOR = [0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.49, 0.5];
const GC24_GOR = [478, 480, 484, 488, 493, 498, 503, 508, 512, 516, 520, 524, 528, 532, 536, 540];
const GC24_MF = {
  'MF-241': (i) => r1(46.0 - 0.3 * i), 'MF-244': (i) => r1(38.2 - 0.25 * i),
  'MF-248': (i) => r1(41.5 - 0.2 * i), 'MF-262': (i) => (i < 8 ? r1(21.2 + 0.05 * i) : 0), 'MF-253': null,
};

const fc = {}; // fc[facilityId][i] = { oil, gas, water, liquid, wor, gor, manifolds }
for (const [id, g] of Object.entries(GC)) {
  fc[id] = g.oil.map((oil, i) => {
    const water = r1(oil * g.wor[i]);
    const gas = r1((oil * g.gor[i]) / 1000);
    return { oil, water, gas, liquid: r1(oil + water), wor: g.wor[i], gor: g.gor[i] };
  });
}
fc['GC-24'] = GC24_LIQ.map((liquid, i) => {
  const oil = r1(liquid / (1 + GC24_WOR[i]));
  return { oil, water: r1(liquid - oil), gas: r1((oil * GC24_GOR[i]) / 1000), liquid, wor: GC24_WOR[i], gor: GC24_GOR[i] };
});
// manifold breakdown (liquid basis; last manifold takes the remainder so rows sum exactly)
for (const id of Object.keys(fc)) {
  fc[id].forEach((row, i) => {
    const out = {};
    let acc = 0;
    const spec = id === 'GC-24' ? GC24_MF : GC[id].manifolds;
    const rest = Object.keys(spec).find((k) => spec[k] === null);
    for (const [mf, s] of Object.entries(spec)) {
      if (s === null) continue;
      out[mf] = typeof s === 'function' ? s(i) : r1(row.liquid * (s + (mf.endsWith('4') || mf.endsWith('6') ? 0.001 : -0.0005) * i));
      acc += out[mf];
    }
    out[rest] = r1(row.liquid - acc);
    row.manifolds = out;
  });
}
const FEEDS = { 'BS-141': ['GC-18', 'GC-21'], 'BS-171': ['GC-24', 'GC-27'], 'GBS-02': ['BS-141', 'BS-171'], 'WTP-03': ['GC-18', 'GC-21', 'GC-24', 'GC-27'] };
for (const bs of ['BS-141', 'BS-171']) {
  fc[bs] = PERIODS.map((_, i) => {
    const feeders = FEEDS[bs];
    const gas = r1(feeders.reduce((s, g) => s + fc[g][i].gas, 0));
    const oil = r1(feeders.reduce((s, g) => s + fc[g][i].oil, 0));
    return { gas, upstreamOil: oil, gor: (gas / oil) * 1000, contributors: Object.fromEntries(feeders.map((g) => [g, fc[g][i].gas])) };
  });
}
fc['GBS-02'] = PERIODS.map((_, i) => {
  const gas = r1(fc['BS-141'][i].gas + fc['BS-171'][i].gas);
  const oil = r1(fc['BS-141'][i].upstreamOil + fc['BS-171'][i].upstreamOil);
  return { gas, upstreamOil: oil, gor: (gas / oil) * 1000, contributors: { 'BS-141': fc['BS-141'][i].gas, 'BS-171': fc['BS-171'][i].gas } };
});
fc['WTP-03'] = PERIODS.map((_, i) => {
  const feeders = FEEDS['WTP-03'];
  const water = r1(feeders.reduce((s, g) => s + fc[g][i].water, 0));
  const oil = r1(feeders.reduce((s, g) => s + fc[g][i].oil, 0));
  return { water, upstreamOil: oil, wor: water / oil, contributors: Object.fromEntries(feeders.map((g) => [g, fc[g][i].water])) };
});

const forecast = [];
for (const f of facilities) {
  PERIODS.forEach((p, i) => {
    const row = fc[f.id][i];
    forecast.push({
      facilityId: f.id, period: p.id,
      oil: row.oil ?? null, gas: row.gas ?? null, water: row.water ?? null, liquid: row.liquid ?? null,
      gor: row.gor != null ? Math.round(row.gor) : null, wor: row.wor != null ? r2(row.wor) : null,
      upstreamOil: row.upstreamOil ?? null,
      contributorBasis: row.manifolds ? 'liquid' : f.services[0],
      contributors: row.manifolds ?? row.contributors,
    });
  });
}

// ───────────────────────── capacity per period ─────────────────────────
const oilEq = (facilityId, service, i, qty) => {
  const row = fc[facilityId][i];
  if (service === 'liquid') return qty / (1 + row.wor);
  if (service === 'gas') return qty / (row.gor / 1000);
  return qty / row.wor;
};
const capacityPeriods = [];
for (const f of facilities) {
  for (const service of f.services) {
    PERIODS.forEach((p, i) => {
      const chain = f.components.filter((c) => c.service === service).map((c) => {
        const prj = CAP_PROJECTS.filter((x) => x.facilityId === f.id && x.component === c.name && x.service === service && i >= x.from);
        return { componentId: c.id, effective: r1(c.effective + prj.reduce((s, x) => s + x.delta, 0)), projects: prj.map((x) => x.id) };
      });
      const sorted = [...chain].sort((a, b) => a.effective - b.effective);
      const load = fc[f.id][i][service];
      const ecMin = sorted[0].effective;
      const gap = r1(Math.max(0, load - ecMin));
      capacityPeriods.push({
        facilityId: f.id, service, unit: UNIT[service], period: p.id,
        forecast: load, ecMin, bindingComponentId: sorted[0].componentId,
        nextBindingComponentId: sorted[1]?.componentId ?? null, nextBindingCapacity: sorted[1]?.effective ?? null,
        mitigationCeiling: sorted[1] ? r1(sorted[1].effective - ecMin) : null,
        utilisationPct: r1((load / ecMin) * 100), gap,
        parOil: gap > 0 ? r1(oilEq(f.id, service, i, gap)) : 0,
        chain,
      });
    });
  }
}
const cp = (facilityId, service, i) => capacityPeriods.find((r) => r.facilityId === facilityId && r.service === service && r.period === pid(i));

// ───────────────────────── gaps (breach episodes) ─────────────────────────
const SERVICE_LABEL = { liquid: 'Liquid', gas: 'Gas', water: 'Water' };
const episodes = [];
for (const f of facilities) for (const service of f.services) {
  let cur = null;
  for (let i = 0; i < N; i++) {
    const row = cp(f.id, service, i);
    if (row.gap > 0) { cur ??= { facilityId: f.id, service, idx: [] }; cur.idx.push(i); }
    else if (cur) { episodes.push(cur); cur = null; }
  }
  if (cur) episodes.push(cur);
}
episodes.sort((a, b) => a.idx[0] - b.idx[0] || (a.facilityId === 'GC-24' ? -1 : 0) || a.facilityId.localeCompare(b.facilityId));

const severityBand = (s) => (s >= 75 ? 'Critical' : s >= 50 ? 'High' : s >= 25 ? 'Medium' : 'Low');
const gaps = episodes.map((e, n) => {
  const rows = e.idx.map((i) => cp(e.facilityId, e.service, i));
  const peak = rows.reduce((a, b) => (b.gap > a.gap ? b : a));
  const peakPar = Math.max(...rows.map((r) => r.parOil));
  const first = e.idx[0], last = e.idx[e.idx.length - 1];
  const mag = Math.min(1, peak.gap / peak.ecMin / 0.2), dur = Math.min(1, e.idx.length / 8), prox = 1 - first / N;
  const score = Math.round(100 * (0.35 * mag + 0.3 * dur + 0.35 * prox));
  const c = fac(e.facilityId).components.find((x) => x.id === peak.bindingComponentId);
  return {
    id: `GAP-${1041 + n}`, facilityId: e.facilityId, service: e.service, stream: SERVICE_LABEL[e.service], unit: UNIT[e.service],
    bindingComponentId: c.id, bindingComponentName: c.name,
    firstBreach: pid(first), lastBreach: pid(last), openEnded: last === N - 1, durationQuarters: e.idx.length,
    peakPeriod: peak.period, peakGap: peak.gap, peakForecast: peak.forecast, capacityAtPeak: peak.ecMin,
    capacityAtFirstBreach: rows[0].ecMin, utilisationPct: peak.utilisationPct, parOil: peakPar,
    severity: { score, band: severityBand(score), segments: score >= 75 ? 4 : score >= 50 ? 3 : score >= 25 ? 2 : 1,
      magnitude: r2(mag), duration: r2(dur), proximity: r2(prox) },
    profile: e.idx.map((i) => ({ period: pid(i), gap: cp(e.facilityId, e.service, i).gap, parOil: cp(e.facilityId, e.service, i).parOil })),
  };
});
const gapOf = (facilityId, service, k = 0) => gaps.filter((g) => g.facilityId === facilityId && g.service === service)[k];

// ───────────────────────── registers ─────────────────────────
const entry = (register, id, title, status, by, date, vintage, valueText, basis, fields, extra = {}) =>
  ({ id, register, title, status, approvedBy: status === 'Proposed' ? null : by, dept: DEPT[by], proposedBy: status === 'Proposed' ? by : null, approvedDate: status === 'Proposed' ? null : date, submittedDate: status === 'Proposed' ? date : null, vintage, valueText, basis, fields, ...extra });

const DR_DATES = ['11 Mar 2026', '22 Apr 2026', '06 May 2026', '19 Jun 2026', '08 Jul 2026', '14 Aug 2026'];
const derating = [];
for (const f of facilities) for (const c of f.components) {
  if (!c.deratingRef) continue;
  const hero = c.deratingRef === 'DR-0042';
  derating.push(entry('derating', c.deratingRef, `${f.id} ${c.name}`, 'Approved', 'A. Al-Mutairi', hero ? '14 Aug 2026' : DR_DATES[derating.length % 5], 'capacity v2.8',
    `nameplate ${f1(c.nameplate)} → de-rated ${f1(c.derated)} (× ${c.derating})`, DR_BASIS[c.name],
    [['Facility', f.id], ['Component', c.name], ['Service', SERVICE_LABEL[c.service]], ['Nameplate', `${f1(c.nameplate)} ${c.unit}`], ['De-rating factor δ', String(c.derating)], ['De-rated', `${f1(c.derated)} ${c.unit}`], ['Effective (0.5 resolution)', `${f1(c.effective)} ${c.unit}`], ...(c.config ? [['Configuration', c.config.text]] : []), ['Review due', hero ? 'Aug 2027' : '2027 capacity baseline']],
    { facilityId: f.id, componentId: c.id, ...(hero ? { supersedes: 'DR-0029' } : {}) }));
}
derating.push(entry('derating', 'DR-0029', 'GC-24 HP Separator Train', 'Superseded', 'A. Al-Mutairi', '03 Feb 2025', 'capacity v2.5',
  'nameplate 220.0 → de-rated 198.0 (× 0.9)', 'Pre-turnaround fouling estimate, 2023 performance test',
  [['Facility', 'GC-24'], ['Component', 'HP Separator Train'], ['Service', 'Liquid'], ['Nameplate', '220.0 MBFPD'], ['De-rating factor δ', '0.9'], ['De-rated', '198.0 MBFPD'], ['Superseded by', 'DR-0042'], ['Reason', 'Factor revised after 2024 turnaround inspection']],
  { facilityId: 'GC-24', componentId: 'GC-24/HP-SEP', supersededBy: 'DR-0042' }));
derating.push(entry('derating', 'DR-0049', 'GC-27 Export Pumps', 'Proposed', 'J. Fernandes', '09 Oct 2026', 'not in capacity v2.8',
  'nameplate 226.0 → de-rated 219.2 (× 0.97)', 'Seal degradation observed on P-2703B, awaiting vibration survey',
  [['Facility', 'GC-27'], ['Component', 'Export Pumps'], ['Service', 'Liquid'], ['Nameplate', '226.0 MBFPD'], ['Proposed factor δ', '0.97'], ['Effect if approved', 'Not binding; no change to effective capacity']],
  { facilityId: 'GC-27', componentId: 'GC-27/EXP-PMP' }));
derating.sort((a, b) => a.id.localeCompare(b.id));

// Projects
const PRJ_EXTRA = [
  ['PRJ-101', 'GC-18 flare tip replacement', 'GC-18', 'Flare KO', 'gas', 0, '2027-Q2', 'Approved'],
  ['PRJ-103', 'BS-141 anti-surge controls upgrade', 'BS-141', 'Booster Compressor', 'gas', 0, '2027-Q3', 'Approved'],
  ['PRJ-106', 'GC-21 desalter transformer replacement', 'GC-21', 'Desalter', 'liquid', 0, '2027-Q4', 'Approved'],
  ['PRJ-111', 'GC-27 inlet manifold header extension', 'GC-27', 'Inlet Manifold', 'liquid', 0, '2028-Q1', 'Approved'],
  ['PRJ-115', 'GBS-02 lube oil system upgrade', 'GBS-02', 'Booster Compressor', 'gas', 0, '2028-Q2', 'Approved'],
  ['PRJ-116', 'GC-24 export pump VFD retrofit', 'GC-24', 'Export Pumps', 'liquid', 0, '2028-Q2', 'Approved'],
  ['PRJ-119', 'GC-18 degasser internals replacement', 'GC-18', 'Degasser', 'liquid', 0, '2028-Q3', 'Approved'],
  ['PRJ-122', 'BS-171 suction scrubber replacement', 'BS-171', 'Inlet Manifold', 'gas', 0, '2028-Q4', 'Approved'],
  ['PRJ-124', 'MF-262 trunkline to GC-29 early production facility', 'GC-24', 'Inlet Manifold', 'liquid', 0, '2029-Q1', 'Approved'],
  ['PRJ-126', 'WTP-03 injection pump P-0306 addition', 'WTP-03', 'Injection Pumps', 'water', 0, '2029-Q3', 'Approved'],
  ['PRJ-128', 'GC-21 LP separator level control upgrade', 'GC-21', 'LP Separator Train', 'liquid', 0, '2029-Q4', 'Approved'],
  ['PRJ-129', 'GC-27 produced water KO drum addition', 'GC-27', 'Water KO Drum', 'water', 10, '2031-Q1', 'Proposed'],
  ['PRJ-131', 'GBS-02 fourth compressor train', 'GBS-02', 'Booster Compressor', 'gas', 40, '2031-Q2', 'Proposed'],
];
const qLabel = (id) => { const [y, q] = id.split('-'); return `${q} ${y}`; };
const project = [
  ...CAP_PROJECTS.map((p) => entry('project', p.id, p.title, 'Approved', 'A. Al-Mutairi', p.id === 'PRJ-118' ? '12 May 2026' : '18 Jun 2026', 'capacity v2.8',
    `+${f1(p.delta)} ${UNIT[p.service]} at ${p.component}, on stream ${plabel(p.from)}`, 'Committed and funded in the approved capital programme',
    [['Facility', p.facilityId], ['Component', p.component], ['Capacity added', `+${f1(p.delta)} ${UNIT[p.service]}`], ['On stream', plabel(p.from)], ['Funding', 'Committed'], ['Stage', p.id === 'PRJ-118' ? 'Execute — vessel internals on order' : 'Define']],
    { facilityId: p.facilityId, componentId: comp(p.facilityId, p.component, p.service).id, delta: p.delta, unit: UNIT[p.service], onStream: pid(p.from), affectsCapacity: true })),
  ...PRJ_EXTRA.map(([id, title, f, c, s, delta, on, status], k) => entry('project', id, title, status, k % 2 ? 'A. Al-Mutairi' : 'J. Fernandes', ['04 Feb 2026', '27 Mar 2026', '15 May 2026', '30 Jun 2026'][k % 4], status === 'Proposed' ? 'not in capacity v2.8' : 'capacity v2.8',
    id === 'PRJ-124' ? `MF-262 re-homed from GC-24 to GC-29, on stream ${qLabel(on)}` : delta ? `+${f1(delta)} ${UNIT[s]} at ${c}, on stream ${qLabel(on)}` : `No capacity change, on stream ${qLabel(on)}`,
    id === 'PRJ-124' ? 'Committed; already reflected in forecast v4.2 as a GC-24 load reduction from Q1 2029' : status === 'Proposed' ? 'Pre-sanction; not counted in the capacity basis' : 'Committed; integrity or reliability scope with no capacity effect',
    [['Facility', f], ['Component', c], ['Capacity added', delta ? `+${f1(delta)} ${UNIT[s]}` : 'None'], ['On stream', qLabel(on)], ['Funding', status === 'Proposed' ? 'Not sanctioned' : 'Committed']],
    { facilityId: f, componentId: comp(f, c, s)?.id ?? null, delta, unit: UNIT[s], onStream: on, affectsCapacity: false })),
].sort((a, b) => a.id.localeCompare(b.id));

// Routing: [id, from, normal, alternate, maxDivert, unit, status, basis]
const ROUTES = [
  ['ROUTE-0017', 'MF-204', 'GC-18', 'GC-21', 5.0, 'MBFPD', 'Approved', '12" crossover, hydraulic limit at current wellhead pressure'],
  ['ROUTE-0018', 'MF-207', 'GC-18', 'GC-21', 0.0, 'MBFPD', 'Approved', 'No physical tie-in; listed for completeness'],
  ['ROUTE-0019', 'MF-211', 'GC-18', 'GC-21', 4.0, 'MBFPD', 'Approved', '10" jump-over at MF-211 header'],
  ['ROUTE-0020', 'MF-215', 'GC-18', 'GC-24', 0.0, 'MBFPD', 'Approved', 'Tie-in isolated; spool removed 2023'],
  ['ROUTE-0021', 'MF-221', 'GC-21', 'GC-18', 6.0, 'MBFPD', 'Approved', '12" crossover, reverse flow permitted'],
  ['ROUTE-0022', 'MF-226', 'GC-21', 'GC-24', 7.5, 'MBFPD', 'Approved', '16" trunkline tie-in at KP 4.2'],
  ['ROUTE-0023', 'MF-229', 'GC-21', 'GC-24', 0.0, 'MBFPD', 'Approved', 'No physical tie-in'],
  ['ROUTE-0024', 'MF-233', 'GC-21', 'GC-27', 3.0, 'MBFPD', 'Approved', '8" test line, limited by erosional velocity'],
  ['ROUTE-0025', 'MF-244', 'GC-24', 'GC-27', 0.0, 'MBFPD', 'Approved', 'Tie-in not available until PRJ-111 header extension'],
  ['ROUTE-0026', 'MF-248', 'GC-24', 'GC-27', 0.0, 'MBFPD', 'Approved', 'No physical tie-in'],
  ['ROUTE-0027', 'MF-253', 'GC-24', 'GC-27', 0.0, 'MBFPD', 'Approved', 'Sour service mismatch with GC-27 inlet metallurgy'],
  ['ROUTE-0028', 'MF-268', 'GC-27', 'GC-21', 2.0, 'MBFPD', 'Approved', '8" crossover via MF-233 corridor; shares GC-21 receiving capacity with ROUTE-0031'],
  ['ROUTE-0029', 'MF-256', 'GC-27', 'GC-24', 0.0, 'MBFPD', 'Approved', 'GC-24 has no receiving headroom within horizon'],
  ['ROUTE-0030', 'MF-259', 'GC-27', 'GC-24', 0.0, 'MBFPD', 'Approved', 'No physical tie-in'],
  ['ROUTE-0031', 'MF-241', 'GC-24', 'GC-21', 9.5, 'MBFPD', 'Approved', '16" crossover at MF-241 header; limit set by line hydraulics at GC-21 inlet pressure'],
  ['ROUTE-0032', 'MF-265', 'GC-27', 'GC-21', 0.0, 'MBFPD', 'Approved', 'No physical tie-in'],
  ['ROUTE-0033', 'BS-171 discharge', 'GBS-02', 'BS-141 suction', 2.5, 'MMSCFD', 'Approved', '10" gas crossover, BS-171 → BS-141 suction header'],
  ['ROUTE-0034', 'GC-18 effluent water', 'WTP-03', 'Disposal wells DW-07/08', 2.0, 'MBWPD', 'Approved', 'Injectivity limit of disposal wells, 2025 step-rate test'],
  ['ROUTE-0035', 'GC-27 effluent water', 'WTP-03', 'Disposal wells DW-11/12', 5.0, 'MBWPD', 'Approved', 'Injectivity limit of disposal wells, 2025 step-rate test'],
  ['ROUTE-0037', 'GC-27 LP gas', 'GC-27 Booster Compressor', 'BS-171 LP suction', 0.5, 'MMSCFD', 'Approved', '6" LP gas bypass to BS-171 suction scrubber'],
  ['ROUTE-0036', 'MF-262', 'GC-24', 'GC-27', 12.0, 'MBFPD', 'Proposed', 'Requires new 2.1 km 12" line; proposed, not in capacity v2.8'],
];
const routing = ROUTES.map(([id, from, normal, alt, max, unit, status, basis], k) => entry('routing', id, `${from} → ${alt}`, status, 'J. Fernandes', ['18 Feb 2026', '09 Apr 2026', '21 May 2026', '02 Jul 2026'][k % 4], status === 'Proposed' ? 'not in capacity v2.8' : 'capacity v2.8',
  `${from} → ${alt}, MaxDivert ${f1(max)} ${unit}`, basis,
  [['Source', from], ['Normal destination', normal], ['Alternate destination', alt], ['MaxDivert', `${f1(max)} ${unit}`], ['Feasible', max > 0 && status === 'Approved' ? 'Yes' : 'No']],
  { from, normal, alternate: alt, maxDivert: max, unit }));

// Envelope releases: [id, facility, component, service, releasable, date, basis, reserved]
const ENVS = [
  ['ENV-0006', 'GC-18', 'Export Pumps', 'liquid', 3.0, '14 Jan 2026', 'Run spare pump in parallel at reduced NPSH margin, summer excluded', null],
  ['ENV-0007', 'GC-18', 'Water KO Drum', 'water', 2.0, '14 Jan 2026', 'Operate at 85% of design residence time; oil-in-water limit confirmed', null],
  ['ENV-0008', 'GC-18', 'Booster Compressor', 'gas', 1.0, '02 Feb 2026', 'Suction pressure raised 0.3 bar within driver power limit', null],
  ['ENV-0009', 'GC-21', 'Desalter', 'liquid', 4.0, '02 Feb 2026', 'Wash water ratio reduced within salt spec margin', null],
  ['ENV-0010', 'GC-21', 'Booster Compressor', 'gas', 0.0, '02 Feb 2026', 'No margin available; machine at driver limit', null],
  ['ENV-0011', 'GC-21', 'Water KO Drum', 'water', 3.0, '17 Feb 2026', 'Operate at 85% of design residence time', null],
  ['ENV-0012', 'GC-24', 'Export Pumps', 'liquid', 0.0, '17 Feb 2026', 'No margin; pumps at motor rated current', null],
  ['ENV-0013', 'GC-24', 'Degasser', 'liquid', 6.0, '03 Mar 2026', 'Released design margin on liquid residence time', null],
  ['ENV-0014', 'GC-24', 'HP Separator Train', 'liquid', 5.0, '03 Mar 2026', 'Released design margin on HP separator liquid residence time; carry-over limit verified against 2024 inspection', '2.0 MBFPD reserved for GC-24 gas service'],
  ['ENV-0015', 'GC-24', 'Water KO Drum', 'water', 4.0, '03 Mar 2026', 'Operate at 85% of design residence time', null],
  ['ENV-0016', 'GC-27', 'Desalter', 'liquid', 1.0, '24 Mar 2026', 'Wash water ratio reduced within salt spec margin', null],
  ['ENV-0017', 'GC-24', 'Booster Compressor', 'gas', 1.0, '24 Mar 2026', 'Suction pressure raised 0.3 bar using separator margin reserved under ENV-0014', null],
  ['ENV-0018', 'GC-27', 'Booster Compressor', 'gas', 1.0, '24 Mar 2026', 'Suction pressure raised 0.3 bar within driver power limit', null],
  ['ENV-0019', 'GC-27', 'Water KO Drum', 'water', 2.0, '07 Apr 2026', 'Operate at 85% of design residence time; oil-in-water limit confirmed', null],
  ['ENV-0020', 'BS-171', 'Booster Compressor', 'gas', 2.0, '07 Apr 2026', 'Recycle valve margin reduced from 10% to 7% with anti-surge retune', null],
  ['ENV-0021', 'GBS-02', 'Booster Compressor', 'gas', 2.5, '21 Apr 2026', 'Recycle valve margin reduced with anti-surge retune', null],
  ['ENV-0022', 'WTP-03', 'Water KO Drum', 'water', 8.0, '21 Apr 2026', 'Operate at 90% of design residence time; injection water quality limit confirmed', null],
  ['ENV-0023', 'GC-18', 'Desalter', 'liquid', 3.0, '12 Oct 2026', 'Proposed wash water ratio reduction; lab confirmation outstanding', null],
];
const envelope = ENVS.map(([id, f, c, s, rel, date, basis, reserved]) => entry('envelope', id, `${f} ${c}`, id === 'ENV-0023' ? 'Proposed' : 'Approved', 'J. Fernandes', date, id === 'ENV-0023' ? 'not in capacity v2.8' : 'capacity v2.8',
  `${f1(rel)} ${UNIT[s]} releasable at ${c}`, basis,
  [['Facility', f], ['Component', c], ['Releasable margin', `${f1(rel)} ${UNIT[s]}`], ...(reserved ? [['Reservation', reserved]] : []), ['Conditions', 'Operating procedure revision and operator briefing before use']],
  { facilityId: f, componentId: comp(f, c, s).id, releasable: rel, unit: UNIT[s] }));

// Cost norms: [id, title, component, service, size, capexKDm, months, longLeadItem, longLeadMonths]
const COSTS = [
  ['COST-0003', 'Re-routing enabling works — valve and spool modifications', null, 'liquid', null, 0.12, 3, null, null],
  ['COST-0004', 'Envelope release — procedure revision and instrument re-ranging', null, null, null, 0.04, 2, null, null],
  ['COST-0005', 'Gas crossover enabling works — valve automation', null, 'gas', null, 0.18, 4, null, null],
  ['COST-0006', 'Water diversion enabling works — disposal well hook-up', null, 'water', null, 0.15, 3, null, null],
  ['COST-0007', 'Separator skid, 6.0 MBFPD', 'HP Separator Train', 'liquid', 6.0, 1.85, 14, 'Separator vessel', 9],
  ['COST-0008', 'Separator skid, 12.0 MBFPD', 'HP Separator Train', 'liquid', 12.0, 3.2, 16, 'Separator vessel', 10],
  ['COST-0009', 'Desalter module, 6.0 MBFPD', 'Desalter', 'liquid', 6.0, 2.1, 15, 'Desalter vessel and transformer', 10],
  ['COST-0010', 'Export pump unit, 5.0 MBFPD', 'Export Pumps', 'liquid', 5.0, 0.95, 10, 'Pump and motor set', 7],
  ['COST-0011', 'Export pump unit, 10.0 MBFPD', 'Export Pumps', 'liquid', 10.0, 1.7, 12, 'Pump and motor set', 8],
  ['COST-0012', 'Compressor re-wheel, +1.5 MMSCFD', 'Booster Compressor', 'gas', 1.5, 0.8, 9, 'Impeller bundle', 6],
  ['COST-0013', 'Compressor module, 5.0 MMSCFD', 'Booster Compressor', 'gas', 5.0, 2.6, 16, 'Compressor package', 11],
  ['COST-0014', 'Compressor module, 10.0 MMSCFD', 'Booster Compressor', 'gas', 10.0, 4.4, 18, 'Compressor package', 12],
  ['COST-0015', 'Hydrocyclone skid, 5.0 MBWPD', 'Water KO Drum', 'water', 5.0, 0.7, 8, 'Hydrocyclone liners', 5],
  ['COST-0016', 'Hydrocyclone skid, 10.0 MBWPD', 'Water KO Drum', 'water', 10.0, 1.25, 10, 'Hydrocyclone vessels', 6],
  ['COST-0017', 'Water treatment module, 20.0 MBWPD', 'Water KO Drum', 'water', 20.0, 2.2, 12, 'Flotation unit', 8],
  ['COST-0018', 'New gathering centre train, 60 MBFPD (order of magnitude)', null, 'liquid', 60.0, 12.0, 36, 'Major vessels and rotating equipment', 18],
];
const cost = COSTS.map(([id, title, c, s, size, capex, months, ll, llm]) => entry('cost', id, title, 'Approved', 'M. Khalil', '09 Sep 2026', 'economics v1.3',
  `Class 5 · KD ${capex.toFixed(2)}M · ${months} months`, 'Class 5 screening norm, KOC-supplied; accuracy −30% / +50%',
  [['Scope', title], ...(size ? [['Module size', `${f1(size)} ${UNIT[s]}`]] : []), ['Class 5 cost', `KD ${capex.toFixed(2)}M`], ['Schedule', `${months} months`], ...(ll ? [['Long-lead item', `${ll}, ${llm} months`]] : []), ['Source', 'KOC-supplied']],
  { component: c, service: s, size, capexKDm: capex, months, longLead: ll ? { item: ll, months: llm } : null }));

const registers = { derating, routing, envelope, cost, project };
const allEntries = Object.values(registers).flat();
const reg = (id) => { const e = allEntries.find((x) => x.id === id); if (!e) throw new Error(`register ref ${id} missing`); return e; };

// ───────────────────────── rules ─────────────────────────
const rule = (id, name, when, and, then, tier = null) => ({ id, name, version: 'v1.14', status: 'Approved', tier, when, and, then });
const rules = [
  rule('RULE-R01', 'effective-capacity-is-min-of-chain', 'a facility has an ordered component chain for a service', ['each component carries a nameplate capacity and an approved de-rating factor in DE-RATING REGISTER'], 'set effective capacity to the minimum de-rated capacity in the chain and name that component as binding'),
  rule('RULE-R02', 'gap-detection', 'forecast load at a facility exceeds effective capacity in a period', ['the forecast and capacity vintages are both locked to the analysis'], 'open a gap for the consecutive breach periods, recording peak gap, duration and production at risk'),
  rule('RULE-R03', 'severity-scoring', 'a gap is open', ['magnitude is the peak gap as a share of effective capacity, capped at 20%', 'duration is breach quarters, capped at 8', 'proximity falls linearly from the first to the last period of the horizon'], 'score severity as 35% magnitude, 30% duration, 35% proximity and band it Low, Medium, High or Critical'),
  rule('RULE-R04', 'committed-projects-first', 'a gap is open', ['a committed project in PROJECT REGISTER adds capacity at the binding component within the horizon'], 'credit the committed capacity before proposing any new mitigation, and report the periods in which the breach persists', 1),
  rule('RULE-R05', 'governing-stream-on-transfer', 'a re-routing transfer is being sized', ['the receiving facility has headroom on liquid, gas and water'], 'convert each stream headroom to an oil-equivalent transfer using the source GOR and WOR, and let the smallest govern the stream check', 2),
  rule('RULE-R06', 'no-shared-capacity-double-count', 'two or more routes draw on the same receiving facility in the same period', [], 'allocate receiving headroom to the earliest-breaching gap first and offer only the remainder to the others', 2),
  rule('RULE-R07', 'envelope-release-requires-approval', 'a gap has residual > 0 after re-routing', ['an approved entry exists in ENVELOPE REGISTER for the binding component', 'the releasable margin is not reserved for another service'], 'propose the unreserved margin as an operating-envelope release, before any capital option', 3),
  rule('RULE-R08', 'size-to-live-residual', 'a gap has residual > 0 after operating-envelope release', ['a debottleneck module for the binding component exists in COST REGISTER'], 'select the smallest standard module that covers the live residual and carry its Class 5 cost and schedule', 4),
  rule('RULE-R09', 'next-binding-ceiling', 'a mitigation adds capacity at the binding component', ['another component in the chain has lower effective capacity than the new total'], 'limit the realised gain to the next-binding component and report the ceiling', 4),
  rule('RULE-R10', 'class-5-flag', 'a cost from COST REGISTER is shown or used in economics', [], 'label it Class 5 indicative and carry the screening accuracy range with it'),
  rule('RULE-R11', 'new-facility-last', 'a gap has residual > 0 after debottlenecking', ['no further module can be added within plot or next-binding limits'], 'propose a new facility or train as the last resort', 5),
  rule('RULE-R12', 'route-before-capital', 'a gap has residual > 0 after committed projects', ['a feasible route exists in ROUTING REGISTER with transferable capacity > 0', 'the receiving facility remains within effective capacity after transfer'], 'propose re-routing before any capital option', 2),
];
const TIER_NAME = { 1: 'Committed projects', 2: 'Re-routing', 3: 'Operating envelope', 4: 'Debottleneck', 5: 'New facility' };
const TIER_RULE = { 1: 'RULE-R04', 2: 'RULE-R12', 3: 'RULE-R07', 4: 'RULE-R08', 5: 'RULE-R11' };

// ───────────────────────── economics ─────────────────────────
const B = META.economicBasis;
const df = (t) => Math.pow(1 + B.discountRatePct / 100, -t / 4);
function economics({ capexPhases, onStreamT, protectedOil, quarters }) {
  const capex = r2(capexPhases.reduce((s, x) => s + x, 0));
  const revenue = r2((protectedOil * B.daysPerQuarter * B.netbackKDperBbl) / 1000); // KD M per quarter
  const cashflow = [];
  capexPhases.forEach((c, t) => { if (c > 0) cashflow.push({ t, kind: 'capex', amount: -c, discountFactor: +df(t).toFixed(4), pv: -r2(c * df(t)) }); });
  for (let k = 0; k < quarters; k++) { const t = onStreamT + k; cashflow.push({ t, kind: 'protected production', amount: revenue, discountFactor: +df(t).toFixed(4), pv: r2(revenue * df(t)) }); }
  const pvProtected = r2(cashflow.filter((c) => c.kind !== 'capex').reduce((s, c) => s + c.pv, 0));
  const pvCapex = r2(-cashflow.filter((c) => c.kind === 'capex').reduce((s, c) => s + c.pv, 0));
  const barrels = protectedOil * 1000 * B.daysPerQuarter * quarters;
  return {
    capexKDm: capex, capexPhases, onStreamT, protectedOil, protectedQuarters: quarters, revenuePerQuarterKDm: revenue,
    pvProtectedKDm: pvProtected, pvCapexKDm: pvCapex, npvKDm: r2(pvProtected - pvCapex),
    paybackQuarters: capex > 0 && revenue > 0 ? r1(onStreamT + capex / revenue) : null,
    costPerBblKD: capex > 0 && barrels > 0 ? r2((capex * 1e6) / barrels) : null,
    doNothingKDm: -pvProtected, cashflow,
  };
}
const T0_INDEX = -1; // t0 = Q4 2026, the quarter before the first forecast period
const tOf = (periodIndex) => periodIndex - T0_INDEX;

// ───────────────────────── cascades & options ─────────────────────────
const options = [];
const check = (label, result, detail) => ({ label, result, detail });

// Hero cascade — LOCKED text and numbers.
const HERO = [
  { tier: 1, status: 'applied', delta: 8.0, title: 'PRJ-118 GC-24 separator upgrade', headline: 'PRJ-118 GC-24 separator upgrade, on stream Q4 2027',
    lines: ['relieves 8.0 from Q4 2027; breach persists Q2–Q3 2027'], refs: ['PRJ-118', 'PRJ-124'],
    checks: [check('Project is committed and funded', 'pass', 'PRJ-118 status Approved in PROJECT REGISTER, capacity v2.8'), check('Adds capacity at the binding component', 'pass', '+8.0 MBFPD at HP Separator Train: 186.0 → 194.0 from Q4 2027'), check('Breach persists before on-stream date', 'flag', 'Q2–Q3 2027 carry the full 24.8 MBFPD gap; no committed relief'), check('Other committed projects', 'info', 'PRJ-124 re-homes MF-262 from Q1 2029; already in forecast v4.2 and ends the breach')],
    capexPhases: [0], months: 0, onStream: '2027-Q4', protectedGain: null, costRef: null, costNote: 'Committed — no incremental cost' },
  { tier: 2, status: 'applied', delta: 9.5, title: 'Divert MF-241 → GC-21', headline: 'Divert MF-241 → GC-21 (ROUTE-0031)',
    lines: ['gas headroom at GC-21 governs: 4.0 MMSCFD ÷ 0.48 = 8.3 MBOPD', 'GC-21 re-evaluated: liquid 79.7% · gas 98.5% · water 64.7% — accepted', 'no shared-capacity double count (checked against ROUTE-0028)'], refs: ['ROUTE-0031', 'ROUTE-0028', 'COST-0003'],
    checks: [
      check('Liquid headroom at GC-21', 'pass', '43.0 MBFPD ÷ 1.42 → 30.3 MBOPD'),
      check('Gas headroom at GC-21', 'governs', '4.0 MMSCFD ÷ 0.48 → 8.3 MBOPD — governs the stream check (RULE-R05)'),
      check('Water headroom at GC-21', 'pass', '24.0 MBWPD ÷ 0.42 → 57.1 MBOPD'),
      check('Route limit', 'governs', 'ROUTE-0031 MaxDivert 9.5 MBFPD — governs the final transfer'),
      check('GC-21 after transfer', 'pass', 'liquid 79.7% · gas 98.5% · water 64.7% of effective capacity — accepted'),
      check('Shared-capacity double count', 'pass', 'ROUTE-0028 also lands at GC-21 but is first drawn in Q1 2030, after this transfer ends in Q4 2028; no period counts the headroom twice (RULE-R06)'),
    ],
    capexPhases: [0.12], months: 3, onStream: '2027-Q2', costRef: 'COST-0003' },
  { tier: 3, status: 'partial', delta: 3.0, title: 'Release HP separator design margin', headline: 'Released design margin on HP separator (ENV-0014, approved 03 Mar 2026)',
    lines: ['3.0 of 5.0 available; remainder reserved for GC-24 gas service'], refs: ['ENV-0014', 'ENV-0017', 'COST-0004'],
    checks: [check('Envelope entry approved', 'pass', 'ENV-0014 approved 03 Mar 2026 by J. Fernandes, Operations Technical Services'), check('Unreserved margin', 'flag', '5.0 MBFPD releasable, 2.0 reserved for GC-24 gas service (ENV-0017) → 3.0 available'), check('Next-binding ceiling', 'pass', '186.0 + 8.0 + 3.0 = 197.0 MBFPD, below export pumps at 230.0')],
    capexPhases: [0.04], months: 2, onStream: '2027-Q2', costRef: 'COST-0004' },
  { tier: 4, status: 'sized', delta: 6.0, title: '1 × 6.0 MBFPD separator skid', headline: '1 × 6.0 MBFPD separator skid, sized to live residual of 4.3',
    lines: ['Class 5 cost KD 1.85M · 14 months · long-lead: vessel 9 months'], refs: ['COST-0007'],
    checks: [check('Smallest standard module covering residual', 'pass', 'Residual 4.3 MBFPD → 6.0 MBFPD skid (COST-0007); next size is 12.0'), check('Next-binding ceiling', 'pass', '186.0 + 8.0 + 3.0 + 6.0 = 203.0 MBFPD, below export pumps at 230.0 (RULE-R09)'), check('Cost class', 'flag', 'Class 5 indicative, −30% / +50% (RULE-R10)')],
    capexPhases: [0.74, 1.11], months: 14, onStream: '2028-Q1', costRef: 'COST-0007', protected: { oil: 3.03, quarters: 4 } },
  { tier: 5, status: 'not_required', delta: 0, headline: 'Not required', lines: ['Residual is 0.0 after Tier 4; no new facility or train is proposed'], refs: ['COST-0018'],
    checks: [check('Residual after debottleneck', 'pass', '0.0 MBFPD'), check('Avoided scope', 'info', 'New train, order of magnitude KD 12.00M (COST-0018), not triggered')] },
];

// Compact specs for the other gaps, keyed facility|service|episode.
// t1: [prj] · t2: [route, delta, receiving-note] · t3: [env, delta]  · tier 4 is sized automatically to the live residual.
const SPEC = {
  'GBS-02|gas|0': { t2none: 'GBS-02 is the terminal gas station; ROUTING REGISTER holds no alternate export route', t3: ['ENV-0021', 2.5] },
  'WTP-03|water|0': { t1: 'PRJ-113' },
  'BS-171|gas|0': { t2: ['ROUTE-0033', 2.5, 'BS-141 compressor stays within effective capacity after transfer, including the 3.2 MMSCFD arriving with ROUTE-0031'], t3: ['ENV-0020', 2.0] },
  'GC-24|gas|0': { t2none: 'ROUTE-0031 is already drawn in full by the liquid gap at this facility; no further transferable capacity', t2noneRefs: ['ROUTE-0031'], t3: ['ENV-0017', 1.0] },
  'GC-18|liquid|0': { t2: ['ROUTE-0017', 5.0, 'GC-21 re-evaluated after the ROUTE-0031 allocation and stays within effective capacity on all three streams', ['ROUTE-0031']], t3: ['ENV-0006', 3.0] },
  'GC-18|water|0': { t1: 'PRJ-109' },
  'GC-27|liquid|0': { t1: 'PRJ-121' },
  'GC-27|gas|0': { t2: ['ROUTE-0037', 0.5, 'BS-171 LP suction has headroom from Q1 2029, once its own breach has cleared'], t3: ['ENV-0018', 1.0] },
  'GC-18|gas|0': { t3: ['ENV-0008', 1.0] },
  'GC-27|water|0': { t2: ['ROUTE-0035', 5.0, 'disposal wells DW-11/12 within tested injectivity'], t3: ['ENV-0019', 2.0] },
  'WTP-03|water|1': { t2none: 'WTP-03 is the terminal water facility; upstream diversions are credited at the gathering centres', t3: ['ENV-0022', 8.0] },
  'GC-27|liquid|1': { t2: ['ROUTE-0028', 2.0, 'GC-21 has headroom on all three streams once the ROUTE-0031 transfer ends in Q4 2028', ['ROUTE-0031']], t3: ['ENV-0016', 1.0] },
  'GC-18|water|1': { t2: ['ROUTE-0034', 2.0, 'disposal wells DW-07/08 within tested injectivity'], t3: ['ENV-0007', 2.0] },
};

const MODULES = {}; // by component name → cost entries ascending
for (const c of cost) if (c.component && c.size) (MODULES[c.component] ??= []).push(c);
const GAS_ALT = { 'BS-171': 'ROUTE-0033' };

function buildCascade(g) {
  const hero = g.facilityId === 'GC-24' && g.service === 'liquid';
  const first = pidx(g.firstBreach), last = pidx(g.lastBreach);
  const key = `${g.facilityId}|${g.service}|${gaps.filter((x) => x.facilityId === g.facilityId && x.service === g.service).indexOf(g)}`;
  const spec = SPEC[key] ?? {};
  let tiers;
  if (hero) tiers = HERO.map((t) => ({ ...t }));
  else {
    tiers = [];
    // Tier 1
    const prj = spec.t1 ? reg(spec.t1) : null;
    if (prj) {
      const on = pidx(prj.onStream);
      const full = prj.delta >= g.peakGap;
      tiers.push({ tier: 1, status: 'applied', delta: prj.delta, title: `${prj.id} ${prj.title}`, headline: `${prj.id} ${prj.title}, on stream ${plabel(on)}`,
        lines: [full && on > last ? `adds ${f1(prj.delta)} from ${plabel(on)}, ending the breach; ${plabel(first)}–${plabel(last)} exposed until then` : `relieves ${f1(prj.delta)} from ${plabel(on)}`], refs: [prj.id],
        checks: [check('Project is committed and funded', 'pass', `${prj.id} status Approved in PROJECT REGISTER, capacity v2.8`), check('Breach persists before on-stream date', 'flag', `${plabel(first)}–${plabel(Math.min(last, on - 1))} carry the gap until ${plabel(on)}`)],
        capexPhases: [0], months: 0, onStream: prj.onStream, costNote: 'Committed — no incremental cost' });
    } else tiers.push({ tier: 1, status: 'not_available', delta: 0, headline: `No committed project adds capacity at ${g.bindingComponentName} during the breach`, lines: [], refs: [], checks: [check('PROJECT REGISTER searched', 'info', `No Approved entry adds capacity at ${g.facilityId} ${g.bindingComponentName} between ${plabel(first)} and ${plabel(last)}`)] });
    // Tier 2
    if (spec.t2) {
      const [rid, d, note, extraRefs = []] = spec.t2;
      const rt = reg(rid);
      const costRef = g.service === 'gas' ? 'COST-0005' : g.service === 'water' ? 'COST-0006' : 'COST-0003';
      tiers.push({ tier: 2, status: d < rt.maxDivert ? 'partial' : 'applied', delta: d, title: `Divert ${rt.title}`, headline: `Divert ${rt.title} (${rid})`,
        lines: [d < rt.maxDivert ? `${f1(d)} of ${f1(rt.maxDivert)} ${rt.unit} transferable; ${note}` : `MaxDivert ${f1(rt.maxDivert)} ${rt.unit} governs; ${note}`], refs: [rid, ...extraRefs, costRef],
        checks: [check('Feasible route in ROUTING REGISTER', 'pass', `${rid} ${rt.title}, MaxDivert ${f1(rt.maxDivert)} ${rt.unit}`), check('Receiving end after transfer', d < rt.maxDivert ? 'governs' : 'pass', note)],
        capexPhases: [reg(costRef).capexKDm], months: reg(costRef).months, onStream: pid(Math.max(first, tOf(0) + 1)), costRef });
    } else tiers.push({ tier: 2, status: 'exhausted', delta: 0, headline: 'No feasible route with transferable capacity', lines: [spec.t2none ?? 'ROUTING REGISTER holds no approved route from this facility with MaxDivert > 0'], refs: spec.t2noneRefs ?? [], checks: [check('ROUTING REGISTER searched', 'info', spec.t2none ?? 'No approved route with transferable capacity > 0')] });
    // Tier 3
    if (spec.t3) {
      const [eid, d, note] = spec.t3;
      const ev = reg(eid);
      tiers.push({ tier: 3, status: d < ev.releasable ? 'partial' : 'applied', delta: d, title: `Release ${g.bindingComponentName} margin`, headline: `Released margin on ${ev.title} (${eid}, approved ${ev.approvedDate})`,
        lines: [d < ev.releasable ? `${f1(d)} of ${f1(ev.releasable)} available; ${note}` : `${f1(ev.releasable)} ${ev.unit} released in full`], refs: [eid, 'COST-0004'],
        checks: [check('Envelope entry approved', 'pass', `${eid} approved ${ev.approvedDate} by ${ev.approvedBy}, ${ev.dept}`), check('Basis', 'info', ev.basis)],
        capexPhases: [0.04], months: 2, onStream: pid(first), costRef: 'COST-0004' });
    } else tiers.push({ tier: 3, status: 'exhausted', delta: 0, headline: 'No approved envelope release available', lines: [spec.t3none ?? `ENVELOPE REGISTER holds no unreserved margin at ${g.bindingComponentName}`], refs: [], checks: [check('ENVELOPE REGISTER searched', 'info', spec.t3none ?? 'No approved, unreserved margin at the binding component')] });
  }
  // residual chain; tier 4/5 for non-hero are sized to the live residual
  let residual = g.peakGap;
  const out = [];
  for (const t of tiers) {
    const before = residual;
    residual = r1(Math.max(0, residual - t.delta));
    out.push({ ...t, residualBefore: before, residualAfter: residual });
  }
  if (!hero) {
    const before = residual;
    if (residual > 0) {
      const mod = MODULES[g.bindingComponentName].find((m) => m.size >= residual) ?? MODULES[g.bindingComponentName].at(-1);
      const n = Math.ceil(residual / mod.size);
      const d = r1(n * mod.size);
      const nb = cp(g.facilityId, g.service, pidx(g.peakPeriod));
      residual = 0;
      const lead = Math.ceil(mod.months / 3);
      const onIdx = Math.max(first, lead + T0_INDEX); // just-in-time: on stream at first breach, or as early as the schedule allows
      const pad = Array(tOf(onIdx) - lead).fill(0);
      out.push({ tier: 4, status: 'sized', delta: d, residualBefore: before, residualAfter: 0, title: `${n} × ${mod.title.replace(/, \+?/, ' ').toLowerCase().replace(/^(.*?) (\d.*)$/, '$2 $1')}`.replace('mbfpd', 'MBFPD').replace('mmscfd', 'MMSCFD').replace('mbwpd', 'MBWPD'),
        headline: `${n} × ${f1(mod.size)} ${mod.fields.find((f) => f[0] === 'Module size')[1].split(' ')[1]} ${mod.title.split(',')[0].toLowerCase()}, sized to live residual of ${f1(before)}`,
        lines: [`Class 5 cost KD ${(n * mod.capexKDm).toFixed(2)}M · ${mod.months} months · long-lead: ${mod.longLead.item.toLowerCase()} ${mod.longLead.months} months`], refs: [mod.id],
        checks: [check('Smallest standard module covering residual', 'pass', `Residual ${f1(before)} ${g.unit} → ${n} × ${f1(mod.size)} (${mod.id})`),
          check('Next-binding ceiling', nb.mitigationCeiling != null && g.peakGap > nb.mitigationCeiling ? 'flag' : 'pass', nb.nextBindingCapacity != null ? `Next-binding component at ${f1(nb.nextBindingCapacity)} ${g.unit}; ceiling ${f1(nb.mitigationCeiling)} on any mitigation here (RULE-R09)` : 'Single-component chain'),
          check('Cost class', 'flag', 'Class 5 indicative, −30% / +50% (RULE-R10)')],
        capexPhases: [...pad, r2(n * mod.capexKDm * 0.4), r2(n * mod.capexKDm - r2(n * mod.capexKDm * 0.4))], months: mod.months, onStream: pid(Math.min(N - 1, onIdx)), costRef: mod.id, _onIdx: onIdx });
    } else out.push({ tier: 4, status: 'not_required', delta: 0, residualBefore: 0, residualAfter: 0, headline: 'Not required', lines: ['Residual is 0.0 after non-capital tiers; no capital option is proposed'], refs: [], checks: [check('Residual after operating envelope', 'pass', `0.0 ${g.unit}`)] });
    out.push({ tier: 5, status: 'not_required', delta: 0, residualBefore: 0, residualAfter: 0, headline: 'Not required', lines: ['Residual is 0.0; no new facility or train is proposed'], refs: [], checks: [check('Residual after debottleneck', 'pass', `0.0 ${g.unit}`)] });
  }
  // materialise options
  return out.map((t) => {
    const base = { tier: t.tier, name: TIER_NAME[t.tier], status: t.status, delta: t.delta, residualBefore: t.residualBefore, residualAfter: t.residualAfter, headline: t.headline, lines: t.lines, ruleId: TIER_RULE[t.tier], registerRefs: t.refs, checks: t.checks, optionId: null };
    if (!t.capexPhases) return base;
    const optionId = `OPT-${g.id.slice(4)}-T${t.tier}`;
    const onIdx = t._onIdx ?? pidx(t.onStream);
    // protected production: live residual relieved by this tier, over breach quarters after on-stream
    const relieved = r1(t.residualBefore - t.residualAfter);
    const peakIdx = pidx(g.peakPeriod);
    const protOil = t.protected?.oil ?? r2(oilEq(g.facilityId, g.service, peakIdx, relieved));
    const quarters = t.protected?.quarters ?? Math.max(0, last - Math.max(first, onIdx) + 1);
    const committed = t.tier === 1;
    const eco = economics({ capexPhases: t.capexPhases, onStreamT: tOf(Math.max(first, onIdx)), protectedOil: protOil, quarters });
    const cr = t.costRef ? reg(t.costRef) : null;
    options.push({
      id: optionId, gapId: g.id, tier: t.tier, tierName: TIER_NAME[t.tier], kind: t.tier >= 4 ? 'capital' : 'non-capital',
      title: t.title, capacityGain: t.delta, relievedAtPeak: relieved, unit: g.unit,
      costClass: committed ? null : 'Class 5', costRef: t.costRef ?? null, costNote: t.costNote ?? null,
      scheduleMonths: t.months, onStream: pid(Math.min(N - 1, Math.max(0, onIdx))), onStreamAfterBreach: onIdx > last,
      longLead: cr?.longLead ? [cr.longLead] : [],
      economics: committed ? null : eco,
      economicsNote: committed ? 'Committed project: cost is sunk and outside this screening comparison' : quarters === 0 ? 'On stream after the breach ends; protects no production in this gap' : 'Screening basis: peak residual held flat across the protected quarters',
      ruleId: TIER_RULE[t.tier], registerRefs: t.refs, origin: 'rule', retainedByDefault: true,
    });
    return { ...base, optionId };
  });
}

for (const g of gaps) {
  g.cascade = buildCascade(g);
  g.optionIds = g.cascade.map((t) => t.optionId).filter(Boolean);
  g.residualAfterCascade = g.cascade.at(-1).residualAfter;
}

// status + sentence
const STATUS = {}; // filled after plans
for (const g of gaps) {
  const c = fac(g.facilityId);
  const n = g.durationQuarters;
  g.sentence = `${g.bindingComponentName} at ${c.id} is forecast to exceed effective capacity of ${f1(g.capacityAtFirstBreach)} ${g.unit} from ${qLabel(g.firstBreach)}, peaking at ${f1(g.peakGap)} ${g.unit} over, for ${n} consecutive quarter${n > 1 ? 's' : ''}${g.openEnded ? ' to the end of the horizon' : ''}, placing ${f1(g.parOil)} MBOPD at risk.`;
}

// ───────────────────────── stack demo (LOCKED) ─────────────────────────
const stackDemo = {
  facilityId: 'GC-24', service: 'liquid', unit: 'MBFPD', baseline: 186.0,
  cases: [
    { id: 'sep', label: 'Separator +50 alone', nominal: 50.0, realised: 44.0, newEcMin: 230.0, note: 'pumps become binding' },
    { id: 'pumps', label: 'Pumps +30 alone', nominal: 30.0, realised: 0.0, newEcMin: 186.0, note: 'separator still binds' },
    { id: 'both', label: 'Both together', nominal: 80.0, realised: 50.0, newEcMin: 236.0, note: 'degasser at 240 is the ceiling' },
  ],
};

// ───────────────────────── plans ─────────────────────────
const hero = gapOf('GC-24', 'liquid');
const vint = Object.fromEntries(META.vintages.map((v) => [v.key, v.version]));
const basisOf = (g, optionId) => ({ analysisId: META.analysis.id, vintages: vint, scenario: META.cycle.name, gapId: g.id, optionId });
const appr = (name, role, status, date = null) => ({ name, role, status, date });
const plans = [];
function addPlan(id, g, tier, status, targetDate, pastTarget, createdDate, approvals, checklist) {
  const optionId = g.cascade.find((t) => t.tier === tier)?.optionId;
  if (!optionId) throw new Error(`plan ${id}: gap ${g.id} has no tier ${tier} option`);
  const o = options.find((x) => x.id === optionId);
  plans.push({ id, gapId: g.id, optionId, title: `${g.facilityId} — ${o.title}`, status, createdDate, createdBy: 'S. Rahman', targetApprovalDate: targetDate, pastTarget,
    scope: `${o.title} at ${g.facilityId} ${g.bindingComponentName} to relieve ${g.id} (${g.stream.toLowerCase()} gap, peak ${f1(g.peakGap)} ${g.unit}).`,
    capacityGain: o.capacityGain, unit: o.unit, costClass: 'Class 5', capexKDm: o.economics.capexKDm, scheduleMonths: o.scheduleMonths, longLead: o.longLead,
    decisionBasis: basisOf(g, optionId), checklist, approvals });
  return plans.at(-1);
}

const networkPar = (i) => r1(facilities.reduce((s, f) => s + Math.max(...f.services.map((sv) => cp(f.id, sv, i).parOil)), 0));
// ───────────────────────── summary print (first pass tuning aid) ─────────────────────────
if (process.argv.includes('--summary')) {
  for (const g of gaps) console.log(g.id, g.facilityId.padEnd(7), g.service.padEnd(6), g.bindingComponentName.padEnd(20), g.firstBreach, '→', g.lastBreach, `n=${g.durationQuarters}`.padEnd(5), `peak ${g.peakGap}`.padEnd(10), `par ${g.parOil}`.padEnd(9), `sev ${g.severity.score} ${g.severity.band}`.padEnd(16), g.cascade.map((t) => `${t.delta}→${t.residualAfter}`).join(' | '));
  console.log(PERIODS.map((p, i) => `${p.id}:${networkPar(i)}`).join(' '));
  console.log('gaps', gaps.length, 'facilities', new Set(gaps.map((g) => g.facilityId)).size, 'Σpar', r1(gaps.reduce((s, g) => s + g.parOil, 0)), 'options', options.length, 'non-capital', options.filter((o) => o.kind === 'non-capital').length);
}


// ───────────────────────── plans, statuses ─────────────────────────
const G = { hero, gbs: gapOf('GBS-02', 'gas'), g18l: gapOf('GC-18', 'liquid'), g24g: gapOf('GC-24', 'gas'), bs: gapOf('BS-171', 'gas') };
const ck = (label, done, by = null, date = null, note = null) => ({ label, done, by, date, note });
addPlan('PLN-0012', G.g24g, 3, 'Approved', '24 Oct 2026', false, '17 Oct 2026',
  [appr('A. Al-Mutairi', 'Facilities Engineering', 'Approved', '20 Oct 2026'), appr('J. Fernandes', 'Operations Technical Services', 'Approved', '21 Oct 2026'), appr('M. Khalil', 'Economics', 'Approved', '23 Oct 2026')],
  [ck('Gap validated by Facilities Engineering', true, 'A. Al-Mutairi', '19 Oct 2026'), ck('Envelope entry approved and unreserved', true, 'Operations Technical Services', '20 Oct 2026'), ck('Operating procedure revision issued', true, 'Operations Technical Services', '22 Oct 2026'), ck('MOC raised', true, 'J. Fernandes', '22 Oct 2026')]);
addPlan('PLN-0014', G.hero, 2, 'Awaiting approval', '30 Oct 2026', true, '18 Oct 2026',
  [appr('A. Al-Mutairi', 'Facilities Engineering', 'Approved', '21 Oct 2026'), appr('J. Fernandes', 'Operations Technical Services', 'Pending'), appr('M. Khalil', 'Economics', 'Pending')],
  [ck('Gap validated by Facilities Engineering', true, 'A. Al-Mutairi', '18 Oct 2026'), ck('Routing feasibility confirmed', true, 'Operations Technical Services', '20 Oct 2026'), ck('GC-21 receiving check accepted', true, 'A. Al-Mutairi', '21 Oct 2026'), ck('MOC raised', false, null, null, 'pending')]);
addPlan('PLN-0015', G.hero, 3, 'Awaiting approval', '30 Oct 2026', true, '18 Oct 2026',
  [appr('A. Al-Mutairi', 'Facilities Engineering', 'Approved', '22 Oct 2026'), appr('J. Fernandes', 'Operations Technical Services', 'Pending')],
  [ck('Gap validated by Facilities Engineering', true, 'A. Al-Mutairi', '18 Oct 2026'), ck('Envelope entry approved and unreserved', true, 'Operations Technical Services', '20 Oct 2026'), ck('Operating procedure revision issued', false, null, null, 'pending')]);
addPlan('PLN-0016', G.gbs, 4, 'Awaiting approval', '20 Nov 2026', false, '22 Oct 2026',
  [appr('A. Al-Mutairi', 'Facilities Engineering', 'Approved', '28 Oct 2026'), appr('M. Khalil', 'Economics', 'Pending'), appr('S. Rahman', 'Reservoir Management', 'Pending')],
  [ck('Gap validated by Facilities Engineering', true, 'A. Al-Mutairi', '24 Oct 2026'), ck('Class 5 estimate within screening tolerance', true, 'Economics', '27 Oct 2026'), ck('MOC raised', false, null, null, 'pending'), ck('Long-lead reservation (compressor package)', false, null, null, '11 month lead')]);
addPlan('PLN-0017', G.g18l, 2, 'Awaiting approval', '27 Nov 2026', false, '26 Oct 2026',
  [appr('A. Al-Mutairi', 'Facilities Engineering', 'Pending'), appr('J. Fernandes', 'Operations Technical Services', 'Pending')],
  [ck('Gap validated by Facilities Engineering', true, 'A. Al-Mutairi', '27 Oct 2026'), ck('Routing feasibility confirmed', false, null, null, 'pending')]);
// The plan the demo generates at step 10 — LOCKED checklist.
addPlan('PLN-0019', G.hero, 4, 'Draft', '27 Nov 2026', false, '05 Nov 2026',
  [appr('A. Al-Mutairi', 'Facilities Engineering', 'Pending'), appr('J. Fernandes', 'Operations Technical Services', 'Pending'), appr('M. Khalil', 'Economics', 'Pending'), appr('S. Rahman', 'Reservoir Management', 'Pending')],
  [ck('Gap validated by Facilities Engineering', true, 'A. Al-Mutairi', '18 Oct 2026'), ck('Routing feasibility confirmed', true, 'Operations Technical Services'), ck('Class 5 estimate within screening tolerance', true, 'Economics'),
   ck('MOC raised', false, null, null, 'pending'), ck('HAZOP scheduled', false, null, null, 'pending'), ck('FEED readiness confirmed', false, null, null, 'blocked by MOC'), ck('Long-lead reservation (separator vessel)', false, null, null, '9 month lead, order by Q1 2027')]);

const relieved = (g) => g.cascade[0].status === 'applied' && g.cascade[0].residualAfter === 0;
for (const g of gaps) {
  const ps = plans.filter((p) => p.gapId === g.id);
  g.status = relieved(g) ? 'Relieved by committed project' : ps.some((p) => p.status === 'Approved') ? 'Plan approved' : ps.length || g === G.bs ? 'Mitigation proposed' : 'Open';
  g.planIds = ps.map((p) => p.id);
}

// ───────────────────────── activity ─────────────────────────
const ev = (when, actor, verb, object, kind, ref = null) => ({ when, actor, dept: DEPT[actor] ?? 'System', verb, object, kind, ref });
const activity = [
  ev('05 Nov 2026 10:12', 'S. Rahman', 'drafted', 'PLN-0019 — GC-24 separator skid', 'plan', 'PLN-0019'),
  ev('04 Nov 2026 15:40', 'J. Fernandes', 'commented on', 'PLN-0014 — MOC reference still outstanding', 'plan', 'PLN-0014'),
  ev('02 Nov 2026 09:05', 'ISSPS', 'flagged', 'PLN-0014 and PLN-0015 past target approval date', 'system'),
  ev('28 Oct 2026 14:22', 'A. Al-Mutairi', 'approved', 'PLN-0016 — Facilities Engineering review', 'plan', 'PLN-0016'),
  ev('27 Oct 2026 11:31', 'M. Khalil', 'confirmed', 'Class 5 estimate for OPT-1042-T4 within screening tolerance', 'plan', 'PLN-0016'),
  ev('27 Oct 2026 08:50', 'A. Al-Mutairi', 'validated', `${G.g18l.id} — GC-18 export pumps`, 'gap', G.g18l.id),
  ev('26 Oct 2026 16:04', 'S. Rahman', 'submitted', 'PLN-0017 — GC-18 re-routing', 'plan', 'PLN-0017'),
  ev('23 Oct 2026 13:18', 'M. Khalil', 'approved', 'PLN-0012 — final approval', 'plan', 'PLN-0012'),
  ev('22 Oct 2026 10:47', 'S. Rahman', 'submitted', 'PLN-0016 — GBS-02 compressor module', 'plan', 'PLN-0016'),
  ev('22 Oct 2026 09:30', 'A. Al-Mutairi', 'approved', 'PLN-0015 — Facilities Engineering review', 'plan', 'PLN-0015'),
  ev('21 Oct 2026 15:12', 'J. Fernandes', 'approved', 'PLN-0012 — Operations review', 'plan', 'PLN-0012'),
  ev('21 Oct 2026 11:02', 'A. Al-Mutairi', 'accepted', 'GC-21 receiving check for ROUTE-0031 transfer', 'register', 'ROUTE-0031'),
  ev('20 Oct 2026 14:36', 'J. Fernandes', 'confirmed', 'Routing feasibility, ROUTE-0031', 'register', 'ROUTE-0031'),
  ev('18 Oct 2026 16:20', 'S. Rahman', 'submitted', 'PLN-0014 and PLN-0015 — GC-24 non-capital mitigations', 'plan', 'PLN-0014'),
  ev('18 Oct 2026 10:15', 'A. Al-Mutairi', 'validated', `${G.hero.id} — GC-24 HP separator train`, 'gap', G.hero.id),
  ev('17 Oct 2026 09:48', 'S. Rahman', 'submitted', 'PLN-0012 — GC-24 compressor envelope release', 'plan', 'PLN-0012'),
  ev('16 Oct 2026 09:42', 'S. Rahman', 'ran', 'Analysis ISSPS-2026-0147 — 14 gaps, 31 mitigations', 'analysis', 'ISSPS-2026-0147'),
  ev('16 Oct 2026 09:40', 'ISSPS', 'locked', 'Forecast v4.2 · Capacity v2.8 · Rules v1.14 · Economics v1.3 to ISSPS-2026-0147', 'system'),
  ev('12 Oct 2026 13:25', 'J. Fernandes', 'proposed', 'ENV-0023 — GC-18 desalter margin', 'register', 'ENV-0023'),
  ev('09 Oct 2026 15:54', 'J. Fernandes', 'proposed', 'DR-0049 — GC-27 export pumps', 'register', 'DR-0049'),
  ev('02 Oct 2026 12:00', 'S. Rahman', 'published', 'Forecast v4.2 — AAP-2027 Baseline', 'vintage'),
  ev('21 Sep 2026 10:30', 'J. Fernandes', 'versioned', 'Rule library v1.14 — RULE-R12 wording clarified', 'rules', 'RULE-R12'),
  ev('09 Sep 2026 14:10', 'M. Khalil', 'approved', 'COST-0007 — separator skid 6.0 MBFPD, Class 5', 'register', 'COST-0007'),
  ev('09 Sep 2026 14:02', 'M. Khalil', 'published', 'Economics v1.3 — netback and discount rate, KOC-supplied', 'vintage'),
  ev('14 Aug 2026 16:45', 'A. Al-Mutairi', 'published', 'Capacity v2.8', 'vintage'),
  ev('14 Aug 2026 11:20', 'A. Al-Mutairi', 'approved', 'DR-0042 — GC-24 HP separator train, δ 0.845', 'register', 'DR-0042'),
  ev('14 Aug 2026 11:20', 'ISSPS', 'superseded', 'DR-0029 by DR-0042', 'register', 'DR-0029'),
  ev('08 Jul 2026 09:15', 'A. Al-Mutairi', 'approved', 'DR-0034 and four other de-rating entries', 'register', 'DR-0034'),
  ev('18 Jun 2026 13:40', 'A. Al-Mutairi', 'approved', 'PRJ-121 — GC-27 desalter revamp', 'register', 'PRJ-121'),
  ev('12 May 2026 10:05', 'A. Al-Mutairi', 'approved', 'PRJ-118 — GC-24 separator upgrade', 'register', 'PRJ-118'),
];

// ───────────────────────── summary (Command Centre KPIs) ─────────────────────────
const netPar = PERIODS.map((p, i) => ({ period: p.id, parOil: networkPar(i) }));
const peakPar = netPar.reduce((a, b) => (b.parOil > a.parOil ? b : a));
const summary = {
  asOf: '05 Nov 2026',
  openGaps: gaps.length, facilitiesWithGaps: new Set(gaps.map((g) => g.facilityId)).size,
  earliestBreach: { period: hero.firstBreach, facilityId: hero.facilityId, componentName: hero.bindingComponentName, gapId: hero.id },
  productionAtRisk: { value: peakPar.parOil, period: peakPar.period, unit: 'MBOPD', definition: 'Sum of facility-level production at risk in the peak quarter, each facility at its governing stream; upstream and downstream overlap not netted (screening basis)', byPeriod: netPar },
  mitigations: { total: options.length, nonCapital: options.filter((o) => o.kind === 'non-capital').length, capital: options.filter((o) => o.kind === 'capital').length },
  plans: { awaitingApproval: plans.filter((p) => p.status === 'Awaiting approval').length, pastTarget: plans.filter((p) => p.status === 'Awaiting approval' && p.pastTarget).length },
};

// GC-21 receiving check for the hero transfer — LOCKED
const g21 = (s) => cp('GC-21', s, 1);
const transferOil = 9.5 / 1.42;
const receivingCheck = {
  routeId: 'ROUTE-0031', from: 'GC-24', to: 'GC-21', period: '2027-Q2', sourceGor: 480, sourceWor: 0.42, transfer: 9.5, unit: 'MBFPD',
  streams: [
    { service: 'liquid', headroom: r1(g21('liquid').ecMin - g21('liquid').forecast), unit: 'MBFPD', divisor: 1.42, oilEquivalent: 30.3, governs: false, added: 9.5, afterPct: r1(((g21('liquid').forecast + 9.5) / g21('liquid').ecMin) * 100) },
    { service: 'gas', headroom: r1(g21('gas').ecMin - g21('gas').forecast), unit: 'MMSCFD', divisor: 0.48, oilEquivalent: 8.3, governs: true, added: r1(transferOil * 0.48), afterPct: r1(((g21('gas').forecast + transferOil * 0.48) / g21('gas').ecMin) * 100) },
    { service: 'water', headroom: r1(g21('water').ecMin - g21('water').forecast), unit: 'MBWPD', divisor: 0.42, oilEquivalent: 57.1, governs: false, added: r1(transferOil * 0.42), afterPct: r1(((g21('water').forecast + transferOil * 0.42) / g21('water').ecMin) * 100) },
  ],
  maxDivert: 9.5, governsFinal: 'ROUTE-0031 MaxDivert',
};

write('meta.json', { ...META, periods: PERIODS, summary, stackDemo, receivingCheck });
write('facilities.json', facilities);
write('forecast.json', forecast);
write('capacity-periods.json', capacityPeriods);
write('gaps.json', gaps);
write('options.json', options);
write('registers.json', registers);
write('rules.json', rules);
write('plans.json', plans);
write('activity.json', activity);
if (process.argv.includes('--summary')) console.log(JSON.stringify(summary, (k, v) => (k === 'byPeriod' ? undefined : v)), JSON.stringify(receivingCheck.streams.map((s) => [s.headroom, s.afterPct])), JSON.stringify(options.find((o) => o.id === 'OPT-1041-T4').economics, (k, v) => (k === 'cashflow' ? undefined : v)));
console.log('data written to src/data');
