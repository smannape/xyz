// Typed access to the precomputed dataset. JSON is imported directly so Vite
// inlines it into the bundle — the app makes no runtime network requests.
import metaJson from './meta.json';
import facilitiesJson from './facilities.json';
import forecastJson from './forecast.json';
import capacityJson from './capacity-periods.json';
import gapsJson from './gaps.json';
import optionsJson from './options.json';
import registersJson from './registers.json';
import rulesJson from './rules.json';
import plansJson from './plans.json';
import activityJson from './activity.json';
import type { ActivityEvent, CapacityPeriod, Facility, ForecastRow, Gap, Meta, Option, Plan, RegisterEntry, RegisterKey, Rule, Service, Vintage } from './types';

export const meta = metaJson as unknown as Meta;
export const facilities = facilitiesJson as unknown as Facility[];
export const forecast = forecastJson as unknown as ForecastRow[];
export const capacityPeriods = capacityJson as unknown as CapacityPeriod[];
export const gaps = gapsJson as unknown as Gap[];
export const options = optionsJson as unknown as Option[];
export const registers = registersJson as unknown as Record<RegisterKey, RegisterEntry[]>;
export const rules = rulesJson as unknown as Rule[];
export const plans = plansJson as unknown as Plan[];
export const activity = activityJson as unknown as ActivityEvent[];

export const periods = meta.periods;
export const HERO_PERIOD = '2027-Q2';
export const REGISTER_NAME: Record<RegisterKey, string> = {
  derating: 'DE-RATING REGISTER', routing: 'ROUTING REGISTER', envelope: 'ENVELOPE REGISTER', cost: 'COST REGISTER', project: 'PROJECT REGISTER',
};
export const SERVICE_LABEL: Record<Service, string> = { liquid: 'Liquid', gas: 'Gas', water: 'Water' };

const entryIndex = new Map(Object.values(registers).flat().map((e) => [e.id, e]));
const ruleIndex = new Map(rules.map((r) => [r.id, r]));
const cpIndex = new Map(capacityPeriods.map((r) => [`${r.facilityId}|${r.service}|${r.period}`, r]));
const fcIndex = new Map(forecast.map((r) => [`${r.facilityId}|${r.period}`, r]));

export const getFacility = (id?: string) => facilities.find((f) => f.id === id);
export const getGap = (id?: string) => gaps.find((g) => g.id === id);
export const getOption = (id?: string | null) => options.find((o) => o.id === id);
export const getEntry = (id?: string | null) => (id ? entryIndex.get(id) : undefined);
export const getRule = (id?: string | null) => (id ? ruleIndex.get(id) : undefined);
export const getCapacity = (facilityId: string, service: Service, period: string) => cpIndex.get(`${facilityId}|${service}|${period}`);
export const getForecast = (facilityId: string, period: string) => fcIndex.get(`${facilityId}|${period}`);
export const getPeriod = (id: string) => periods.find((p) => p.id === id);
/** '2027-Q2' → 'Q2 2027'; also valid for dates beyond the 16-quarter horizon. */
export const periodLabel = (id: string) => { const [y, q] = id.split('-'); return `${q} ${y}`; };
export const vintage = (key: Vintage['key']) => meta.vintages.find((v) => v.key === key)!;
export const vintageTag = (key: Vintage['key']) => `${key} ${vintage(key).version}`;
export const gapAt = (facilityId: string, service: Service, period: string) => {
  const i = getPeriod(period)?.index ?? -1;
  return gaps.find((g) => g.facilityId === facilityId && g.service === service && getPeriod(g.firstBreach)!.index <= i && i <= getPeriod(g.lastBreach)!.index);
};
export const facilityUtilisation = (facilityId: string, period: string) =>
  Math.max(...getFacility(facilityId)!.services.map((s) => getCapacity(facilityId, s, period)!.utilisationPct));
