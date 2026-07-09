'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn, formatUsd, formatNumber } from '@/lib/utils';
import { PnLDisplay } from '@/lib/color-blind';
import { format } from 'date-fns';
import { SlidersHorizontal, RotateCcw, Search, CandlestickChart, ListOrdered } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useColumns, type ColumnDef } from '@/components/ui/column-chooser';
import type { TradeView, TransactionView } from '@/server/actions/history';

type Tab = 'trades' | 'transactions';

const TABS: { id: Tab; label: string }[] = [
  { id: 'trades', label: 'Trade History' },
  { id: 'transactions', label: 'Transaction Log' },
];

const TRADE_TYPES = ['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT',
  'TAKE_PROFIT_LIMIT', 'TRAILING_STOP', 'TRAILING_STOP_LIMIT'];
const SIDES = ['BUY', 'SELL'];
const TRANSACTION_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'TRADE_FEE', 'FUNDING_FEE', 'REALIZED_PNL', 'RESET_ADJUSTMENT'];
const DATE_RANGES = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function HistoryPageClient({
  initialTrades,
  initialTransactions,
}: {
  initialTrades: TradeView[];
  initialTransactions: TransactionView[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL params
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl || 'trades');
  const [trades, setTrades] = useState<TradeView[]>(initialTrades);
  const [transactions, setTransactions] = useState<TransactionView[]>(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [tradeFilters, setTradeFilters] = useState({
    pair: searchParams.get('pair') || '',
    type: searchParams.get('type') || '',
    side: searchParams.get('side') || '',
    dateRange: searchParams.get('dateRange') || '',
  });
  const [showTradeFilters, setShowTradeFilters] = useState(false);
  const [txFilters, setTxFilters] = useState({
    type: searchParams.get('txType') || '',
    dateRange: searchParams.get('dateRange') || '',
    search: searchParams.get('search') || '',
  });
  const [showTxFilters, setShowTxFilters] = useState(false);

  // Sync activeTab and filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'trades') params.set('tab', activeTab);
    if (activeTab === 'trades') {
      if (tradeFilters.pair) params.set('pair', tradeFilters.pair);
      if (tradeFilters.type) params.set('type', tradeFilters.type);
      if (tradeFilters.side) params.set('side', tradeFilters.side);
      if (tradeFilters.dateRange) params.set('dateRange', tradeFilters.dateRange);
    } else {
      if (txFilters.type) params.set('txType', txFilters.type);
      if (txFilters.dateRange) params.set('dateRange', txFilters.dateRange);
      if (txFilters.search) params.set('search', txFilters.search);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [activeTab, tradeFilters, txFilters, pathname, router]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const fetchTrades = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const qs = params.toString();
      const res = await fetch(`/api/trades${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.trades) setTrades(data.trades);
    } catch (err) { console.warn('Failed to fetch trades:', err); } finally { setLoading(false); }
  }, []);

  const fetchTransactions = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const qs = params.toString();
      const res = await fetch(`/api/transactions${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) { console.warn('Failed to fetch transactions:', err); } finally { setLoading(false); }
  }, []);

  const refreshCurrent = useCallback(() => {
    if (activeTab === 'trades') {
      fetchTrades(Object.values(tradeFilters).some(Boolean) ? tradeFilters : undefined);
    } else {
      fetchTransactions(Object.values(txFilters).some(Boolean) ? txFilters : undefined);
    }
  }, [activeTab, tradeFilters, txFilters, fetchTrades, fetchTransactions]);

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6' aria-busy={loading ? 'true' : 'false'}>
      <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4 md:space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>History</h1>
          <button onClick={refreshCurrent} disabled={loading}
            className='flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-panel-raised/50 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'>
            <RotateCcw className={cn('h-3 w-3', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className='flex border-b border-border'>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={cn('px-4 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                activeTab === tab.id ? 'border-b-2 border-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {tab.label}
              {tab.id === 'trades' && trades.length > 0 && (
                <Badge variant='outline' className='ml-1.5 border-border px-1 py-0 text-[11px] tabular-nums'>{trades.length}</Badge>
              )}
              {tab.id === 'transactions' && transactions.length > 0 && (
                <Badge variant='outline' className='ml-1.5 border-border px-1 py-0 text-[11px] tabular-nums'>{transactions.length}</Badge>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'trades' ? (
          <TradeHistorySection trades={trades} filters={tradeFilters} setFilters={setTradeFilters}
            showFilters={showTradeFilters} setShowFilters={setShowTradeFilters} onApply={() => fetchTrades(tradeFilters)} />
        ) : (
          <TransactionLogSection transactions={transactions} filters={txFilters} setFilters={setTxFilters}
            showFilters={showTxFilters} setShowFilters={setShowTxFilters} onApply={() => fetchTransactions(txFilters)} />
        )}
      </div>
    </div>
  );
}

const TRADE_COLUMNS: ColumnDef[] = [
  { key: 'time', label: 'Time' },
  { key: 'pair', label: 'Pair' },
  { key: 'type', label: 'Type' },
  { key: 'side', label: 'Side' },
  { key: 'price', label: 'Price' },
  { key: 'qty', label: 'Quantity' },
  { key: 'fee', label: 'Fee', defaultTablet: false, defaultMobile: false },
  { key: 'pnl', label: 'PnL' },
  { key: 'market', label: 'Market', defaultTablet: false, defaultMobile: false },
];

// ─── Trade History Section ──────────────────────────────
function TradeHistorySection({ trades, filters, setFilters, showFilters, setShowFilters, onApply }: {
  trades: TradeView[];
  filters: { pair: string; type: string; side: string; dateRange: string };
  setFilters: React.Dispatch<React.SetStateAction<typeof filters>>;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  onApply: () => void;
}) {
  const hasActiveFilters = Object.values(filters).some(Boolean);
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-xs text-muted-foreground'>{trades.length} trade{trades.length !== 1 ? 's' : ''}{hasActiveFilters && ' (filtered)'}</p>            <button onClick={() => setShowFilters(!showFilters)}
              className={cn('flex items-center gap-1 text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                showFilters || hasActiveFilters ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}>
          <SlidersHorizontal className='h-3 w-3' /> Filters
          {hasActiveFilters && <span className='ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent'>{Object.values(filters).filter(Boolean).length}</span>}
        </button>
      </div>
      {showFilters && (
        <Card><CardContent className='p-3'>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
            <FilterInput label='Pair' value={filters.pair} onChange={v => setFilters(f => ({ ...f, pair: v }))} placeholder='e.g. BTC' />
            <FilterSelect label='Type' value={filters.type} onChange={v => setFilters(f => ({ ...f, type: v }))} options={[{ value: '', label: 'All types' }, ...TRADE_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))]} />
            <FilterSelect label='Side' value={filters.side} onChange={v => setFilters(f => ({ ...f, side: v }))} options={[{ value: '', label: 'All sides' }, ...SIDES.map(s => ({ value: s, label: s }))]} />
            <FilterSelect label='Date' value={filters.dateRange} onChange={v => setFilters(f => ({ ...f, dateRange: v }))} options={[{ value: '', label: 'All time' }, ...DATE_RANGES.map(r => ({ value: r.value, label: r.label }))]} />
          </div>
          <div className='mt-2 flex justify-end gap-2'>
            <button onClick={() => setFilters({ pair: '', type: '', side: '', dateRange: '' })} className='rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'>Clear</button>
            <button onClick={onApply} className='rounded bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground hover:bg-accent/90 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'>Apply</button>
          </div>
        </CardContent></Card>
      )}
      {trades.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-16'>
          <CandlestickChart className='mb-3 h-10 w-10 text-muted-foreground/30' />
          <p className='text-sm text-muted-foreground mb-3'>No trades found</p>
          <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
            <CandlestickChart className='h-3.5 w-3.5' />
            Execute a Trade
          </Link>
        </div>
      ) : (
        <TradeColumnsTable trades={trades} />
      )}
    </div>
  );
}

function TradeColumnsTable({ trades }: { trades: TradeView[] }) {
  const { visibleColumns, ColumnChooserButton } = useColumns(TRADE_COLUMNS, 'history-trades-cols');
  const col = (key: string) => visibleColumns.includes(key);

  return (
    <div className='overflow-x-auto rounded-lg border border-border'>
      <div className='flex items-center justify-end border-b border-border bg-muted/20 px-3 py-1'>
        {ColumnChooserButton}
      </div>
      <table className='w-full text-left text-sm'>
        <thead><tr className='border-b border-border bg-muted/20 text-[11px] text-muted-foreground'>
          {col('time') && <th className='px-4 py-2.5 font-medium'>Time</th>}
          {col('pair') && <th className='px-4 py-2.5 font-medium'>Pair</th>}
          {col('type') && <th className='px-4 py-2.5 font-medium'>Type</th>}
          {col('side') && <th className='px-4 py-2.5 font-medium'>Side</th>}
          {col('price') && <th className='px-4 py-2.5 font-medium'>Price</th>}
          {col('qty') && <th className='px-4 py-2.5 font-medium'>Quantity</th>}
          {col('fee') && <th className='px-4 py-2.5 font-medium'>Fee</th>}
          {col('pnl') && <th className='px-4 py-2.5 font-medium'>PnL</th>}
          {col('market') && <th className='px-4 py-2.5 font-medium'>Market</th>}
        </tr></thead>
        <tbody>
          {trades.map(t => (
            <tr key={t.id} className='border-b border-border/50 transition-colors hover:bg-panel-raised/30'>
              {col('time') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{format(new Date(t.executedAt), 'MM/dd HH:mm')}</td>}
              {col('pair') && <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>{t.assetSymbol}</td>}
              {col('type') && <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>{t.orderType.replace(/_/g, ' ')}</td>}
              {col('side') && <td className='whitespace-nowrap px-4 py-2.5'><SideBadge side={t.side} /></td>}
              {col('price') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{formatUsd(t.price)}</td>}
              {col('qty') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{formatNumber(t.quantity)}</td>}
              {col('fee') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{t.fee > 0 ? formatUsd(t.fee) : '—'}</td>}
              {col('pnl') && <td className='whitespace-nowrap px-4 py-2.5'>{t.pnl !== 0 ? <PnLDisplay value={t.pnl} formatted={formatUsd(t.pnl, { signed: true })} /> : <span className='font-mono text-xs tabular-nums text-muted-foreground'>—</span>}</td>}
              {col('market') && <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>{t.marketType}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Transaction Log Section ────────────────────────────
function TransactionLogSection({ transactions, filters, setFilters, showFilters, setShowFilters, onApply }: {
  transactions: TransactionView[];
  filters: { type: string; dateRange: string; search: string };
  setFilters: React.Dispatch<React.SetStateAction<typeof filters>>;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  onApply: () => void;
}) {
  const hasActiveFilters = Object.values(filters).some(Boolean);
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-xs text-muted-foreground'>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}{hasActiveFilters && ' (filtered)'}</p>            <button onClick={() => setShowFilters(!showFilters)}
              className={cn('flex items-center gap-1 text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                showFilters || hasActiveFilters ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}>
          <SlidersHorizontal className='h-3 w-3' /> Filters
          {hasActiveFilters && <span className='ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent'>{Object.values(filters).filter(Boolean).length}</span>}
        </button>
      </div>
      {showFilters && (
        <Card><CardContent className='p-3'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            <FilterSelect label='Type' value={filters.type} onChange={v => setFilters(f => ({ ...f, type: v }))} options={[{ value: '', label: 'All types' }, ...TRANSACTION_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))]} />
            <FilterSelect label='Date' value={filters.dateRange} onChange={v => setFilters(f => ({ ...f, dateRange: v }))} options={[{ value: '', label: 'All time' }, ...DATE_RANGES.map(r => ({ value: r.value, label: r.label }))]} />
            <div>
              <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>Search</label>
              <div className='relative'>
                <Search className='absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground' />
                <input type='text' value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder='Search notes...'
                  className='w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent' />
              </div>
            </div>
          </div>
          <div className='mt-2 flex justify-end gap-2'>
            <button onClick={() => setFilters({ type: '', dateRange: '', search: '' })} className='rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground'>Clear</button>
            <button onClick={onApply} className='rounded bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground hover:bg-accent/90 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'>Apply</button>
          </div>
        </CardContent></Card>
      )}
      {transactions.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-16'>
          <ListOrdered className='mb-3 h-10 w-10 text-muted-foreground/30' />
          <p className='text-sm text-muted-foreground mb-3'>No transactions found</p>
          <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
            <CandlestickChart className='h-3.5 w-3.5' />
            Make a Trade
          </Link>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-border'>
          <table className='w-full text-left text-sm'>
            <thead><tr className='border-b border-border bg-muted/20 text-[11px] text-muted-foreground'>
              <th className='px-4 py-2.5 font-medium'>Time</th>
              <th className='px-4 py-2.5 font-medium'>Type</th>
              <th className='px-4 py-2.5 font-medium'>Amount</th>
              <th className='px-4 py-2.5 font-medium'>Note</th>
            </tr></thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className='border-b border-border/50 transition-colors hover:bg-panel-raised/30'>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{format(new Date(tx.createdAt), 'MM/dd HH:mm')}</td>
                  <td className='whitespace-nowrap px-4 py-2.5'><TxTypeBadge type={tx.type} /></td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums'><PnLDisplay value={tx.amount} formatted={formatUsd(tx.amount, { signed: true })} /></td>
                  <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>{tx.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SideBadge({ side }: { side: string }) {
  const isBuy = side === 'BUY';
  return (
    <span className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium',
      isBuy ? 'border-positive/30 text-positive' : 'border-negative/30 text-negative')}>
      <span aria-hidden='true' className='mr-0.5 text-[11px]'>{isBuy ? '▲' : '▼'}</span>
      {side}
    </span>
  );
}

function TxTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    DEPOSIT: 'text-positive border-positive/30', WITHDRAWAL: 'text-negative border-negative/30',
    TRADE_FEE: 'text-muted-foreground border-border/50', FUNDING_FEE: 'text-amber-500 border-amber-500/30',
    REALIZED_PNL: 'text-accent border-accent/30', RESET_ADJUSTMENT: 'text-blue-500 border-blue-500/30',
  };
  return (
    <span className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium', colors[type] || 'text-muted-foreground border-border/50')}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>{label}</label>
      <input type='text' value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent' />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent'>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
