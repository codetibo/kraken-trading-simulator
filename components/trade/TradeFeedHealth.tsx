'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Clock, Gauge, RefreshCw, Activity } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePriceStream } from '@/hooks/usePriceStream';

function formatRelativeTime(msAgo: number): string {
  if (msAgo < 0) return 'now';
  if (msAgo < 1000) return `${msAgo}ms ago`;
  if (msAgo < 60_000) return `${Math.floor(msAgo / 1000)}s ago`;
  if (msAgo < 3_600_000) return `${Math.floor(msAgo / 60_000)}m ago`;
  return `${Math.floor(msAgo / 3_600_000)}h ago`;
}

function formatLatency(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TradeFeedHealth() {
  const {
    priceFeedMode,
    connected,
    lastPriceTimestamp,
    lastPriceUpdateAt,
  } = usePriceStream();

  const [now, setNow] = useState(0);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [symbolCoverage, setSymbolCoverage] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll health endpoint for rate limit + symbol coverage
  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/prices/health', { cache: 'no-store' });
        const data = await res.json();
        if (data.rateLimitRemaining !== null) {
          setRateLimitRemaining(data.rateLimitRemaining);
        }
        setSymbolCoverage(
          `${data.successCount}/${data.successCount + data.errorCount} OK`,
        );
      } catch {
        // Silent
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const isLive = priceFeedMode === 'live';
  const isHealthy = connected;

  const feedLatency = !lastPriceUpdateAt ? null : now - lastPriceUpdateAt;
  const lastUpdateRelative = !lastPriceUpdateAt
    ? 'Never'
    : formatRelativeTime(now - lastPriceUpdateAt);

  const latencyColor =
    feedLatency === null
      ? 'text-muted-foreground'
      : feedLatency < 2000
        ? 'text-positive'
        : feedLatency < 10000
          ? 'text-amber-500'
          : 'text-negative';

  const rateLimitColor =
    rateLimitRemaining === null
      ? 'text-muted-foreground'
      : rateLimitRemaining > 500
        ? 'text-positive'
        : rateLimitRemaining > 100
          ? 'text-amber-500'
          : 'text-negative';

  return (
    <Popover>
      <PopoverTrigger className='cursor-pointer outline-none'>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm transition-colors',
            isLive
              ? isHealthy
                ? 'bg-positive/10 text-positive hover:bg-positive/20'
                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted/70',
          )}
        >
          {isLive ? (
            <Wifi
              className={cn('h-2.5 w-2.5', isHealthy && 'animate-pulse')}
            />
          ) : (
            <WifiOff className='h-2.5 w-2.5' />
          )}
          <span>
            {isLive
              ? isHealthy
                ? 'Live'
                : 'Connecting...'
              : 'Simulated'}
          </span>
        </div>
      </PopoverTrigger>

      <PopoverContent
        side='bottom'
        align='end'
        sideOffset={6}
        className='w-56 p-3'
      >
        <div className='space-y-2.5'>
          {/* Header */}
          <div className='flex items-center gap-2'>
            <Activity className='h-3.5 w-3.5 text-muted-foreground' />
            <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              Feed Health
            </span>
          </div>

          {/* Mode */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              {isLive ? (
                <Wifi
                  className={cn(
                    'h-3 w-3',
                    isHealthy ? 'text-positive' : 'text-amber-500',
                  )}
                />
              ) : (
                <WifiOff className='h-3 w-3 text-muted-foreground' />
              )}
              <span className='text-xs text-muted-foreground'>Source</span>
            </div>
            <span className='text-xs font-medium text-foreground'>
              {isLive ? 'Binance Live' : 'Simulated'}
            </span>
          </div>

          {/* Latency */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <Clock className='h-3 w-3 text-muted-foreground' />
              <span className='text-xs text-muted-foreground'>Latency</span>
            </div>
            <span
              className={cn(
                'font-mono text-xs tabular-nums font-medium',
                latencyColor,
              )}
            >
              {feedLatency !== null ? formatLatency(feedLatency) : '—'}
            </span>
          </div>

          {/* Last Update */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <RefreshCw className='h-3 w-3 text-muted-foreground' />
              <span className='text-xs text-muted-foreground'>Updated</span>
            </div>
            <span className='font-mono text-xs tabular-nums text-foreground'>
              {lastUpdateRelative}
            </span>
          </div>

          {/* Symbols */}
          {symbolCoverage && (
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <Activity className='h-3 w-3 text-muted-foreground' />
                <span className='text-xs text-muted-foreground'>Symbols</span>
              </div>
              <span className='font-mono text-xs tabular-nums text-foreground'>
                {symbolCoverage}
              </span>
            </div>
          )}

          {/* Rate Limit (live mode only) */}
          {isLive && rateLimitRemaining !== null && (
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5'>
                <Gauge className='h-3 w-3 text-muted-foreground' />
                <span className='text-xs text-muted-foreground'>
                  Rate Limit
                </span>
              </div>
              <span
                className={cn(
                  'font-mono text-xs tabular-nums font-medium',
                  rateLimitColor,
                )}
              >
                {rateLimitRemaining}/1200
              </span>
            </div>
          )}

          {/* Timestamp */}
          {lastPriceTimestamp > 0 && (
            <div className='border-t border-border/30 pt-1.5 text-[11px] text-muted-foreground'>
              Last tick:{' '}
              {new Date(lastPriceTimestamp).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
