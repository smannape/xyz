import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cx, signalVar, type Signal } from '../lib/format';

export interface Column<T> {
  key: string; header: string; align?: 'left' | 'right'; width?: string;
  sortValue?: (row: T) => number | string; render: (row: T) => ReactNode;
}
/** Dense sortable table: sticky header, tabular numerals, left-border status, whole-row navigation. */
export function DataTable<T>({ rows, columns, rowKey, onRowClick, rowSignal, initialSort, empty }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void;
  rowSignal?: (row: T) => Signal; initialSort?: { key: string; dir: 1 | -1 }; empty?: ReactNode;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const x = col.sortValue!(a), y = col.sortValue!(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort!.dir;
    });
  }, [rows, sort, columns]);

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-dense">
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th key={c.key} style={{ width: c.width }} aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : undefined}
                  className={cx('sticky top-0 z-10 bg-raised border-b border-line h-8 px-3 font-normal whitespace-nowrap', c.align === 'right' ? 'text-right' : 'text-left')}>
                  {c.sortValue ? (
                    <button className={cx('eyebrow inline-flex items-center gap-1 hover:text-ink-2', active && '!text-ink')} onClick={() => setSort(active ? { key: c.key, dir: sort!.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })}>
                      {c.header}
                      {active ? (sort!.dir === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <span className="w-[10px]" />}
                    </button>
                  ) : <span className="eyebrow">{c.header}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} tabIndex={onRowClick ? 0 : undefined} role={onRowClick ? 'link' : undefined}
              onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-no-row-click]')) onRowClick?.(row); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick?.(row); }}
              className={cx('border-b border-line-subtle h-9 transition-colors', onRowClick && 'cursor-pointer hover:bg-hover focus-visible:bg-hover')}>
              {columns.map((c, i) => (
                <td key={c.key} className={cx('px-3 whitespace-nowrap', c.align === 'right' && 'text-right')}
                  style={i === 0 && rowSignal ? { boxShadow: `inset 2px 0 0 ${signalVar[rowSignal(row)]}` } : undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-ink-3">{empty ?? 'No rows match the current filters.'}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
