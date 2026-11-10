import { signalVar, type Signal } from '../lib/format';

const MAP: Record<string, Signal> = {
  Open: 'critical', 'Mitigation proposed': 'warning', 'Plan approved': 'ok', 'Relieved by committed project': 'planned',
  Approved: 'ok', Proposed: 'warning', Superseded: 'planned', Draft: 'planned', 'Awaiting approval': 'warning', Pending: 'planned', Locked: 'info',
};
export function StatusChip({ status }: { status: string }) {
  const s = MAP[status] ?? 'neutral';
  return (
    <span className="inline-flex items-center gap-1.5 h-[20px] px-2 rounded-sm border border-line text-micro text-ink-2 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: signalVar[s] }} />
      {status}
    </span>
  );
}
