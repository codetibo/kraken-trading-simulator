'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn, formatUsd, formatNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { XCircle, SlidersHorizontal, RotateCcw, ListOrdered, CandlestickChart } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ORDER_TYPES } from '@/lib/engine/types';
import { useColumns, type ColumnDef } from '@/components/ui/column-chooser';

type Tab = 'open' | 'history' | 'cancelled';

interface OrderRow {
  id: string;
  assetSymbol: string;
  marketType: 'SPOT' | 'MARGIN';
  side: 'BUY' | 'SELL';
  type: string;
  status: string;
  positionSide?: 'LONG' | 'SHORT';
  leverage?: number;
  quantity: number;
  filledQuantity: number;
  limitPrice?: number;
  triggerPrice?: number;
  averageFillPrice?: number;
  feePaid: number;
  createdAt: string;
  updatedAt: string;
}

const SIDES = ['BUY', 'SELL'];
const STATUSES = ['FILLED', 'CANCELLED', 'EXPIRED', 'TRIGGERED'];

const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'Open Orders' },
  { id: 'history', label: 'Order History' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function OrdersPageClient({
  initialOpenOrders,
  initialHistory,
}: {
  initialOpenOrders: OrderRow[];
  initialHistory: OrderRow[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL params
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl || 'open');
  const [openOrders, setOpenOrders] = useState<OrderRow[]>(initialOpenOrders);
  const [allHistory, setAllHistory] = useState<OrderRow[]>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    pair: searchParams.get('pair') || '',
    type: searchParams.get('type') || '',
    side: searchParams.get('side') || '',
    status: searchParams.get('status') || '',
    dateRange: searchParams.get('dateRange') || '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sync activeTab and filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'open') params.set('tab', activeTab);
    if (filters.pair) params.set('pair', filters.pair);
    if (filters.type) params.set('type', filters.type);
    if (filters.side) params.set('side', filters.side);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateRange) params.set('dateRange', filters.dateRange);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [activeTab, filters, pathname, router]);

  // Wrap setActiveTab to also sync tab to URL immediately
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [openRes, historyRes] = await Promise.all([
        fetch('/api/orders/open', { cache: 'no-store' }),
        fetch('/api/orders/history', { cache: 'no-store' }),
      ]);
      const [openData, historyData] = await Promise.all([openRes.json(), historyRes.json()]);
      if (openData.orders) setOpenOrders(openData.orders);
      if (historyData.orders) setAllHistory(historyData.orders);
    } catch (err) { console.warn('Failed to fetch orders:', err); } finally { setLoading(false); }
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    try { await fetch(`/api/orders/${orderId}`, { method: 'DELETE' }); fetchData(); } catch (err) { console.warn('Failed to cancel order:', err); }
  };

  const cancelledOrders = useMemo(() => allHistory.filter(o => o.status === 'CANCELLED'), [allHistory]);

  const filteredHistory = useMemo(() => {
    let result = allHistory;
    if (filters.pair) result = result.filter(o => o.assetSymbol.toLowerCase().includes(filters.pair.toLowerCase()));
    if (filters.type) result = result.filter(o => o.type === filters.type);
    if (filters.side) result = result.filter(o => o.side === filters.side);
    if (filters.status) result = result.filter(o => o.status === filters.status);
    if (filters.dateRange) {
      const ranges: Record<string, number> = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
      const ms = ranges[filters.dateRange];
      // eslint-disable-next-line react-hooks/purity
      if (ms) { const cutoff = Date.now() - ms; result = result.filter(o => new Date(o.createdAt).getTime() >= cutoff); }
    }
    return result;
  }, [allHistory, filters]);

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6' aria-busy={loading ? 'true' : 'false'}>
      <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4 md:space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>Orders</h1>
          <button onClick={fetchData} disabled={loading}
            className='flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-panel-raised/50 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'>
            <RotateCcw className={cn('h-3 w-3', loading && 'animate-spin')} /> Refresh
          </button>
        </div>

        <div className='flex border-b border-border'>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={cn('px-4 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                activeTab === tab.id ? 'border-b-2 border-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {tab.label}
              {tab.id === 'open' && openOrders.length > 0 && (
                <Badge variant='outline' className='ml-1.5 border-border px-1 py-0 text-[11px] tabular-nums'>{openOrders.length}</Badge>
              )}
              {tab.id === 'cancelled' && cancelledOrders.length > 0 && (
                <Badge variant='outline' className='ml-1.5 border-border px-1 py-0 text-[11px] tabular-nums'>{cancelledOrders.length}</Badge>
              )}
            </button>
          ))}
          {activeTab === 'history' && (
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn('ml-auto flex items-center gap-1 px-3 py-2 text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]', showFilters ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}>
              <SlidersHorizontal className='h-3 w-3' /> Filters
            </button>
          )}
        </div>

        {activeTab === 'history' && showFilters && (
          <Card><CardContent className='p-3'>
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
              <div>
                <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>Pair</label>
                <input type='text' value={filters.pair} onChange={e => setFilters(f => ({ ...f, pair: e.target.value }))}
                  placeholder='e.g. BTC' className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent' />
              </div>
              <div>
                <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>Type</label>
                <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                  className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent'>
                  <option value=''>All types</option>
                  {ORDER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>Side</label>
                <select value={filters.side} onChange={e => setFilters(f => ({ ...f, side: e.target.value }))}
                  className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent'>
                  <option value=''>All sides</option>
                  {SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>Status</label>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent'>
                  <option value=''>All statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className='mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>Date</label>
                <select value={filters.dateRange} onChange={e => setFilters(f => ({ ...f, dateRange: e.target.value }))}
                  className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent'>
                  <option value=''>All time</option>
                  <option value='24h'>Last 24 hours</option>
                  <option value='7d'>Last 7 days</option>
                  <option value='30d'>Last 30 days</option>
                </select>
              </div>
            </div>
            <div className='mt-2 flex justify-end'>
              <button onClick={() => setFilters({ pair: '', type: '', side: '', status: '', dateRange: '' })}
                className='rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'>Clear filters</button>
            </div>
          </CardContent></Card>
        )}

        {activeTab === 'open' && <OpenOrdersTable orders={openOrders} onCancel={handleCancelOrder} />}
        {activeTab === 'history' && <HistoryTable orders={filteredHistory} />}
        {activeTab === 'cancelled' && <HistoryTable orders={cancelledOrders} />}
      </div>
    </div>
  );
}

const OPEN_ORDER_COLUMNS: ColumnDef[] = [
  { key: 'time', label: 'Time' },
  { key: 'pair', label: 'Pair' },
  { key: 'type', label: 'Type' },
  { key: 'side', label: 'Side' },
  { key: 'qty', label: 'Qty / Filled' },
  { key: 'price', label: 'Price' },
  { key: 'trigger', label: 'Trigger', defaultTablet: false, defaultMobile: false },
  { key: 'market', label: 'Market', defaultTablet: false, defaultMobile: false },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', defaultMobile: true },
];

const HISTORY_ORDER_COLUMNS: ColumnDef[] = [
  { key: 'time', label: 'Time' },
  { key: 'pair', label: 'Pair' },
  { key: 'type', label: 'Type' },
  { key: 'side', label: 'Side' },
  { key: 'qty', label: 'Qty' },
  { key: 'filled', label: 'Filled', defaultTablet: false, defaultMobile: false },
  { key: 'price', label: 'Price' },
  { key: 'market', label: 'Market', defaultTablet: false, defaultMobile: false },
  { key: 'status', label: 'Status' },
  { key: 'fee', label: 'Fee', defaultTablet: false, defaultMobile: false },
];

function OpenOrdersTable({ orders, onCancel }: { orders: OrderRow[]; onCancel: (id: string) => void }) {
  const { visibleColumns, ColumnChooserButton } = useColumns(OPEN_ORDER_COLUMNS, 'orders-open-cols');

  if (orders.length === 0) return (
    <div className='flex flex-col items-center justify-center py-16'>
      <ListOrdered className='mb-3 h-10 w-10 text-muted-foreground/30' />
      <p className='text-sm text-muted-foreground mb-3'>No open orders</p>
      <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
        <CandlestickChart className='h-3.5 w-3.5' />
        Place an Order
      </Link>
    </div>
  );

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
          {col('qty') && <th className='px-4 py-2.5 font-medium'>Qty / Filled</th>}
          {col('price') && <th className='px-4 py-2.5 font-medium'>Price</th>}
          {col('trigger') && <th className='px-4 py-2.5 font-medium'>Trigger</th>}
          {col('market') && <th className='px-4 py-2.5 font-medium'>Market</th>}
          {col('status') && <th className='px-4 py-2.5 font-medium'>Status</th>}
          {col('actions') && <th className='px-4 py-2.5 font-medium' />}
        </tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className='border-b border-border/50 transition-colors hover:bg-panel-raised/30'>
              {col('time') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{format(new Date(o.createdAt), 'MM/dd HH:mm')}</td>}
              {col('pair') && <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>{o.assetSymbol}</td>}
              {col('type') && <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>{o.type.replace(/_/g, ' ')}</td>}
              {col('side') && <td className='whitespace-nowrap px-4 py-2.5'><OrderSideBadge side={o.side} positionSide={o.positionSide} /></td>}
              {col('qty') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{formatNumber(o.quantity)}{o.filledQuantity > 0 && <span className='text-muted-foreground'> / {formatNumber(o.filledQuantity)}</span>}</td>}
              {col('price') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{o.limitPrice ? formatUsd(o.limitPrice) : o.averageFillPrice ? formatUsd(o.averageFillPrice) : '—'}</td>}
              {col('trigger') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{o.triggerPrice ? formatUsd(o.triggerPrice) : '—'}</td>}
              {col('market') && <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>{o.marketType}{o.leverage && ` ${o.leverage}x`}</td>}
              {col('status') && <td className='whitespace-nowrap px-4 py-2.5'><StatusBadge status={o.status} /></td>}
              {col('actions') && <td className='px-4 py-2.5'>
                <button onClick={() => onCancel(o.id)} className='text-muted-foreground transition-colors hover:text-negative focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]' title='Cancel order'>
                  <XCircle className='h-4 w-4' />
                </button>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ orders }: { orders: OrderRow[] }) {
  const { visibleColumns, ColumnChooserButton } = useColumns(HISTORY_ORDER_COLUMNS, 'orders-history-cols');

  if (orders.length === 0) return (
    <div className='flex flex-col items-center justify-center py-16'>
      <ListOrdered className='mb-3 h-10 w-10 text-muted-foreground/30' />
      <p className='text-sm text-muted-foreground mb-3'>No orders found</p>
      <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
        <CandlestickChart className='h-3.5 w-3.5' />
        Place an Order
      </Link>
    </div>
  );

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
          {col('qty') && <th className='px-4 py-2.5 font-medium'>Qty</th>}
          {col('filled') && <th className='px-4 py-2.5 font-medium'>Filled</th>}
          {col('price') && <th className='px-4 py-2.5 font-medium'>Price</th>}
          {col('market') && <th className='px-4 py-2.5 font-medium'>Market</th>}
          {col('status') && <th className='px-4 py-2.5 font-medium'>Status</th>}
          {col('fee') && <th className='px-4 py-2.5 font-medium'>Fee</th>}
        </tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className='border-b border-border/50 transition-colors hover:bg-panel-raised/30'>
              {col('time') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{format(new Date(o.createdAt), 'MM/dd HH:mm')}</td>}
              {col('pair') && <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>{o.assetSymbol}</td>}
              {col('type') && <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>{o.type.replace(/_/g, ' ')}</td>}
              {col('side') && <td className='whitespace-nowrap px-4 py-2.5'><OrderSideBadge side={o.side} /></td>}
              {col('qty') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{formatNumber(o.quantity)}</td>}
              {col('filled') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{formatNumber(o.filledQuantity)}</td>}
              {col('price') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{o.averageFillPrice ? formatUsd(o.averageFillPrice) : o.limitPrice ? formatUsd(o.limitPrice) : '—'}</td>}
              {col('market') && <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>{o.marketType}</td>}
              {col('status') && <td className='whitespace-nowrap px-4 py-2.5'><StatusBadge status={o.status} /></td>}
              {col('fee') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{o.feePaid ? formatUsd(o.feePaid) : '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderSideBadge({ side, positionSide }: { side: string; positionSide?: string }) {
  const isBuy = side === 'BUY';
  return (
    <span className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium',
      isBuy ? 'border-positive/30 text-positive' : 'border-negative/30 text-negative')}>
      <span aria-hidden='true' className='mr-0.5 text-[11px]'>{isBuy ? '▲' : '▼'}</span>
      {side}{positionSide && `/${positionSide}`}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'text-blue-500 border-blue-500/30', PARTIALLY_FILLED: 'text-amber-500 border-amber-500/30',
    FILLED: 'text-positive border-positive/30', CANCELLED: 'text-muted-foreground border-border/50',
    EXPIRED: 'text-muted-foreground border-border/50', TRIGGERED: 'text-accent border-accent/30',
  };
  return (
    <span className={cn('inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium', colors[status] || 'text-muted-foreground border-border/50')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
