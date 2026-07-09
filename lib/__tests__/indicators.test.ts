import { sma, ema, rsi, macd, bollinger, toLineData } from '@/lib/indicators';

describe('sma', () => {
  it('calculates simple moving average', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const result = sma(data, 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeCloseTo(2, 5);
    expect(result[3]).toBeCloseTo(3, 5);
    expect(result[4]).toBeCloseTo(4, 5);
    expect(result[5]).toBeCloseTo(5, 5);
  });

  it('returns all nulls when data is shorter than period', () => {
    const result = sma([1, 2], 5);
    expect(result.every(v => v === null)).toBe(true);
  });

  it('handles single-value data', () => {
    const result = sma([10], 1);
    expect(result[0]).toBeCloseTo(10, 5);
  });
});

describe('ema', () => {
  it('calculates exponential moving average', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = ema(data, 3);
    // Seed (SMA of first 3): (1+2+3)/3 = 2
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeCloseTo(2, 5);
    // EMA(4) = (4-2)*0.5 + 2 = 3
    expect(result[3]).toBeCloseTo(3, 5);
    // EMA(5) = (5-3)*0.5 + 3 = 4
    expect(result[4]).toBeCloseTo(4, 5);
  });

  it('returns all nulls when data is shorter than period', () => {
    const result = ema([1, 2], 5);
    expect(result.every(v => v === null)).toBe(true);
  });
});

describe('rsi', () => {
  it('returns nulls for the first period values', () => {
    const data = Array.from({ length: 20 }, (_, i) => 50 + Math.sin(i) * 10);
    const result = rsi(data, 14);
    for (let i = 0; i < 14; i++) {
      expect(result[i]).toBeNull();
    }
    expect(result[14]).not.toBeNull();
  });

  it('returns 100 for continuously rising prices', () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = rsi(data, 14);
    expect(result[14]).toBeCloseTo(100, 0);
  });

  it('returns 0 for continuously falling prices', () => {
    const data = Array.from({ length: 20 }, (_, i) => 100 - i);
    const result = rsi(data, 14);
    expect(result[14]).toBeCloseTo(0, 0);
  });
});

describe('macd', () => {
  it('computes MACD line, signal line, and histogram', () => {
    const data = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.5) * 20);
    const { macdLine, signalLine, histogram } = macd(data, 12, 26, 9);

    // First 25 values should be null (need slow period + signal period)
    // Actually: need 26 (slow) + 9 (signal) - 1 = 34 non-null values
    expect(macdLine.some(v => v !== null)).toBe(true);
    expect(signalLine.some(v => v !== null)).toBe(true);
    expect(histogram.some(v => v !== null)).toBe(true);

    // MACD and signal should have same length
    expect(macdLine.length).toBe(data.length);
    expect(signalLine.length).toBe(data.length);
    expect(histogram.length).toBe(data.length);
  });

  it('returns all nulls for too-short data', () => {
    const { macdLine, signalLine, histogram } = macd([1, 2, 3], 12, 26, 9);
    expect(macdLine.every(v => v === null)).toBe(true);
    expect(signalLine.every(v => v === null)).toBe(true);
    expect(histogram.every(v => v === null)).toBe(true);
  });
});

describe('bollinger', () => {
  it('computes upper, middle, and lower bands', () => {
    const data = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.3) * 10);
    const { upper, middle, lower } = bollinger(data, 20, 2);

    // First 19 values should be null
    for (let i = 0; i < 19; i++) {
      expect(upper[i]).toBeNull();
      expect(middle[i]).toBeNull();
      expect(lower[i]).toBeNull();
    }

    // Valid values should have proper ordering
    for (let i = 19; i < data.length; i++) {
      expect(upper[i]).not.toBeNull();
      expect(middle[i]).not.toBeNull();
      expect(lower[i]).not.toBeNull();
      expect(upper[i]! >= middle[i]!).toBe(true);
      expect(middle[i]! >= lower[i]!).toBe(true);
    }
  });
});

describe('toLineData', () => {
  it('converts values and timestamps to chart data', () => {
    const values = [null, null, 3, 4, 5];
    const timestamps = [1000, 2000, 3000, 4000, 5000];
    const result = toLineData(values, timestamps);
    expect(result).toEqual([
      { time: 3, value: 3 },
      { time: 4, value: 4 },
      { time: 5, value: 5 },
    ]);
  });
});
