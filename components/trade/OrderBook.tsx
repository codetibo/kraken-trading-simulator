'use client';

import { memo, useMemo, useState } from 'react';
import { formatUsd, formatNumber } from '@/lib/utils';
import { useTradeStore } from '@/store/tradeStore';
import { usePriceStream } from '@/hooks/usePriceStream';
import { DepthChart } from './DepthChart';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

import type { OrderBookRow } from '@/lib/types/trade';

function generateOrderBook(
  currentPrice: number,
  isAsk: boolean,
  levels = 8,
): OrderBookRow[] {
  const rows: OrderBookRow[] = [];
  const spread = currentPrice * 0.002; // 0.2% spread
  const step = spread / levels;

  let runningTotal = 0;
  let maxSize = 0;

  for (let i = 1; i <= levels; i++) {
    const price = isAsk
      ? currentPrice + spread + step * (i - 1)
      : currentPrice - spread - step * (levels - i);

    // Random-ish size that decreases as we go deeper
    const size = (Math.random() * 2 + 0.5) * (1 - ((i - 1) / levels) * 0.6);
    runningTotal += size;
    if (size > maxSize) maxSize = size;

    rows.push({
      price,
      size,
      total: runningTotal,
      depth: 0,
    });
  }

  // Normalize depth bars
  for (const row of rows) {
    row.depth = row.size / maxSize;
  }

  return isAsk ? rows.reverse() : rows;
}

export const OrderBook = memo(function OrderBook() {
  const selectedPair = useTradeStore(s => s.selectedPair);
  const { priceMap } = usePriceStream();
  const [showDepthChart, setShowDepthChart] = useState(true);

  const currentPrice = priceMap[selectedPair] || 0;

  const asks = useMemo(
    () => (currentPrice > 0 ? generateOrderBook(currentPrice, true) : []),
    [currentPrice],
  );

  const bids = useMemo(
    () => (currentPrice > 0 ? generateOrderBook(currentPrice, false) : []),
    [currentPrice],
  );

  const spread =
    currentPrice > 0
      ? (asks[asks.length - 1]?.price ?? 0) - (bids[0]?.price ?? 0)
      : 0;

  const spreadPercent = currentPrice > 0 ? (spread / currentPrice) * 100 : 0;

  if (currentPrice === 0) {
    return (
      <div className='flex h-full flex-col' aria-busy='true'>
        <div className='border-b border-border px-3 py-2'>
          <h2 className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            Order Book
          </h2>
        </div>
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-xs text-muted-foreground'>Waiting for price...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col' aria-busy='false'>
      <div className='border-b border-border px-3 py-2'>
        <h2 className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          Order Book
        </h2>
      </div>

      <div
        className='flex-1 overflow-y-auto text-[11px]'
        aria-live='polite'
        aria-atomic='true'
        aria-label='Live order book with current bids and asks'
      >
        {/* Header */}
        <div className='flex border-b border-border/50 px-2 py-1 text-[11px] text-muted-foreground'>
          <span className='w-[36%] text-left font-medium'>Price</span>
          <span className='w-[32%] text-right font-medium'>Size</span>
          <span className='w-[32%] text-right font-medium'>Total</span>
        </div>

        {/* Asks (red) */}
        <div className='px-2'>
          {asks.map((row, i) => (
            <div
              key={`ask-${i}`}
              className='relative flex items-center py-[1.5px]'
            >
              <div
                className='pointer-events-none absolute right-0 top-0 h-full bg-negative/8'
                style={{ width: `${row.depth * 100}%` }}
              />
              <span className='z-10 w-[36%] font-mono tabular-nums text-negative'>
                {formatUsd(row.price)}
              </span>
              <span className='z-10 w-[32%] text-right font-mono tabular-nums text-foreground'>
                {formatNumber(row.size, { decimals: 4 })}
              </span>
              <span className='z-10 w-[32%] text-right font-mono tabular-nums text-muted-foreground'>
                {formatNumber(row.total, { decimals: 4 })}
              </span>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className='flex items-center justify-between border-y border-border/50 bg-accent/10 px-2 py-1'>
          <span className='font-mono text-xs tabular-nums font-medium text-foreground'>
            {formatUsd(currentPrice)}
          </span>
          <span className='text-[11px] text-muted-foreground'>
            Spread: {formatUsd(spread)} ({spreadPercent.toFixed(3)}%)
          </span>
        </div>

        {/* Bids (green) */}
        <div className='px-2'>
          {bids.map((row, i) => (
            <div
              key={`bid-${i}`}
              className='relative flex items-center py-[1.5px]'
            >
              <div
                className='pointer-events-none absolute right-0 top-0 h-full bg-positive/8'
                style={{ width: `${row.depth * 100}%` }}
              />
              <span className='z-10 w-[36%] font-mono tabular-nums text-positive'>
                {formatUsd(row.price)}
              </span>
              <span className='z-10 w-[32%] text-right font-mono tabular-nums text-foreground'>
                {formatNumber(row.size, { decimals: 4 })}
              </span>
              <span className='z-10 w-[32%] text-right font-mono tabular-nums text-muted-foreground'>
                {formatNumber(row.total, { decimals: 4 })}
              </span>
            </div>
          ))}
        </div>

        {/* Depth Chart Toggle */}
        <button
          onClick={() => setShowDepthChart(v => !v)}
          className='flex w-full items-center justify-between border-t border-border/50 px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/10'
        >
          <span className='flex items-center gap-1.5'>
            <BarChart3 className='h-3 w-3' />
            Depth Chart
          </span>
          {showDepthChart ? (
            <ChevronDown className='h-3 w-3' />
          ) : (
            <ChevronUp className='h-3 w-3' />
          )}
        </button>

        {/* Depth Chart */}
        {showDepthChart && (
          <div className='border-t border-border/20'>
            <DepthChart
              bids={bids}
              asks={asks}
              currentPrice={currentPrice}
              className='py-1.5'
            />
          </div>
        )}
      </div>
    </div>
  );
});
