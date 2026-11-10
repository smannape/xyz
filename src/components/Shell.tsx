import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Layers, PanelLeftClose, PanelLeftOpen, TableProperties } from 'lucide-react';
import { meta } from '../data';
import { cx } from '../lib/format';
import { UiContext } from '../lib/ui';
import { EntryDrawer, TraceDrawer } from './Drawer';

const NAV = [
  { to: '/facility/GC-24', match: '/facility', label: 'Capacity ladder', icon: Layers },
  { to: '/gaps', match: '/gaps', label: 'Gap register', icon: TableProperties },
];
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } } };

function Menu({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', down); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button className="inline-flex items-center gap-1.5 h-7 px-2 rounded-sm text-body text-ink hover:bg-hover" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}<ChevronDown size={12} className="text-ink-3" />
      </button>
      {open && <div className="ticks absolute z-50 top-9 left-0 w-[300px] border border-line-strong bg-panel p-3" style={{ boxShadow: '0 12px 32px -8px rgba(0,0,0,.65)' }}>{children}</div>}
    </div>
  );
}
const Sep = () => <span className="w-px h-5 bg-line mx-1 shrink-0" />;

export function Shell() {
  const [collapsed, setCollapsed] = useState(() => (store.get('issps.rail') ?? (window.innerWidth < 1500 ? '1' : '0')) === '1');
  const [brand, setBrand] = useState(() => store.get('issps.brand') === 'hal');
  const [entry, setEntry] = useState<string | null>(null);
  const [trace, setTrace] = useState(false);
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);

  useEffect(() => { document.documentElement.toggleAttribute('data-brand', false); if (brand) document.documentElement.setAttribute('data-brand', 'hal'); store.set('issps.brand', brand ? 'hal' : ''); }, [brand]);
  useEffect(() => { store.set('issps.rail', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <UiContext.Provider value={{ openEntry: setEntry, openTrace: () => setTrace(true) }}>
      <div className="h-screen flex">
        <nav aria-label="Primary" className={cx('shrink-0 border-r border-line-subtle bg-raised flex flex-col transition-[width] duration-200', collapsed ? 'w-[52px]' : 'w-[196px]')}>
          <div className="h-12 flex items-center gap-2.5 px-3.5 border-b border-line-subtle overflow-hidden">
            <span className="w-[22px] h-[22px] shrink-0 grid place-items-center rounded-sm font-mono text-[11px] font-semibold" style={{ background: 'var(--accent)', color: brand ? '#fff' : '#06100f' }}>IS</span>
            {!collapsed && <span className="font-medium tracking-tight whitespace-nowrap">ISSPS</span>}
          </div>
          <ul className="p-2 space-y-0.5 flex-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.match);
              return (
                <li key={n.to}>
                  <NavLink to={n.to} title={collapsed ? n.label : undefined} aria-current={active ? 'page' : undefined}
                    className={cx('flex items-center gap-2.5 h-8 px-2 rounded-sm text-body whitespace-nowrap overflow-hidden transition-colors', active ? 'bg-hover text-ink' : 'text-ink-2 hover:text-ink hover:bg-hover')}
                    style={active ? { boxShadow: 'inset 2px 0 0 var(--accent)' } : undefined}>
                    <n.icon size={15} className="shrink-0" />{!collapsed && n.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
          <button className="m-2 h-8 px-2 flex items-center gap-2.5 rounded-sm text-ink-3 hover:text-ink hover:bg-hover text-dense whitespace-nowrap overflow-hidden" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {collapsed ? <PanelLeftOpen size={15} className="shrink-0" /> : <><PanelLeftClose size={15} className="shrink-0" />Collapse</>}
          </button>
        </nav>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* The governance story in one strip — always visible. */}
          <header className="h-12 shrink-0 flex items-center gap-1 px-3 border-b border-line-subtle bg-raised whitespace-nowrap">
            <Menu label={<span className="font-medium">{meta.asset.code}</span>}>
              <div className="eyebrow mb-2">Asset</div>
              <div className="flex items-center gap-2 text-body"><span className="w-1.5 h-1.5 rounded-full bg-accent" />{meta.asset.code} — {meta.asset.name}</div>
              <p className="mt-2 text-dense text-ink-3 leading-snug">8 facilities · 20 manifolds. This demonstration dataset covers one asset.</p>
            </Menu>
            <Sep />
            <Menu label={<><span className="text-ink-3">Cycle:</span> {meta.cycle.name}</>}>
              <div className="eyebrow mb-2">Planning cycle</div>
              <div className="flex items-center gap-2 text-body"><span className="w-1.5 h-1.5 rounded-full bg-accent" />{meta.cycle.name}</div>
              <dl className="mt-2.5 grid grid-cols-[72px_1fr] gap-y-1 text-dense">
                <dt className="text-ink-3">Scenario</dt><dd>{meta.cycle.scenario}</dd>
                <dt className="text-ink-3">Status</dt><dd>{meta.cycle.status}</dd>
                <dt className="text-ink-3">Horizon</dt><dd className="num">{meta.periods[0].label} – {meta.periods[15].label}</dd>
                <dt className="text-ink-3">Data as of</dt><dd className="num">{meta.summary.asOf}</dd>
              </dl>
            </Menu>
            <Sep />
            <button className="h-7 px-2 rounded-sm num text-dense text-ink-2 hover:bg-hover hover:text-ink" onClick={() => setTrace(true)} title="Open traceability">
              {meta.vintages.slice(0, 3).map((v, i) => <span key={v.key}>{i > 0 && <span className="text-ink-3"> · </span>}{v.label} <span className="text-ink">{v.version}</span></span>)}
            </button>
            <Sep />
            <button className="h-7 px-2 rounded-sm inline-flex items-center gap-2 num text-dense text-ink hover:bg-hover" onClick={() => setTrace(true)} title="Open traceability">
              <span className="relative w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-ok" /><span className="absolute inset-0 rounded-full bg-ok animate-ping opacity-60" /></span>
              {meta.analysis.id}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button className="btn !h-6" aria-pressed={brand} onClick={() => setBrand((b) => !b)} title="Presentation accent: switches the interface accent only; signal colours are unchanged">
                <span className="w-2 h-2 rounded-[1px]" style={{ background: brand ? '#c00000' : '#00d4c8' }} />{brand ? 'Halliburton accent' : 'Default accent'}
              </button>
              <span className="inline-flex items-center h-6 px-2 border font-mono uppercase text-warning" style={{ fontSize: 10.5, letterSpacing: '0.08em', borderColor: 'color-mix(in srgb, var(--signal-warning) 45%, transparent)' }}>Illustrative data</span>
            </div>
          </header>
          <main ref={main} className="flex-1 overflow-y-auto"><Outlet /></main>
        </div>
      </div>
      <EntryDrawer id={entry} onClose={() => setEntry(null)} />
      <TraceDrawer open={trace} onClose={() => setTrace(false)} />
    </UiContext.Provider>
  );
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-end gap-4 mb-4">
      <div className="min-w-0">
        <div className="eyebrow mb-1.5 flex items-center gap-1.5">{eyebrow}</div>
        <h1 className="text-title font-medium">{title}</h1>
        {sub && <div className="mt-1 text-body text-ink-2">{sub}</div>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
