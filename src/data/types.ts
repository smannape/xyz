export type Service = 'liquid' | 'gas' | 'water';
export type Unit = 'MBFPD' | 'MMSCFD' | 'MBWPD' | 'MBOPD';

export interface Period { id: string; label: string; index: number }
export interface Vintage { key: 'forecast' | 'capacity' | 'rules' | 'economics'; label: string; version: string; description: string; approvedBy: string; dept: string; approvedDate: string }

export interface Component {
  id: string; name: string; service: Service; unit: Unit; order: number;
  nameplate: number; derating: number; deratingRef: string | null; derated: number; effective: number;
  config: { installed: number; unitCapacity: number; spare: number; text: string } | null;
}
export interface Facility { id: string; name: string; type: string; map: { x: number; y: number }; services: Service[]; outbound: { stream: 'oil' | 'gas' | 'water'; to: string }[]; components: Component[] }

export interface ForecastRow {
  facilityId: string; period: string;
  oil: number | null; gas: number | null; water: number | null; liquid: number | null;
  gor: number | null; wor: number | null; upstreamOil: number | null;
  contributorBasis: Service; contributors: Record<string, number>;
}
export interface CapacityPeriod {
  facilityId: string; service: Service; unit: Unit; period: string;
  forecast: number; ecMin: number; bindingComponentId: string;
  nextBindingComponentId: string | null; nextBindingCapacity: number | null; mitigationCeiling: number | null;
  utilisationPct: number; gap: number; parOil: number;
  chain: { componentId: string; effective: number; projects: string[] }[];
}

export type TierStatus = 'applied' | 'partial' | 'sized' | 'exhausted' | 'not_available' | 'not_required';
export interface Check { label: string; result: 'pass' | 'flag' | 'governs' | 'info'; detail: string }
export interface CascadeTier {
  tier: 1 | 2 | 3 | 4 | 5; name: string; status: TierStatus; delta: number;
  residualBefore: number; residualAfter: number; headline: string; lines: string[];
  ruleId: string; registerRefs: string[]; checks: Check[]; optionId: string | null;
}
export type GapStatus = 'Open' | 'Mitigation proposed' | 'Plan approved' | 'Relieved by committed project';
export type SeverityBand = 'Low' | 'Medium' | 'High' | 'Critical';
export interface Gap {
  id: string; facilityId: string; service: Service; stream: string; unit: Unit;
  bindingComponentId: string; bindingComponentName: string;
  firstBreach: string; lastBreach: string; openEnded: boolean; durationQuarters: number;
  peakPeriod: string; peakGap: number; peakForecast: number; capacityAtPeak: number; capacityAtFirstBreach: number;
  utilisationPct: number; parOil: number;
  severity: { score: number; band: SeverityBand; segments: number; magnitude: number; duration: number; proximity: number };
  profile: { period: string; gap: number; parOil: number }[];
  cascade: CascadeTier[]; optionIds: string[]; residualAfterCascade: number;
  sentence: string; status: GapStatus; planIds: string[];
}

export interface Economics {
  capexKDm: number; capexPhases: number[]; onStreamT: number; protectedOil: number; protectedQuarters: number;
  revenuePerQuarterKDm: number; pvProtectedKDm: number; pvCapexKDm: number; npvKDm: number;
  paybackQuarters: number | null; costPerBblKD: number | null; doNothingKDm: number;
  cashflow: { t: number; kind: string; amount: number; discountFactor: number; pv: number }[];
}
export interface Option {
  id: string; gapId: string; tier: number; tierName: string; kind: 'capital' | 'non-capital';
  title: string; capacityGain: number; relievedAtPeak: number; unit: Unit;
  costClass: string | null; costRef: string | null; costNote: string | null;
  scheduleMonths: number; onStream: string; onStreamAfterBreach: boolean;
  longLead: { item: string; months: number }[];
  economics: Economics | null; economicsNote: string;
  ruleId: string; registerRefs: string[]; origin: 'rule' | 'engineer'; retainedByDefault: boolean;
}

export type RegisterKey = 'derating' | 'routing' | 'envelope' | 'cost' | 'project';
export interface RegisterEntry {
  id: string; register: RegisterKey; title: string; status: 'Approved' | 'Proposed' | 'Superseded';
  approvedBy: string | null; dept: string; proposedBy: string | null; approvedDate: string | null; submittedDate: string | null;
  vintage: string; valueText: string; basis: string; fields: [string, string][];
  facilityId?: string; componentId?: string | null; supersededBy?: string; supersedes?: string;
  delta?: number; unit?: Unit; onStream?: string; affectsCapacity?: boolean;
  from?: string; normal?: string; alternate?: string; maxDivert?: number; releasable?: number;
  capexKDm?: number; months?: number;
}
export interface Rule { id: string; name: string; version: string; status: string; tier: number | null; when: string; and: string[]; then: string }

export interface Plan {
  id: string; gapId: string; optionId: string; title: string; status: 'Draft' | 'Awaiting approval' | 'Approved';
  createdDate: string; createdBy: string; targetApprovalDate: string; pastTarget: boolean; scope: string;
  capacityGain: number; unit: Unit; costClass: string; capexKDm: number; scheduleMonths: number;
  longLead: { item: string; months: number }[];
  decisionBasis: { analysisId: string; vintages: Record<string, string>; scenario: string; gapId: string; optionId: string };
  checklist: { label: string; done: boolean; by: string | null; date: string | null; note: string | null }[];
  approvals: { name: string; role: string; status: string; date: string | null }[];
}
export interface ActivityEvent { when: string; actor: string; dept: string; verb: string; object: string; kind: string; ref: string | null }

export interface Meta {
  asset: { code: string; name: string };
  cycle: { id: string; name: string; scenario: string; status: string };
  analysis: { id: string; runAt: string; runBy: string; status: string };
  vintages: Vintage[];
  horizon: { first: string; last: string; t0: string };
  economicBasis: { netbackKDperBbl: number; discountRatePct: number; daysPerQuarter: number; source: string };
  periods: Period[];
  summary: {
    asOf: string; openGaps: number; facilitiesWithGaps: number;
    earliestBreach: { period: string; facilityId: string; componentName: string; gapId: string };
    productionAtRisk: { value: number; period: string; unit: string; definition: string; byPeriod: { period: string; parOil: number }[] };
    mitigations: { total: number; nonCapital: number; capital: number };
    plans: { awaitingApproval: number; pastTarget: number };
  };
  stackDemo: { facilityId: string; service: Service; unit: Unit; baseline: number; cases: { id: string; label: string; nominal: number; realised: number; newEcMin: number; note: string }[] };
  receivingCheck: {
    routeId: string; from: string; to: string; period: string; transfer: number; unit: Unit;
    streams: { service: Service; headroom: number; unit: Unit; divisor: number; oilEquivalent: number; governs: boolean; added: number; afterPct: number }[];
  };
}
