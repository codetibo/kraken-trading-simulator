'use client';

import { format } from 'date-fns';
import { XCircle, XSquare, ListOrdered, Layers, CandlestickChart } from 'lucide-react';
import { formatUsd, formatNumber, formatPercent } from '@/lib/utils';
import { SideBadge, PnLDisplay, PercentChange } from '@/lib/color-blind';
import { EmptyState } from './EmptyState';
import type { OrderRow, PositionRow, TradeRow } from '@/hooks/useBottomPanelData';

// ── Open Orders Table ──

export function OrdersTable({ orders, onCancel }: { orders: OrderRow[]; onCancel: (id: string, asset: string) => void }) {
  if (orders.length === 0) {
    return <EmptyState message='No open orders' icon={ListOrdered} />;
  }

  return (
    <table className='w-full text-left text-sm'>
      <thead>
        <tr className='border-b border-border text-[11px] text-muted-foreground'>
          <th className='px-3 py-1.5 font-medium'>Time</th>
          <th className='px-3 py-1.5 font-medium'>Pair</th>
          <th className='px-3 py-1.5 font-medium'>Side</th>
          <th className='px-3 py-1.5 font-medium'>Type</th>
          <th className='px-3 py-1.5 font-medium'>Qty / Filled</th>
          <th className='px-3 py-1.5 font-medium'>Price</th>
          <th className='px-3 py-1.5 font-medium'>Trigger</th>
          <th className='px-3 py-1.5 font-medium'>Status</th>
          <th className='px-3 py-1.5 font-medium'></th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className='border-b border-border/50 text-xs transition-colors hover:bg-panel-raised/50'>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono text-muted-foreground'>
              {format(new Date(o.createdAt), 'HH:mm:ss')}
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 font-medium text-foreground'>{o.assetSymbol}</td>
            <td className='whitespace-nowrap px-3 py-1.5'>
              <SideBadge side={o.side} />
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 text-muted-foreground'>{o.type.replace(/_/g, ' ')}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>
              {formatNumber(o.quantity)} / {formatNumber(o.filledQuantity)}
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>
              {o.limitPrice ? formatUsd(o.limitPrice) : '—'}
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>
              {o.triggerPrice ? formatUsd(o.triggerPrice) : '—'}
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 text-muted-foreground'>{o.status.replace(/_/g, ' ')}</td>
            <td className='px-3 py-1.5'>
              <button
                onClick={() => onCancel(o.id, o.assetSymbol)}
                className='text-muted-foreground hover:text-negative focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              >
                <XCircle className='h-3.5 w-3.5' />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Positions Table ──

export function PositionsTable({ positions, onClose }: { positions: PositionRow[]; onClose?: (id: string, asset: string) => void }) {
  if (positions.length === 0) {
    return <EmptyState message='No open positions' icon={Layers} />;
  }

  return (
    <table className='w-full text-left text-sm'>
      <thead>
        <tr className='border-b border-border text-[11px] text-muted-foreground'>
          <th className='px-3 py-1.5 font-medium'>Pair</th>
          <th className='px-3 py-1.5 font-medium'>Side</th>
          <th className='px-3 py-1.5 font-medium'>Size</th>
          <th className='px-3 py-1.5 font-medium'>Entry</th>
          <th className='px-3 py-1.5 font-medium'>Mark</th>
          <th className='px-3 py-1.5 font-medium'>PnL</th>
          <th className='px-3 py-1.5 font-medium'>ROE</th>
          <th className='px-3 py-1.5 font-medium'>Liq.</th>
          <th className='px-3 py-1.5 font-medium'>Lev.</th>
          <th className='px-3 py-1.5 font-medium'></th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => (
          <tr key={p.id} className='border-b border-border/50 text-xs transition-colors hover:bg-panel-raised/50'>
            <td className='whitespace-nowrap px-3 py-1.5 font-medium text-foreground'>{p.assetSymbol}</td>
            <td className='whitespace-nowrap px-3 py-1.5'>
              <SideBadge side={p.side} />
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>{formatNumber(p.size)}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>{formatUsd(p.entryPrice)}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>{formatUsd(p.markPrice)}</td>
            <td className='whitespace-nowrap px-3 py-1.5'>
              <PnLDisplay value={p.unrealizedPnl} formatted={formatUsd(p.unrealizedPnl, { signed: true })} />
            </td>
            <td className='whitespace-nowrap px-3 py-1.5'>
              <PercentChange value={p.roe} formatted={formatPercent(p.roe, { signed: true })} />
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-muted-foreground'>{formatUsd(p.liquidationPrice)}</td>
            <td className='whitespace-nowrap px-3 py-1.5 text-muted-foreground'>{p.leverage}x</td>
            <td className='px-3 py-1.5'>
              <button
                onClick={() => onClose?.(p.id, p.assetSymbol)}
                className='text-muted-foreground hover:text-negative focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                title='Close position'
              >
                <XSquare className='h-3.5 w-3.5' />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Order History Table ──

export function OrderHistoryTable({ orders }: { orders: OrderRow[] }) {
  const history = orders.filter((o) => ['FILLED', 'CANCELLED', 'EXPIRED', 'TRIGGERED'].includes(o.status));

  if (history.length === 0) {
    return <EmptyState message='No order history' icon={ListOrdered} />;
  }

  return (
    <table className='w-full text-left text-sm'>
      <thead>
        <tr className='border-b border-border text-[11px] text-muted-foreground'>
          <th className='px-3 py-1.5 font-medium'>Time</th>
          <th className='px-3 py-1.5 font-medium'>Pair</th>
          <th className='px-3 py-1.5 font-medium'>Side</th>
          <th className='px-3 py-1.5 font-medium'>Type</th>
          <th className='px-3 py-1.5 font-medium'>Qty</th>
          <th className='px-3 py-1.5 font-medium'>Price</th>
          <th className='px-3 py-1.5 font-medium'>Status</th>
        </tr>
      </thead>
      <tbody>
        {history.slice(0, 30).map((o) => (
          <tr key={o.id} className='border-b border-border/50 text-xs transition-colors hover:bg-panel-raised/50'>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono text-muted-foreground'>
              {format(new Date(o.createdAt), 'MM/dd HH:mm')}
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 font-medium text-foreground'>{o.assetSymbol}</td>
            <td className='whitespace-nowrap px-3 py-1.5'>
              <SideBadge side={o.side} />
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 text-muted-foreground'>{o.type.replace(/_/g, ' ')}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>{formatNumber(o.quantity)}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>
              {o.limitPrice ? formatUsd(o.limitPrice) : '—'}
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 text-muted-foreground'>{o.status.replace(/_/g, ' ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Trades Table ──

export function TradesTable({ trades }: { trades: TradeRow[] }) {
  if (trades.length === 0) {
    return <EmptyState message='No trade history' icon={CandlestickChart} />;
  }

  return (
    <table className='w-full text-left text-sm'>
      <thead>
        <tr className='border-b border-border text-[11px] text-muted-foreground'>
          <th className='px-3 py-1.5 font-medium'>Time</th>
          <th className='px-3 py-1.5 font-medium'>Pair</th>
          <th className='px-3 py-1.5 font-medium'>Side</th>
          <th className='px-3 py-1.5 font-medium'>Type</th>
          <th className='px-3 py-1.5 font-medium'>Price</th>
          <th className='px-3 py-1.5 font-medium'>Qty</th>
          <th className='px-3 py-1.5 font-medium'>Fee</th>
          <th className='px-3 py-1.5 font-medium'>PnL</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id} className='border-b border-border/50 text-xs transition-colors hover:bg-panel-raised/50'>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono text-muted-foreground'>
              {format(new Date(t.executedAt), 'MM/dd HH:mm')}
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 font-medium text-foreground'>{t.assetSymbol}</td>
            <td className='whitespace-nowrap px-3 py-1.5'>
              <SideBadge side={t.side} />
            </td>
            <td className='whitespace-nowrap px-3 py-1.5 text-muted-foreground'>{t.orderType.replace(/_/g, ' ')}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>{formatUsd(t.price)}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-foreground'>{formatNumber(t.quantity)}</td>
            <td className='whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-muted-foreground'>{formatUsd(t.fee)}</td>
            <td className='whitespace-nowrap px-3 py-1.5'>
              <PnLDisplay value={t.pnl} formatted={formatUsd(t.pnl, { signed: true })} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
