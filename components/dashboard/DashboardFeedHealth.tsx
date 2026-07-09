'use client';

import { useEffect, useState } from 'react';
import { usePriceStream } from '@/hooks/usePriceStream';
import { FeedHealthIndicator } from './FeedHealthIndicator';

interface HealthApiResponse {
  mode: 'live' | 'simulated';
  connected: boolean;
  successCount: number;
  errorCount: number;
  rateLimitRemaining: number | null;
}

export function DashboardFeedHealth() {
  const {
    priceFeedMode,
    connected,
    lastPriceTimestamp,
    lastPriceUpdateAt,
  } = usePriceStream();

  const [healthData, setHealthData] = useState<{
    successCount: number;
    errorCount: number;
    rateLimitRemaining: number | null;
  } | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/prices/health', { cache: 'no-store' });
        const data: HealthApiResponse = await res.json();
        setHealthData({
          successCount: data.successCount,
          errorCount: data.errorCount,
          rateLimitRemaining: data.rateLimitRemaining,
        });
      } catch {
        // Silent
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FeedHealthIndicator
      priceFeedMode={priceFeedMode}
      connected={connected}
      lastPriceTimestamp={lastPriceTimestamp}
      lastPriceUpdateAt={lastPriceUpdateAt}
      rateLimitRemaining={healthData?.rateLimitRemaining ?? null}
      healthData={healthData ?? undefined}
    />
  );
}
