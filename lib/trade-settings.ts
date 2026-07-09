const STORAGE_KEY = 'trade_settings_v1';

export interface TradeSettings {
  marketType: 'SPOT' | 'MARGIN';
  orderType: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  leverage: number;
  chartInterval: string;
  candleLimit: number;
}

const DEFAULTS: TradeSettings = {
  marketType: 'SPOT',
  orderType: 'MARKET',
  side: 'BUY',
  positionSide: 'LONG',
  leverage: 2,
  chartInterval: '1h',
  candleLimit: 200,
};

function getKey(asset: string): string {
  return `${STORAGE_KEY}_${asset.replace(/\//g, '_')}`;
}

export const CANDLE_LIMITS = [50, 100, 200, 500, 1000] as const;

/**
 * Returns a sensible default candle limit for a given chart interval.
 * Shorter intervals use fewer candles to avoid visual noise;
 * longer intervals use more candles to provide meaningful historical context.
 */
export function getDefaultCandleLimit(interval: string): number {
  switch (interval) {
    case '1m':
    case '5m':
    case '15m':
      return 100;
    case '1h':
    case '4h':
      return 200;
    case '1D':
      return 500;
    case '1W':
    case '1M':
      return 200;
    default:
      return 200;
  }
}

export function loadTradeSettings(asset: string): TradeSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(getKey(asset));
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveTradeSettings(asset: string, settings: Partial<TradeSettings>) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadTradeSettings(asset);
    const next = { ...current, ...settings };
    localStorage.setItem(getKey(asset), JSON.stringify(next));
  } catch {
    // silent
  }
}
