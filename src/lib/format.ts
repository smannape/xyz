export const f1 = (n: number) => n.toFixed(1);
export const f2 = (n: number) => n.toFixed(2);
export const pct0 = (n: number) => `${Math.round(n)}%`;
export const kd = (m: number) => `${m < 0 ? '−' : ''}KD ${Math.abs(m).toFixed(2)}M`;
export const signed = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(n).toFixed(1)}`;

export type Signal = 'critical' | 'warning' | 'ok' | 'info' | 'planned' | 'neutral';
/** Utilisation thresholds used everywhere a load is compared with a capacity. */
export const utilSignal = (pct: number): Signal => (pct > 100 ? 'critical' : pct >= 90 ? 'warning' : 'ok');
export const signalVar: Record<Signal, string> = {
  critical: 'var(--signal-critical)', warning: 'var(--signal-warning)', ok: 'var(--signal-ok)',
  info: 'var(--signal-info)', planned: 'var(--signal-planned)', neutral: 'var(--border-strong)',
};
export const streamVar = { oil: 'var(--stream-oil)', gas: 'var(--stream-gas)', water: 'var(--stream-water)', liquid: 'var(--stream-liquid)' } as const;
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
