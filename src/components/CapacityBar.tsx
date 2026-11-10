import { motion } from 'motion/react';
import { signalVar, type Signal } from '../lib/format';

const spring = { type: 'spring', stiffness: 260, damping: 32, mass: 0.8 } as const;

/**
 * One component on the shared scale of its chain: the track is the effective capacity,
 * the fill is the load, and any load beyond capacity is drawn as a hatched over-bar.
 */
export function CapacityBar({ load, capacity, scaleMax, signal }: { load: number; capacity: number; scaleMax: number; signal: Signal }) {
  const pct = (v: number) => `${(Math.min(v, scaleMax) / scaleMax) * 100}%`;
  const over = load > capacity;
  return (
    <div className="relative h-[18px]" role="img" aria-label={`Load ${load.toFixed(1)} against capacity ${capacity.toFixed(1)}`}>
      <motion.div className="absolute inset-y-0 left-0 rounded-[2px]" style={{ background: 'var(--bg-hover)', boxShadow: 'inset -1.5px 0 0 var(--text-secondary)' }} initial={false} animate={{ width: pct(capacity) }} transition={spring} />
      <motion.div className="absolute inset-y-0 left-0 rounded-l-[2px]" style={{ background: `color-mix(in srgb, ${signalVar[signal]} 62%, var(--bg-panel))` }} initial={false} animate={{ width: pct(Math.min(load, capacity)) }} transition={spring} />
      {over && (
        <motion.div className="absolute inset-y-0 hatch-critical rounded-r-[2px]" initial={false} animate={{ left: pct(capacity), width: `${((load - capacity) / scaleMax) * 100}%` }} transition={spring} />
      )}
      <motion.div className="absolute -inset-y-[5px] w-px" style={{ background: 'var(--text-primary)', opacity: 0.55 }} initial={false} animate={{ left: pct(load) }} transition={spring} />
    </div>
  );
}
