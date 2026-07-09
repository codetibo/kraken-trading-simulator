'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Settings2 } from 'lucide-react';
import { useResponsive, type Breakpoint } from '@/hooks/useResponsive';

export interface ColumnDef {
  key: string;
  label: string;
  /** Whether to show on each breakpoint. Defaults to true for desktop, tablet, mobile. */
  defaultDesktop?: boolean;
  defaultTablet?: boolean;
  defaultMobile?: boolean;
}

function getDefaultVisibleColumns(
  columns: ColumnDef[],
  breakpoint: Breakpoint,
): string[] {
  return columns
    .filter((col) => {
      if (breakpoint === 'desktop') return col.defaultDesktop !== false;
      if (breakpoint === 'tablet') return col.defaultTablet !== false;
      return col.defaultMobile !== false;
    })
    .map((col) => col.key);
}

interface ColumnChooserProps {
  /** Column definitions */
  columns: ColumnDef[];
  /** localStorage key for persistence (should be unique per table) */
  storageKey: string;
  /** Currently visible column keys */
  visible: string[];
  /** Called when visibility changes */
  onChange: (keys: string[]) => void;
  /** Optional className */
  className?: string;
}

export function ColumnChooser({
  columns,
  storageKey,
  visible,
  onChange,
  className,
}: ColumnChooserProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const breakpoint = useResponsive();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleColumn = (key: string) => {
    // Prevent hiding the last visible column
    if (visible.length <= 1 && visible.includes(key)) return;
    const next = visible.includes(key)
      ? visible.filter((k) => k !== key)
      : [...visible, key];
    onChange(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // localStorage unavailable
    }
  };

  const handleReset = () => {
    const defaults = getDefaultVisibleColumns(columns, breakpoint);
    onChange(defaults);
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        onClick={() => setOpen(!open)}
        className='flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
        title='Toggle columns'
        aria-label='Toggle visible columns'
        aria-expanded={open}
      >
        <Settings2 className='h-3.5 w-3.5' />
      </button>

      {open && (
        <div className='absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-lg'>
          <div className='border-b border-border px-3 py-1.5'>
            <p className='text-[11px] font-medium text-foreground'>Columns</p>
          </div>
          <div className='py-1'>
            {columns.map((col) => {
              const isVisible = visible.includes(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  disabled={visible.length <= 1 && isVisible}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                    'hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                    isVisible
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                    visible.length <= 1 && isVisible && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors',
                      isVisible
                        ? 'border-accent bg-accent'
                        : 'border-border',
                    )}
                  >
                    {isVisible && (
                      <svg
                        width='8'
                        height='8'
                        viewBox='0 0 8 8'
                        fill='none'
                        className='text-accent-foreground'
                      >
                        <path
                          d='M1.5 4L3.5 6L6.5 2'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    )}
                  </span>
                  {col.label}
                </button>
              );
            })}
          </div>
          <div className='border-t border-border px-3 py-1.5'>
            <button
              onClick={handleReset}
              className='w-full rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing column visibility with localStorage persistence and responsive defaults.
 */
export function useColumns(
  columnDefs: ColumnDef[],
  storageKey: string,
): {
  visibleColumns: string[];
  setVisibleColumns: (keys: string[]) => void;
  ColumnChooserButton: React.ReactNode;
} {
  const breakpoint = useResponsive();
  const [visible, setVisible] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Validate against current column defs
        const validKeys = new Set(columnDefs.map((c) => c.key));
        const filtered = parsed.filter((k) => validKeys.has(k));
        if (filtered.length > 0) return filtered;
      }
    } catch {
      // localStorage unavailable
    }
    return getDefaultVisibleColumns(columnDefs, breakpoint);
  });

  const ColumnChooserButton = (
    <ColumnChooser
      columns={columnDefs}
      storageKey={storageKey}
      visible={visible}
      onChange={setVisible}
    />
  );

  return { visibleColumns: visible, setVisibleColumns: setVisible, ColumnChooserButton };
}
