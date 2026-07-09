'use client';

import { useEffect, useRef, useState } from 'react';

export interface LivePrice {
  assetSymbol: string;
  price: number;
  timestamp: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

/**
 * Hook that subscribes to the SSE price stream and returns
 * the latest price map and ticker data.
 *
 * Falls back to polling /api/market every 3 seconds if SSE fails.
 * Cleans up all intervals and event sources on unmount.
 */
export function usePriceStream() {
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [connected, setConnected] = useState(false);
  const [priceFeedMode, setPriceFeedMode] = useState<'live' | 'simulated'>('live');
  const [lastPriceTimestamp, setLastPriceTimestamp] = useState<number>(0);
  const [lastPriceUpdateAt, setLastPriceUpdateAt] = useState<number>(0);
  // Store cleanup functions in refs so effect cleanup can reach them
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    function clearPolling() {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
        pollingCleanupRef.current = null;
      }
    }

    function startPolling() {
      if (cancelled) return;

      async function poll() {
        if (cancelled) return;
        try {
          const res = await fetch('/api/market', { cache: 'no-store' });
          const data = await res.json();
          if (!cancelled && data.tickers) {
            setTickers(data.tickers);
            const map: Record<string, number> = {};
            for (const t of data.tickers) {
              map[t.symbol] = t.price;
            }
            setPriceMap((prev) => ({ ...prev, ...map }));
          }
        } catch {
          // Silent
        }
      }

      poll();
      const id = setInterval(poll, 3000);

      // Try to reconnect SSE every 30 seconds
      const reconnectTimer = setTimeout(() => {
        if (!cancelled && !eventSourceRef.current) {
          connectSSE();
        }
      }, 30000);

      pollingCleanupRef.current = () => {
        clearInterval(id);
        clearTimeout(reconnectTimer);
      };
    }

    function connectSSE() {
      if (cancelled) return;

      clearPolling();

      const es = new EventSource('/api/prices/stream');
      eventSourceRef.current = es;

      es.addEventListener('connected', (event) => {
        if (cancelled) return;
        setConnected(true);
        try {
          const data = JSON.parse(event.data);
          if (data.mode) {
            setPriceFeedMode(data.mode);
          }
        } catch {
          // Ignore malformed connected data
        }
      });

      es.addEventListener('price', (event) => {
        if (cancelled) return;
        try {
          const data: LivePrice = JSON.parse(event.data);
          setPriceMap((prev) => ({
            ...prev,
            [data.assetSymbol]: data.price,
          }));
          setLastPriceTimestamp(data.timestamp);
          setLastPriceUpdateAt(Date.now());
        } catch {
          // Ignore malformed data
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (!cancelled) {
          setConnected(false);
          startPolling();
        }
      };
    }

    // Fetch ticker metadata (change%, high/low) every 10s
    async function fetchTickers() {
      if (cancelled) return;
      try {
        const res = await fetch('/api/market', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && data.tickers) {
          setTickers(data.tickers);
        }
      } catch {
        // Silent
      }
    }

    fetchTickers();
    const tickerInterval = setInterval(fetchTickers, 10000);

    connectSSE();

    return () => {
      cancelled = true;
      clearPolling();
      clearInterval(tickerInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return {
    priceMap,
    tickers,
    connected,
    priceFeedMode,
    lastPriceTimestamp,
    lastPriceUpdateAt,
  };
}
