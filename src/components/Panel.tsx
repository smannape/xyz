import type { ReactNode } from 'react';
import { cx } from '../lib/format';

/** A region of the one working surface: hairline border, instrument corner ticks, optional eyebrow. */
export function Panel({ eyebrow, title, actions, children, className, flush }: {
  eyebrow?: string; title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean;
}) {
  return (
    <section className={cx('ticks border border-line-subtle bg-raised', className)}>
      {(eyebrow || title || actions) && (
        <header className="flex items-center gap-3 px-4 h-10 border-b border-line-subtle">
          <div className="min-w-0 flex items-baseline gap-2.5">
            {eyebrow && <span className="eyebrow shrink-0">{eyebrow}</span>}
            {title && <h2 className="text-body text-ink-2 truncate">{title}</h2>}
          </div>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  );
}
