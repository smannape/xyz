import { signalVar, type Signal } from '../lib/format';
import type { SeverityBand } from '../data/types';

const BAND: Record<SeverityBand, { n: number; signal: Signal }> = {
  Low: { n: 1, signal: 'planned' }, Medium: { n: 2, signal: 'warning' }, High: { n: 3, signal: 'warning' }, Critical: { n: 4, signal: 'critical' },
};
/** Severity as four segments — never a word alone, never a pie. */
export function SeverityBar({ band, score }: { band: SeverityBand; score?: number }) {
  const { n, signal } = BAND[band];
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`Severity ${band}${score != null ? `, score ${score}` : ''}`}>
      <span className="inline-flex gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="w-[7px] h-3 rounded-[1px]" style={{ background: i < n ? signalVar[signal] : 'var(--border-default)' }} />
        ))}
      </span>
      {score != null && <span className="num text-dense text-ink-2">{score}</span>}
    </span>
  );
}
