import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { facilities, gaps, getEntry, getRule, meta, options, REGISTER_NAME } from '../data';
import { StatusChip } from './StatusChip';
import { useUi } from '../lib/ui';

export function Drawer({ open, onClose, eyebrow, title, children }: { open: boolean; onClose: () => void; eyebrow: string; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true" aria-label={eyebrow}
            className="fixed z-[70] top-0 right-0 h-full w-[460px] bg-raised border-l border-line flex flex-col"
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}>
            <header className="flex items-start gap-3 px-5 pt-4 pb-3.5 border-b border-line-subtle">
              <div className="min-w-0">
                <div className="eyebrow mb-1.5">{eyebrow}</div>
                <h2 className="text-section font-medium leading-snug">{title}</h2>
              </div>
              <button className="btn ml-auto !px-1.5" onClick={onClose} aria-label="Close" autoFocus><X size={14} /></button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            <footer className="px-5 h-9 flex items-center border-t border-line-subtle eyebrow !text-warning">Illustrative data</footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const Row = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="grid grid-cols-[128px_1fr] gap-3 py-2 border-b border-line-subtle text-dense">
    <dt className="eyebrow pt-[2px]">{k}</dt>
    <dd className="text-ink leading-snug">{children}</dd>
  </div>
);
const Section = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mt-5"><div className="eyebrow mb-2">{label}</div>{children}</div>
);

/** Rules are shown in readable form, never as code. */
export function RuleBlock({ id }: { id: string }) {
  const r = getRule(id);
  if (!r) return null;
  return (
    <div className="border border-line-subtle bg-base">
      <div className="flex items-baseline gap-2 px-3 h-8 border-b border-line-subtle">
        <span className="num text-dense text-ink">{r.id}</span>
        <span className="text-dense text-ink-2 truncate">{r.name}</span>
        <span className="ml-auto num text-micro text-ink-3 whitespace-nowrap">{r.version} · {r.status}</span>
      </div>
      <dl className="px-3 py-2.5 grid grid-cols-[44px_1fr] gap-x-3 gap-y-1.5 text-dense leading-snug">
        <dt className="eyebrow pt-[2px]">When</dt><dd className="text-ink-2">{r.when}</dd>
        {r.and.map((a) => (<div key={a} className="contents"><dt className="eyebrow pt-[2px]">And</dt><dd className="text-ink-2">{a}</dd></div>))}
        <dt className="eyebrow pt-[2px] !text-accent">Then</dt><dd className="text-ink">{r.then}</dd>
      </dl>
    </div>
  );
}

export function EntryDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const ui = useUi();
  const e = getEntry(id);
  const r = !e ? getRule(id) : undefined;
  const usedBy = id ? gaps.filter((g) => g.cascade.some((t) => t.registerRefs.includes(id) || t.ruleId === id)) : [];
  const usedOptions = id ? options.filter((o) => o.registerRefs.includes(id) || o.costRef === id).length : 0;
  const component = e?.componentId ? facilities.flatMap((f) => f.components).find((c) => c.id === e.componentId) : undefined;
  return (
    <Drawer open={Boolean(e || r)} onClose={onClose} eyebrow={e ? REGISTER_NAME[e.register] : 'RULE LIBRARY'}
      title={e ? <><span className="num">{e.id}</span> <span className="text-ink-2 font-normal">— {e.title}</span></> : r ? <><span className="num">{r.id}</span> <span className="text-ink-2 font-normal">— {r.name}</span></> : ''}>
      {e && (
        <>
          <div className="flex items-center gap-2 mb-3"><StatusChip status={e.status} /><span className="num text-micro text-ink-3">{e.vintage}</span></div>
          <dl>
            {e.fields.map(([k, v]) => <Row key={k} k={k}><span className="num">{v}</span></Row>)}
            <Row k="Basis">{e.basis}</Row>
            {e.status === 'Proposed'
              ? <Row k="Proposed by">{e.proposedBy} · {e.dept} · <span className="num">{e.submittedDate}</span> — awaiting approval; not used by the analysis</Row>
              : <Row k={e.status === 'Superseded' ? 'Was approved by' : 'Approved by'}>{e.approvedBy} · {e.dept} · <span className="num">{e.approvedDate}</span></Row>}
            {e.supersededBy && <Row k="Superseded by"><button className="chip" onClick={() => ui.openEntry(e.supersededBy!)}>{e.supersededBy}</button></Row>}
            {e.supersedes && <Row k="Supersedes"><button className="chip" onClick={() => ui.openEntry(e.supersedes!)}>{e.supersedes}</button></Row>}
            {component && e.facilityId && <Row k="Component"><Link className="text-accent hover:underline" to={`/facility/${e.facilityId}?service=${component.service}`} onClick={onClose}>{e.facilityId} capacity ladder</Link></Row>}
          </dl>
        </>
      )}
      {r && <RuleBlock id={r.id} />}
      {(e || r) && (
        <Section label={`Read by analysis ${meta.analysis.id}`}>
          {usedBy.length === 0
            ? <p className="text-dense text-ink-3">{e?.status === 'Approved' ? 'Held in the locked vintage; no cascade tier read this entry in the current analysis.' : e ? 'Not read: only Approved entries in the locked vintage are used.' : 'No cascade tier fired this rule in the current analysis; it governs calculation steps upstream of the cascade.'}</p>
            : (
              <ul className="border-t border-line-subtle">
                {usedBy.map((g) => (
                  <li key={g.id}>
                    <Link to={`/gaps/${g.id}`} onClick={onClose} className="flex items-center gap-3 h-8 border-b border-line-subtle text-dense hover:bg-hover px-1">
                      <span className="num text-ink">{g.id}</span><span className="text-ink-2 truncate">{g.facilityId} · {g.stream} · {g.bindingComponentName}</span>
                      <ArrowRight size={12} className="ml-auto text-ink-3 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          {usedOptions > 0 && <p className="mt-2 text-dense text-ink-3">Referenced by <span className="num text-ink-2">{usedOptions}</span> mitigation option{usedOptions > 1 ? 's' : ''}.</p>}
        </Section>
      )}
    </Drawer>
  );
}

/** The four vintages everything on screen is locked to. */
export function TraceDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const a = meta.analysis;
  return (
    <Drawer open={open} onClose={onClose} eyebrow="Traceability" title={<span className="num">{a.id}</span>}>
      <div className="flex items-center gap-2 mb-3"><StatusChip status={a.status} /><span className="text-dense text-ink-2">Every figure on screen is computed from the four vintages below.</span></div>
      <dl>
        <Row k="Cycle">{meta.cycle.name}</Row>
        <Row k="Asset">{meta.asset.code} — {meta.asset.name}</Row>
        <Row k="Run">{a.runBy} · <span className="num">{a.runAt}</span></Row>
        <Row k="Horizon"><span className="num">{meta.periods[0].label} – {meta.periods[meta.periods.length - 1].label}</span> · 16 quarters</Row>
        <Row k="Result"><span className="num">{meta.summary.openGaps}</span> gaps · <span className="num">{meta.summary.mitigations.total}</span> mitigations</Row>
      </dl>
      <Section label="Locked vintages">
        <div className="space-y-2">
          {meta.vintages.map((v) => (
            <div key={v.key} className="border border-line-subtle bg-base px-3 py-2.5">
              <div className="flex items-baseline gap-2"><span className="text-body text-ink">{v.label}</span><span className="num text-body text-accent">{v.version}</span></div>
              <p className="mt-1 text-dense text-ink-2 leading-snug">{v.description}</p>
              <p className="mt-1.5 text-micro text-ink-3">Approved {v.approvedBy} · {v.dept} · <span className="num">{v.approvedDate}</span></p>
            </div>
          ))}
        </div>
      </Section>
      <p className="mt-5 text-dense text-ink-3 leading-snug">Changing any vintage requires a new analysis run with a new ID. Plans freeze this basis at the moment they are generated.</p>
    </Drawer>
  );
}
