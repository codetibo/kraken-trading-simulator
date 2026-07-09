'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { cn, formatUsd, formatPercent, formatNumber } from '@/lib/utils';
import { PositiveArrow, NegativeArrow } from '@/lib/color-blind';
import { useTradeStore } from '@/store/tradeStore';
import { usePriceStream } from '@/hooks/usePriceStream';
import { useSelectedAsset } from './AssetProvider';
import {
  Star,
  Search,
  ArrowUpDown,
  ChevronDown,
  EyeOff,
  X,
} from 'lucide-react';

type SortKey = 'symbol' | 'price' | 'change' | 'volume';
type SortDir = 'asc' | 'desc';

const FAVORITES_KEY = 'watchlist_favorites';
const HIDDEN_KEY = 'watchlist_hidden';

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Silent (private browsing)
  }
}

// Sort button helper — declared outside component to avoid "creating component during render" warning
function SortButton({
  label,
  sortKey: sk,
  activeSort,
  sortDir,
  onToggle,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => onToggle(sk)}
      className={cn(
        'flex items-center gap-0.5 text-[11px] font-medium transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
        activeSort === sk ? 'text-foreground' : 'text-muted-foreground',
        className,
      )}
    >
      {label}
      {activeSort === sk && (
        <ArrowUpDown
          className={cn(
            'h-2.5 w-2.5 transition-transform',
            sortDir === 'desc' && 'rotate-180',
          )}
        />
      )}
    </button>
  );
}

export const Watchlist = memo(function Watchlist() {
  const { tickers } = usePriceStream();
  const selectedPair = useTradeStore((s) => s.selectedPair);
  const setSelectedPair = useTradeStore((s) => s.setSelectedPair);
  const { setSelectedAsset } = useSelectedAsset();

  // Search & Sort state
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // Favorites & Hidden state (synced with localStorage, lazy init from localStorage)
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(FAVORITES_KEY));
  const [hidden, setHidden] = useState<Set<string>>(() => loadSet(HIDDEN_KEY));

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      saveSet(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const toggleHidden = useCallback((symbol: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      saveSet(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir(key === 'symbol' ? 'asc' : 'desc');
      }
    },
    [sortKey],
  );

  // Filtered, sorted, pinned list
  const displayTickers = useMemo(() => {
    const filtered = tickers.filter((t) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const sym = t.symbol.toLowerCase();
        const base = sym.split('/')[0];
        if (!sym.includes(q) && !base.includes(q)) return false;
      }
      return true;
    });

    // Sort (create copy since sort mutates)
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol':
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          cmp = a.price - b.price;
          break;
        case 'change':
          cmp = a.changePercent24h - b.changePercent24h;
          break;
        case 'volume':
          cmp = a.volume24h - b.volume24h;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Pin favorites to top (stable sort: favorites keep their relative order)
    const favs: typeof sorted = [];
    const rest: typeof sorted = [];
    for (const t of sorted) {
      if (favorites.has(t.symbol)) {
        favs.push(t);
      } else if (!hidden.has(t.symbol)) {
        rest.push(t);
      }
    }

    return [...favs, ...rest];
  }, [tickers, search, sortKey, sortDir, favorites, hidden]);

  if (tickers.length === 0) {
    return (
      <div className='flex h-full flex-col'>
        <div className='border-b border-border px-3 py-2'>
          <h2 className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            Watchlist
          </h2>
        </div>
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-xs text-muted-foreground'>Loading prices...</p>
        </div>
      </div>
    );
  }

  const hiddenCount = hidden.size;
  const visibleCount = displayTickers.length;

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='border-b border-border px-3 py-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            Watchlist
          </h2>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className='rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
            title='Toggle filters'
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                showFilters && 'rotate-180',
              )}
            />
          </button>
        </div>

        {/* Search Bar */}
        {showFilters && (
          <div className='mt-2 space-y-2'>
            <div className='relative'>
              <Search className='pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground' />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search pairs...'
                className='w-full rounded-md border border-border bg-background py-1 pl-6 pr-7 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent'
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className='absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                >
                  <X className='h-3 w-3' />
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div className='flex items-center gap-2'>
              <SortButton label='Name' sortKey='symbol' activeSort={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortButton label='Price' sortKey='price' activeSort={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortButton label='Change' sortKey='change' activeSort={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortButton label='Volume' sortKey='volume' activeSort={sortKey} sortDir={sortDir} onToggle={toggleSort} className='ml-auto' />
            </div>

            {/* Stats */}
            <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
              <span>
                {visibleCount} / {tickers.length} shown
              </span>
              {hiddenCount > 0 && (
                <button
                  onClick={() => {
                    setHidden(new Set());
                    saveSet(HIDDEN_KEY, new Set());
                  }}
                  className='text-accent hover:underline focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                >
                  Reset hidden
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ticker List */}
      <div className='flex-1 divide-y divide-border/50 overflow-y-auto'>
        {displayTickers.map((t) => {
          const isSelected = t.symbol === selectedPair;
          const isPositive = t.changePercent24h >= 0;
          const isFav = favorites.has(t.symbol);

          return (
            <button
              key={t.symbol}
              onClick={() => {
                setSelectedPair(t.symbol);
                setSelectedAsset(t.symbol);
              }}
              className={cn(
                'group relative flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-panel-raised/50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                isSelected && 'bg-panel-raised',
              )}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  {/* Favorite star */ }
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(t.symbol);
                    }}
                    className='shrink-0 cursor-pointer transition-colors hover:scale-110'
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        toggleFavorite(t.symbol);
                      }
                    }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star
                      className={cn(
                        'h-3 w-3 transition-colors',
                        isFav
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30 group-hover:text-muted-foreground/60',
                      )}
                    />
                  </span>
                  <span className='text-sm font-medium text-foreground'>
                    {t.symbol.replace('/', '')}
                  </span>
                </div>
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    isPositive ? 'text-positive' : 'text-negative',
                  )}
                >
                  {isPositive ? <PositiveArrow className='mr-0.5 inline h-2.5 w-2.5' /> : <NegativeArrow className='mr-0.5 inline h-2.5 w-2.5' />}
                  {formatUsd(t.price)}
                </span>
              </div>
              <div className='flex items-center justify-between pl-5'>
                <span
                  className={cn(
                    'font-mono text-[11px] tabular-nums',
                    isPositive ? 'text-positive' : 'text-negative',
                  )}
                >
                  {isPositive ? <PositiveArrow className='mr-0.5 inline h-2.5 w-2.5' /> : <NegativeArrow className='mr-0.5 inline h-2.5 w-2.5' />}
                  {formatPercent(t.changePercent24h, { signed: true })}
                </span>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] text-muted-foreground'>
                    Vol: {formatNumber(t.volume24h / 1_000_000, { decimals: 1 })}M
                  </span>
                  {/* Hide button */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(t.symbol);
                    }}
                    className='cursor-pointer opacity-0 transition-all hover:scale-110 group-hover:opacity-100'
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        toggleHidden(t.symbol);
                      }
                    }}
                    title='Hide pair'
                  >
                    <EyeOff className='h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground' />
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {displayTickers.length === 0 && (
          <div className='flex flex-col items-center justify-center py-8'>
            <Search className='mb-2 h-6 w-6 text-muted-foreground/30' />
            <p className='text-xs text-muted-foreground'>
              {search
                ? 'No pairs match your search'
                : 'All pairs are hidden'}
            </p>
            {hidden.size > 0 && (
              <button
                onClick={() => {
                  setHidden(new Set());
                  saveSet(HIDDEN_KEY, new Set());
                }}
                className='mt-1 text-[11px] text-accent hover:underline focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              >
                Show all pairs
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
