import type { ReactNode } from 'react';
import { cx, signalVar, type Signal } from '../lib/format';

/** Monospace readout: label, value, unit, optional sub-label and signal colour. */
export function Metric({ label, value, unit, sub, signal, size = 'md' }: {
  label: string; value: ReactNode; unit?: string; sub?: ReactNode; signal?: Signal; size?: 'md' | 'lg';
}) {
  return (
    <div className="min-w-0">
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={cx('num font-medium leading-none', size === 'lg' ? 'text-kpi' : 'text-title')} style={signal && signal !== 'neutral' ? { color: signalVar[signal] } : undefined}>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-dense text-ink-3">{sub}</div>}
    </div>
  );
}
