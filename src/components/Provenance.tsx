import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';
import { provEntry, type ProvRecord } from '../lib/provenance';
import { useUi } from '../lib/ui';
import { cx } from '../lib/format';

const W = 372;

/**
 * Any figure derived from a register or rule. Dotted underline; hover, focus or tap
 * opens a compact popover with source, value, basis, approval and vintage.
 * `chip` renders a register/rule ID that opens its entry on click.
 */
export function Provenance({ p, children, className, chip }: { p: ProvRecord; children: ReactNode; className?: string; chip?: boolean }) {
  const ui = useUi();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const target = p.entryId ?? p.ruleId;

  const show = useCallback((delay = 110) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), delay); }, []);
  const hide = useCallback((delay = 140) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { setOpen(false); setPinned(false); }, delay); }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const h = pop.current?.offsetHeight ?? 170;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    const below = r.bottom + 6;
    setPos({ left, top: below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setPinned(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  const activate = () => {
    if (chip && target) { setOpen(false); ui.openEntry(target); return; }
    window.clearTimeout(timer.current);
    if (open && pinned) { setOpen(false); setPinned(false); } else { setOpen(true); setPinned(true); }
  };
  const common = {
    ref: trigger as never, 'data-open': open, 'data-no-row-click': true, 'aria-expanded': open,
    onMouseEnter: () => show(), onMouseLeave: () => { if (!pinned) hide(); },
    onFocus: () => show(0), onBlur: () => { if (!pinned) hide(); },
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); activate(); },
  };

  return (
    <>
      {chip ? (
        <button type="button" {...common} className={cx('chip', className)} aria-label={`${p.title}. Open entry`}>{children}</button>
      ) : (
        <span {...common} role="button" tabIndex={0} className={cx('prov', className)} aria-label={`${p.title}. Show provenance`}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}>{children}</span>
      )}
      {open && createPortal(
        <div ref={pop} role="dialog" aria-label="Provenance" onMouseEnter={() => window.clearTimeout(timer.current)} onMouseLeave={() => { if (!pinned) hide(); }}
          className="ticks fixed z-[80] border border-line-strong bg-panel text-left font-sans"
          style={{ width: W, left: pos?.left ?? -9999, top: pos?.top ?? -9999, boxShadow: '0 12px 32px -8px rgba(0,0,0,.65)', visibility: pos ? 'visible' : 'hidden', whiteSpace: 'normal' }}>
          <div className="px-3 pt-2.5 pb-2 border-b border-line-subtle num text-dense text-ink leading-snug">{p.title}</div>
          <dl className="px-3 py-2.5 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-dense">
            {p.rows.map(([k, v]) => (
              <Fragment key={k}>
                <dt className="eyebrow pt-[2px]">{k}</dt>
                <dd className={cx('text-ink-2 leading-snug', (k === 'Source' || k === 'Value' || k === 'Vintage' || k === 'Projects') && 'num text-ink')}>{v}</dd>
              </Fragment>
            ))}
          </dl>
          {target && (
            <div className="px-3 pb-2.5 flex justify-end">
              <button className="inline-flex items-center gap-1 text-dense text-accent hover:underline" onClick={() => { setOpen(false); setPinned(false); ui.openEntry(target); }}>
                {p.entryId ? 'Open register entry' : 'Open rule'} <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

/** A register or rule ID as a clickable chip with its provenance on hover. */
export function RefChip({ id, className }: { id: string; className?: string }) {
  return <Provenance chip p={provEntry(id)} className={className}>{id}</Provenance>;
}

const ID = /\b((?:DR|ROUTE|ENV|COST|PRJ)-\d+|RULE-R\d+)\b/g;
/** Text in which every register or rule ID becomes a RefChip. */
export function RefText({ text }: { text: string }) {
  const parts = text.split(ID);
  return <>{parts.map((s, i) => (i % 2 ? <RefChip key={i} id={s} className="mx-0.5" /> : <Fragment key={i}>{s}</Fragment>))}</>;
}
