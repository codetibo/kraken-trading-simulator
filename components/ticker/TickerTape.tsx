'use client';

import { cn, formatPercent, formatUsd } from '@/lib/utils';
import { PositiveArrow, NegativeArrow } from '@/lib/color-blind';
import { usePriceStream } from '@/hooks/usePriceStream';

export function TickerTape() {
  const { tickers, connected } = usePriceStream();

  if (tickers.length === 0) {
    return <div className='h-9 border-b border-border bg-muted/50' />;
  }

  // Double the list for seamless marquee scroll
  const loopItems = [...tickers, ...tickers];

  return (
    <div
      className='relative h-9 overflow-hidden border-b border-border bg-muted/50'
      aria-live='polite'
      aria-atomic='true'
    >
      <div className='absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent' />
      <div className='absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent' />

      {/* Connection indicator */}
      <div className='absolute right-12 top-1/2 z-20 -translate-y-1/2'>
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            connected ? 'bg-positive' : 'bg-amber-500',
          )}
        />
      </div>

      <div
        className='flex h-full w-max animate-marquee items-center gap-8 whitespace-nowrap px-4 font-mono text-xs'
        role='list'
        aria-label='Live cryptocurrency prices'
      >
        {loopItems.map((t, i) => (
          <div key={`${t.symbol}-${i}`} className='flex items-center gap-2'>
            <span className='text-foreground/60'>{t.symbol}</span>
            <span className='text-foreground'>{formatUsd(t.price)}</span>
            <span
              className={cn(
                'tabular-nums',
                t.changePercent24h >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {t.changePercent24h >= 0 ? <PositiveArrow className='mr-0.5 inline h-2.5 w-2.5' /> : <NegativeArrow className='mr-0.5 inline h-2.5 w-2.5' />}
              {formatPercent(t.changePercent24h, { signed: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
