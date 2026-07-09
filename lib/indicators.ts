/**
 * Technical indicator calculations for the trading chart.
 * All functions operate on arrays of closing prices (most recent last).
 * Returned arrays have nulls at positions where the indicator cannot be computed.
 */

/**
 * Simple Moving Average.
 * Returns an array where index i contains SMA(period) ending at i, or null if i < period - 1.
 */
export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period - 1) {
      if (i >= period) sum -= data[i - period];
      result[i] = sum / period;
    }
  }
  return result;
}

/**
 * Exponential Moving Average.
 * Uses the SMA of the first `period` values as the seed, then the EMA formula.
 */
export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const multiplier = 2 / (period + 1);

  // Seed with SMA of first period values
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  if (data.length >= period) {
    result[period - 1] = sum / period;
  }

  // Compute EMA
  for (let i = period; i < data.length; i++) {
    const prevEma = result[i - 1]!;
    result[i] = (data[i] - prevEma) * multiplier + prevEma;
  }

  return result;
}

/**
 * Relative Strength Index (Wilder's method).
 * Returns RSI values where index i has a value or null if i < period.
 */
export function rsi(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);

  if (data.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  // First average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));

  // Subsequent values (Wilder smoothing)
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    result[i] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence).
 * Returns MACD line, signal line, and histogram arrays.
 */
export function macd(
  data: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEma = ema(data, fastPeriod);
  const slowEma = ema(data, slowPeriod);

  const macdLine: (number | null)[] = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdLine[i] = fastEma[i]! - slowEma[i]!;
    }
  }

  // Signal line is EMA of MACD line
  const nonNullMacd = macdLine.map(v => v !== null ? v : 0);
  const signalLine = ema(nonNullMacd, signalPeriod);

  // Only keep signal values where MACD was valid
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] === null) {
      signalLine[i] = null;
    }
  }

  // Histogram = MACD line - Signal line
  const histogram: (number | null)[] = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i]! - signalLine[i]!;
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Bollinger Bands.
 * Middle band = SMA, upper = middle + k * stddev, lower = middle - k * stddev.
 */
export function bollinger(
  data: number[],
  period = 20,
  stddevMultiplier = 2,
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const middle = sma(data, period);
  const upper: (number | null)[] = new Array(data.length).fill(null);
  const lower: (number | null)[] = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    const mean = middle[i]!;
    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSqDiff += (data[j] - mean) ** 2;
    }
    const stddev = Math.sqrt(sumSqDiff / period);
    upper[i] = mean + stddevMultiplier * stddev;
    lower[i] = mean - stddevMultiplier * stddev;
  }

  return { upper, middle, lower };
}

/**
 * Converts indicator data (with nulls) and candle timestamps
 * into lightweight-charts-compatible data points.
 */
export function toLineData(
  values: (number | null)[],
  timestamps: number[],
): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) {
      result.push({ time: timestamps[i] / 1000, value: values[i]! });
    }
  }
  return result;
}

/** Type for indicator definitions */
export type IndicatorId = 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger';

export interface IndicatorConfig {
  id: IndicatorId;
  label: string;
  params: Record<string, number>;
  color: string;
}

export const INDICATOR_DEFAULTS: IndicatorConfig[] = [
  { id: 'sma', label: 'SMA', params: { period: 20 }, color: '#f59e0b' },
  { id: 'ema', label: 'EMA', params: { period: 20 }, color: '#6366f1' },
  { id: 'rsi', label: 'RSI', params: { period: 14 }, color: '#a855f7' },
  { id: 'macd', label: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, color: '#22d3ee' },
  { id: 'bollinger', label: 'BB', params: { period: 20, stddev: 2 }, color: '#22c55e' },
];

/**
 * Compute all active indicators and return data ready for chart series.
 * timestamps and closes should be the same length.
 */
interface IndicatorResult {
  sma?: { lineData: { time: number; value: number }[] };
  ema?: { lineData: { time: number; value: number }[] };
  rsi?: { lineData: { time: number; value: number }[] };
  macd?: {
    macdLine: { time: number; value: number }[];
    signalLine: { time: number; value: number }[];
    histogram: { time: number; value: number; color: string }[];
  };
  bollinger?: {
    upper: { time: number; value: number }[];
    middle: { time: number; value: number }[];
    lower: { time: number; value: number }[];
  };
}

export function computeIndicators(
  closes: number[],
  timestamps: number[],
  active: IndicatorId[],
): IndicatorResult {
  const result: IndicatorResult = {};

  if (active.includes('sma')) {
    const values = sma(closes, 20);
    result.sma = { lineData: toLineData(values, timestamps) };
  }
  if (active.includes('ema')) {
    const values = ema(closes, 20);
    result.ema = { lineData: toLineData(values, timestamps) };
  }
  if (active.includes('rsi')) {
    const values = rsi(closes, 14);
    result.rsi = { lineData: toLineData(values, timestamps) };
  }
  if (active.includes('macd')) {
    const { macdLine, signalLine, histogram } = macd(closes, 12, 26, 9);
    result.macd = {
      macdLine: toLineData(macdLine, timestamps),
      signalLine: toLineData(signalLine, timestamps),
      histogram: histogram.map((v, idx) =>
        v !== null ? { time: timestamps[idx] / 1000, value: v, color: v >= 0 ? '#22c55e' : '#ef4444' } : null,
      ).filter((x): x is NonNullable<typeof x> => x !== null),
    };
  }
  if (active.includes('bollinger')) {
    const { upper, middle, lower } = bollinger(closes, 20, 2);
    result.bollinger = {
      upper: toLineData(upper, timestamps),
      middle: toLineData(middle, timestamps),
      lower: toLineData(lower, timestamps),
    };
  }

  return result;
}
