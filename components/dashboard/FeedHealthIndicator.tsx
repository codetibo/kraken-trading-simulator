'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Clock, Activity, Gauge, RefreshCw } from 'lucide-react';

interface FeedHealthIndicatorProps {
  priceFeedMode: 'live' | 'simulated';
  connected: boolean;
  lastPriceTimestamp: number;
  lastPriceUpdateAt: number;
  rateLimitRemaining: number | null;
  /** Optional data from polling /api/prices/health for richer status */
  healthData?: {
    successCount: number;
    errorCount: number;
  };
}

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

export function FeedHealthIndicator({
  priceFeedMode,
  connected,
  lastPriceTimestamp,
  lastPriceUpdateAt,
  rateLimitRemaining,
  healthData,
}: FeedHealthIndicatorProps) {
  // Tick every second so latency/relative time display updates in real-time
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const feedLatency = !lastPriceUpdateAt ? null : now - lastPriceUpdateAt;
  const lastUpdateRelative = !lastPriceUpdateAt ? 'Never' : formatRelativeTime(now - lastPriceUpdateAt);

  const isLive = priceFeedMode === 'live';
  const isHealthy = connected;

  // Rate limit usage color
  const rateLimitColor =
    rateLimitRemaining === null
      ? 'text-muted-foreground'
      : rateLimitRemaining > 500
        ? 'text-positive'
        : rateLimitRemaining > 100
          ? 'text-amber-500'
          : 'text-negative';

  // Latency color
  const latencyColor =
    feedLatency === null
      ? 'text-muted-foreground'
      : feedLatency < 2000
        ? 'text-positive'
        : feedLatency < 10000
          ? 'text-amber-500'
          : 'text-negative';

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          <Activity className='h-3.5 w-3.5' />
          Price Feed Health
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* Mode & Connection Status */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {isLive ? (
              <Wifi
                className={cn(
                  'h-4 w-4',
                  isHealthy ? 'text-positive' : 'text-amber-500',
                )}
              />
            ) : (
              <WifiOff className='h-4 w-4 text-muted-foreground' />
            )}
            <span className='text-sm font-medium text-foreground'>
              {isLive ? 'Binance Live' : 'Simulated'}
            </span>
          </div>
          <Badge
            variant='outline'
            className={cn(
              'text-[11px]',
              isHealthy
                ? 'border-positive/30 text-positive'
                : 'border-amber-500/30 text-amber-500',
            )}
          >
            <span
              className={cn(
                'mr-1 inline-block h-1.5 w-1.5 rounded-full',
                isHealthy ? 'bg-positive animate-pulse' : 'bg-amber-500',
              )}
            />
            {isHealthy ? 'Connected' : isLive ? 'Reconnecting...' : 'Active'}
          </Badge>
        </div>

        {/* Feed Latency */}
        <div className='flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5'>
          <div className='flex items-center gap-1.5'>
            <Clock className='h-3 w-3 text-muted-foreground' />
            <span className='text-xs text-muted-foreground'>Feed Latency</span>
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

        {/* Last Price Update */}
        <div className='flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5'>
          <div className='flex items-center gap-1.5'>
            <RefreshCw className='h-3 w-3 text-muted-foreground' />
            <span className='text-xs text-muted-foreground'>Last Update</span>
          </div>
          <span className='font-mono text-xs tabular-nums text-foreground'>
            {lastUpdateRelative}
          </span>
        </div>

        {/* Symbols Coverage (from health data) */}
        {healthData && (
          <div className='flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5'>
            <div className='flex items-center gap-1.5'>
              <Activity className='h-3 w-3 text-muted-foreground' />
              <span className='text-xs text-muted-foreground'>Symbols</span>
            </div>
            <span className='font-mono text-xs tabular-nums text-foreground'>
              {healthData.successCount}/{healthData.successCount + healthData.errorCount} OK
            </span>
          </div>
        )}

        {/* Rate Limit Remaining (live mode only) */}
        {isLive && rateLimitRemaining !== null && (
          <div className='flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5'>
            <div className='flex items-center gap-1.5'>
              <Gauge className='h-3 w-3 text-muted-foreground' />
              <span className='text-xs text-muted-foreground'>
                Rate Limit Remaining
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
          <div className='border-t border-border/30 pt-2 text-[11px] text-muted-foreground'>
            Last tick:{' '}
            {new Date(lastPriceTimestamp).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
