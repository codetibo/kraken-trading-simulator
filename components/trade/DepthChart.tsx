'use client';

import { memo, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatUsd, formatNumber } from '@/lib/utils';

import type { OrderBookRow } from '@/lib/types/trade';

interface DepthPoint {
  price: number;
  bidCumulative: number;
  askCumulative: number;
}

interface DepthChartProps {
  bids: OrderBookRow[];
  asks: OrderBookRow[];
  currentPrice: number;
  className?: string;
}

/** Prepare merged depth data from sorted bid and ask arrays */
function buildDepthData(bids: OrderBookRow[], asks: OrderBookRow[]): DepthPoint[] {
  // Bids are sorted ascending by price
  // Asks are sorted ascending by price
  // We merge all unique price points into one sorted array

  const allPrices = new Set<number>();
  const bidMap = new Map<number, number>();
  const askMap = new Map<number, number>();

  // Bids: cumulative from the lowest price upward
  for (const b of bids) {
    allPrices.add(b.price);
    bidMap.set(b.price, b.total);
  }

  // Asks: cumulative from the highest price downward
  // The ask total is cumulative from low to high, but for depth chart
  // we want cumulative from high to low (reversed)
  const askTotal = asks.length > 0 ? asks[asks.length - 1].total : 0;
  for (const a of asks) {
    allPrices.add(a.price);
    askMap.set(a.price, a.total);
  }

  const sortedPrices = Array.from(allPrices).sort((a, b) => a - b);

  const result: DepthPoint[] = [];
  let maxBidCumulative = 0;

  // First pass: compute bid cumulative (ascending)
  const bidCumulativeAt = new Map<number, number>();
  for (const price of sortedPrices) {
    const bidVal = bidMap.get(price) ?? 0;
    const cumulative = Math.max(maxBidCumulative, bidVal);
    maxBidCumulative = cumulative;
    bidCumulativeAt.set(price, cumulative);
  }

  // Second pass: compute ask cumulative (descending)
  const askCumulativeAt = new Map<number, number>();
  for (let i = sortedPrices.length - 1; i >= 0; i--) {
    const price = sortedPrices[i];
    // For ascending asks, the cumulative at price P is total - volume below P
    // But we have total from the ask table which is already cumulative ascending.
    // For depth chart, we want: at price P, cumulative ask = total volume at prices >= P
    // = askTotal - (volume strictly below P)
    // Using the ask cumulative from the table: at index i, cumulative = sum of asks[0..i]
    // For depth chart from right: cumulative at price P = askTotal - previousCumulative
    const prevAskCumulative = i > 0 ? (askMap.get(sortedPrices[i - 1]) ?? 0) : 0;
    const cumFromRight = askTotal - prevAskCumulative;
    askCumulativeAt.set(price, cumFromRight);
  }

  // Build final points
  for (const price of sortedPrices) {
    result.push({
      price,
      bidCumulative: bidCumulativeAt.get(price) ?? 0,
      askCumulative: askCumulativeAt.get(price) ?? 0,
    });
  }

  return result;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload || !label) return null;

  const bidValue = payload.find(p => p.dataKey === 'bidCumulative')?.value ?? 0;
  const askValue = payload.find(p => p.dataKey === 'askCumulative')?.value ?? 0;

  return (
    <div className='rounded-md border border-border bg-popover px-3 py-2 shadow-md text-xs'>
      <div className='mb-1 font-medium text-foreground'>
        {formatUsd(label)}
      </div>
      <div className='flex items-center gap-2'>
        <span className='h-2 w-2 rounded-sm bg-positive' />
        <span className='text-muted-foreground'>Bids:</span>
        <span className='font-mono tabular-nums text-foreground'>
          {formatNumber(bidValue, { decimals: 4 })}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <span className='h-2 w-2 rounded-sm bg-negative' />
        <span className='text-muted-foreground'>Asks:</span>
        <span className='font-mono tabular-nums text-foreground'>
          {formatNumber(askValue, { decimals: 4 })}
        </span>
      </div>
    </div>
  );
}

export const DepthChart = memo(function DepthChart({ bids, asks, currentPrice, className = '' }: DepthChartProps) {
  const depthData = useMemo(
    () => buildDepthData(bids, asks),
    [bids, asks],
  );

  const totalBidVolume = useMemo(
    () => (bids.length > 0 ? bids[bids.length - 1].total : 0),
    [bids],
  );
  const totalAskVolume = useMemo(
    () => (asks.length > 0 ? asks[asks.length - 1].total : 0),
    [asks],
  );
  const depthRatio =
    totalBidVolume + totalAskVolume > 0
      ? (totalBidVolume / (totalBidVolume + totalAskVolume)) * 100
      : 50;

  if (depthData.length < 2) {
    return (
      <div className={`flex items-center justify-center py-6 ${className}`}>
        <p className='text-[11px] text-muted-foreground'>
          Waiting for depth data...
        </p>
      </div>
    );
  }

  const minPrice = depthData[0].price;
  const maxPrice = depthData[depthData.length - 1].price;

  // Find the highest y value for domain padding
  const maxVolume = Math.max(
    ...depthData.map(d => Math.max(d.bidCumulative, d.askCumulative)),
  );

  return (
    <div className={className}>
      {/* Depth percentage bar */}
      <div className='mb-1 flex items-center gap-2 px-2'>
        <div className='flex-1'>
          <div className='flex h-1.5 w-full overflow-hidden rounded-full bg-muted-foreground/20'>
            <div
              className='h-full rounded-l-full bg-positive/60 transition-all duration-300'
              style={{ width: `${depthRatio}%` }}
            />
            <div
              className='h-full rounded-r-full bg-negative/60 transition-all duration-300'
              style={{ width: `${100 - depthRatio}%` }}
            />
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <span className='h-1.5 w-1.5 rounded-full bg-positive' />
            Bids: {formatNumber(totalBidVolume, { decimals: 2 })}
          </span>
          <span className='flex items-center gap-1'>
            <span className='h-1.5 w-1.5 rounded-full bg-negative' />
            Asks: {formatNumber(totalAskVolume, { decimals: 2 })}
          </span>
        </div>
      </div>

      {/* Depth chart */}
      <div className='h-32 w-full md:h-40'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart
            data={depthData}
            margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
          >
            <defs>
              <linearGradient id='bidGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#22c55e' stopOpacity={0.35} />
                <stop offset='95%' stopColor='#22c55e' stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id='askGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#ef4444' stopOpacity={0.35} />
                <stop offset='95%' stopColor='#ef4444' stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray='2 2'
              stroke='hsl(var(--border))'
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey='price'
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000
                  ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
                  : v.toFixed(v >= 1 ? 2 : v >= 0.01 ? 4 : 6)
              }
              domain={[minPrice, maxPrice]}
              type='number'
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000
                  ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
                  : v.toFixed(2)
              }
              domain={[0, maxVolume * 1.15]}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '2 2' }} />
            <Area
              type='stepAfter'
              dataKey='bidCumulative'
              stroke='#22c55e'
              strokeWidth={1.5}
              fill='url(#bidGradient)'
              dot={false}
              activeDot={{ r: 3, fill: '#22c55e', stroke: 'none' }}
              isAnimationActive={false}
            />
            <Area
              type='stepAfter'
              dataKey='askCumulative'
              stroke='#ef4444'
              strokeWidth={1.5}
              fill='url(#askGradient)'
              dot={false}
              activeDot={{ r: 3, fill: '#ef4444', stroke: 'none' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className='flex items-center justify-between border-t border-border/30 px-2 pt-1 text-[11px] text-muted-foreground'>
        <span>
          {formatUsd(minPrice)}
        </span>
        <span className='font-medium text-foreground/70'>
          {formatUsd(currentPrice)}
        </span>
        <span>
          {formatUsd(maxPrice)}
        </span>
      </div>
    </div>
  );
});
