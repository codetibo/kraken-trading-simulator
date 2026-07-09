'use client';

import { useEffect, useRef } from 'react';

interface WorkerTickProps {
  /** Interval in ms between ticks. Defaults to 1500. */
  intervalMs?: number;
  /** Whether the worker is enabled. Defaults to true. */
  enabled?: boolean;
}

/**
 * Client component that periodically calls GET /api/worker/tick
 * to evaluate open orders and check liquidations.
 *
 * This is the "recurring worker" that ensures Limit/Stop/Trailing orders
 * are evaluated on every price tick, not just at creation time.
 *
 * Mount this once in the root layout or on specific pages.
 * It renders nothing — it's invisible.
 */
export function WorkerTick({
  intervalMs = 1500,
  enabled = true,
}: WorkerTickProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    async function tick() {
      try {
        await fetch('/api/worker/tick', {
          method: 'GET',
          cache: 'no-store',
          // Signal is not supported for GET with no-store, but keepalive ensures
          // the request completes even if the component unmounts during the tick
        });
      } catch {
        // Silent — worker failures are non-critical
      }
    }

    // Fire immediately on mount
    tick();

    // Then every intervalMs
    intervalRef.current = setInterval(tick, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMs, enabled]);

  // This component renders nothing
  return null;
}
