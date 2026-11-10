import { Link } from 'react-router-dom';
import { Panel } from '../components/Panel';

export function NotFound({ what = 'This address' }: { what?: string }) {
  return (
    <div className="p-5 max-w-xl">
      <Panel eyebrow="Not in this analysis">
        <p className="text-body text-ink-2">{what} does not match anything in analysis ISSPS-2026-0147.</p>
        <div className="mt-3 flex gap-2">
          <Link className="btn" to="/facility/GC-24?period=2027-Q2">GC-24 capacity ladder</Link>
          <Link className="btn" to="/gaps">Gap register</Link>
        </div>
      </Panel>
    </div>
  );
}
