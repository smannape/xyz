import type { HTMLAttributes, ReactNode } from 'react';
import { cx, signalVar, type Signal } from '../lib/format';

/** Status is a 2px left border in the signal colour; the background stays neutral. */
export function SignalRow({ signal, children, className, dim, ...rest }: { signal: Signal; children: ReactNode; dim?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx('border-l-2 transition-opacity duration-200', dim && 'opacity-40', className)} style={{ borderLeftColor: signalVar[signal] }}>
      {children}
    </div>
  );
}
