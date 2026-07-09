'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

const ALL_SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD'];

const PAGE_ACTIONS = [
  { label: 'Dashboard', href: '/dashboard', keywords: 'home overview portfolio' },
  { label: 'Trade', href: '/trade', keywords: 'order buy sell exchange' },
  { label: 'Portfolio', href: '/portfolio', keywords: 'holdings positions equity' },
  { label: 'Orders', href: '/orders', keywords: 'open history cancelled' },
  { label: 'Positions', href: '/positions', keywords: 'margin long short' },
  { label: 'History', href: '/history', keywords: 'trades transactions log' },
  { label: 'Journal', href: '/journal', keywords: 'notes trading journal' },
  { label: 'Education', href: '/education', keywords: 'learn tutorial help' },
  { label: 'Settings', href: '/settings', keywords: 'preferences configure' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectAsset?: (symbol: string) => void;
}

export function CommandPalette({ open, onClose, onSelectAsset }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset on open
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIndex(0);
      // Focus input after mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const filteredAssets = query
    ? ALL_SYMBOLS.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : ALL_SYMBOLS;

  const filteredPages = query
    ? PAGE_ACTIONS.filter(
        p =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.keywords.includes(query.toLowerCase()),
      )
    : PAGE_ACTIONS;

  const allResults = useMemo(
    () => [
      ...filteredPages.map(p => ({ type: 'page' as const, label: p.label, href: p.href, symbol: '' })),
      ...filteredAssets.map(s => ({ type: 'asset' as const, label: s, href: `/trade?symbol=${s}`, symbol: s })),
    ],
    [filteredPages, filteredAssets],
  );

  const handleSelect = useCallback(
    (index: number) => {
      const item = allResults[index];
      if (!item) return;
      if (item.type === 'asset' && onSelectAsset) {
        onSelectAsset(item.symbol);
      }
      router.push(item.href);
      onClose();
    },
    [allResults, onSelectAsset, router, onClose],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[15vh] transition-opacity duration-150 ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl transition-all duration-150 ${
          open ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Search input */}
        <div className='flex items-center gap-2 border-b border-border px-4 py-3'>
          <Search className='h-4 w-4 text-muted-foreground' />
          <input
            ref={inputRef}
            type='text'
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder='Search assets or pages…'
            className='flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50'
          />
          <kbd className='rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className='max-h-72 overflow-y-auto p-2'>
          {allResults.length === 0 && (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {filteredPages.length > 0 && (
            <>
              <p className='px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                Pages
              </p>
              {filteredPages.map(p => {
                const idx = allResults.findIndex(r => r.type === 'page' && r.label === p.label);
                return (
                  <button
                    key={p.href}
                    onClick={() => handleSelect(idx)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedIndex === idx
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className='flex-1'>{p.label}</span>
                    <span className='text-[10px] text-muted-foreground'>Page</span>
                  </button>
                );
              })}
            </>
          )}

          {filteredAssets.length > 0 && (
            <>
              <p className='border-t border-border/50 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
                Assets
              </p>
              {filteredAssets.map(s => {
                const idx = allResults.findIndex(r => r.type === 'asset' && r.label === s);
                return (
                  <button
                    key={s}
                    onClick={() => handleSelect(idx)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedIndex === idx
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className='font-mono text-xs'>{s}</span>
                    <span className='ml-auto text-[10px] text-muted-foreground'>Trade</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
