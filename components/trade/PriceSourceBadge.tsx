'use client';

import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

interface PriceSourceBadgeProps {
  mode: 'live' | 'simulated';
  connected: boolean;
}

/**
 * Small badge that shows the current price feed source (live Binance vs simulated).
 * Placed as an overlay on the trade page so users always know where prices come from.
 */
export function PriceSourceBadge({ mode, connected }: PriceSourceBadgeProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm',
        mode === 'live'
          ? connected
            ? 'bg-positive/10 text-positive'
            : 'bg-amber-500/10 text-amber-500'
          : 'bg-muted/50 text-muted-foreground',
      )}
      title={
        mode === 'live'
          ? connected
            ? 'Live prices from Binance'
            : 'Connecting to Binance...'
          : 'Simulated prices (GBM random walk)'
      }
    >
      {mode === 'live' ? (
        <Wifi className={cn('h-2.5 w-2.5', connected && 'animate-pulse')} />
      ) : (
        <WifiOff className='h-2.5 w-2.5' />
      )}
      <span>
        {mode === 'live' ? (connected ? 'Live' : 'Connecting...') : 'Simulated'}
      </span>
    </div>
  );
}
