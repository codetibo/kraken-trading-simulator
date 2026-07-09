import type { IndicatorId } from '@/lib/indicators';

export type ChartType = 'candlestick' | 'line' | 'area';
export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M';

import type { Candle } from '@/lib/engine/priceFeed/PriceFeedProvider';

export type { Candle };

export function getCssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim() || fallback
  );
}

export function getChartTheme() {
  return {
    textColor: getCssVar('lc-text', '#9ca3af'),
    gridColor: getCssVar('lc-grid', 'rgba(255,255,255,0.04)'),
    crosshairColor: getCssVar('lc-crosshair', 'rgba(255,255,255,0.15)'),
    borderColor: getCssVar('lc-border', 'rgba(255,255,255,0.08)'),
    candleUp: getCssVar('lc-positive', '#22c55e'),
    candleDown: getCssVar('lc-negative', '#ef4444'),
  };
}

export const INDICATOR_COLORS: Record<IndicatorId, string> = {
  sma: '#f59e0b',
  ema: '#6366f1',
  rsi: '#a855f7',
  macd: '#22d3ee',
  bollinger: '#22c55e',
};

export const FULL_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'] as const;
export const SIMPLIFIED_INTERVALS = ['1m', '5m', '1h', '1D', '1W', '1M'] as const;

export const ALL_SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD'];
