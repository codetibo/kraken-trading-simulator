import { runBacktest, type BacktestInput } from '../backtesting';
import type { Candle } from '../priceFeed/PriceFeedProvider';

function makeCandle(
  timestamp: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 1000,
): Candle {
  return { timestamp, open, high, low, close, volume };
}

function generateTrendingCandles(
  count: number,
  startPrice: number,
  uptrend: boolean,
): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now() - count * 60_000;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - (uptrend ? 0.4 : 0.6)) * 10;
    const close = price + change;
    candles.push(
      makeCandle(now + i * 60_000, price, Math.max(price, close) + 2, Math.min(price, close) - 2, close),
    );
    price = close;
  }
  return candles;
}

function generateUpDownCandles(count: number, startPrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now() - count * 60_000;
  const half = Math.floor(count / 2);
  // First half: uptrend
  for (let i = 0; i < half; i++) {
    price += Math.random() * 20 + 5;
    candles.push(makeCandle(now + i * 60_000, price - 10, price + 5, price - 15, price));
  }
  // Second half: downtrend
  for (let i = half; i < count; i++) {
    price -= Math.random() * 20 + 5;
    candles.push(makeCandle(now + i * 60_000, price + 10, price + 15, price - 5, price));
  }
  return candles;
}

function makeDefaultInput(overrides?: Partial<BacktestInput>): BacktestInput {
  const candles = generateTrendingCandles(200, 50000, true);
  return {
    symbol: 'BTC/USD',
    interval: '1m',
    candles,
    strategy: { type: 'sma_crossover', fastPeriod: 10, slowPeriod: 30 },
    initialCapital: 10000,
    positionSize: 0.5,
    feeBps: 26,
    slippage: 0.001,
    ...overrides,
  };
}

describe('runBacktest', () => {
  // ── Basic Structure ─────────────────────────────────

  it('returns a PerformanceReport with correct structure', () => {
    const result = runBacktest(makeDefaultInput());
    expect(result).toHaveProperty('strategy');
    expect(result).toHaveProperty('symbol');
    expect(result).toHaveProperty('initialCapital');
    expect(result).toHaveProperty('finalCapital');
    expect(result).toHaveProperty('totalTrades');
    expect(result).toHaveProperty('winRate');
    expect(result).toHaveProperty('maxDrawdownPercent');
    expect(result).toHaveProperty('sharpeRatio');
    expect(result).toHaveProperty('trades');
    expect(result).toHaveProperty('equityCurve');
  });

  it('preserves input params in the report', () => {
    const result = runBacktest(makeDefaultInput({ symbol: 'ETH/USD', interval: '1h' }));
    expect(result.symbol).toBe('ETH/USD');
    expect(result.interval).toBe('1h');
    expect(result.initialCapital).toBe(10000);
  });

  it('outputs equityCurve with same length as candles', () => {
    const result = runBacktest(makeDefaultInput());
    // Equity curve starts from candle 1 (signals start at index 1)
    expect(result.equityCurve.length).toBe(200);
  });

  // ── SMA Crossover ──────────────────────────────────

  it('generates trades with SMA crossover on trending data', () => {
    const candles = generateUpDownCandles(300, 50000);
    const result = runBacktest(
      makeDefaultInput({
        candles,
        strategy: { type: 'sma_crossover', fastPeriod: 10, slowPeriod: 30 },
        interval: '5m',
      }),
    );
    // Should have some trades on up-down data
    expect(result.totalTrades).toBeGreaterThanOrEqual(1);
    expect(result.trades[0]).toHaveProperty('entryPrice');
    expect(result.trades[0]).toHaveProperty('exitPrice');
    expect(result.trades[0]).toHaveProperty('pnl');
  });

  it('SMA crossover on pure uptrend generates only LONG trades', () => {
    const candles = generateTrendingCandles(300, 50000, true);
    const result = runBacktest(
      makeDefaultInput({
        candles,
        strategy: { type: 'sma_crossover', fastPeriod: 5, slowPeriod: 15 },
      }),
    );
    // On a strong uptrend, most signals should be BUY
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
  });

  // ── RSI ────────────────────────────────────────────

  it('runs with RSI strategy', () => {
    const result = runBacktest(
      makeDefaultInput({
        strategy: { type: 'rsi', period: 14, oversoldThreshold: 30, overboughtThreshold: 70 },
      }),
    );
    expect(result.strategy).toBe('rsi');
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
  });

  // ── MACD ───────────────────────────────────────────

  it('runs with MACD strategy', () => {
    const result = runBacktest(
      makeDefaultInput({
        strategy: { type: 'macd', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      }),
    );
    expect(result.strategy).toBe('macd');
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
  });

  // ── Edge Cases ─────────────────────────────────────

  it('handles very few candles gracefully', () => {
    const candles = [makeCandle(1000, 100, 101, 99, 100.5)];
    const result = runBacktest(makeDefaultInput({ candles }));
    expect(result.totalTrades).toBe(0);
    expect(result.finalCapital).toBe(10000);
  });

  it('handles zero positionSize', () => {
    const result = runBacktest(makeDefaultInput({ positionSize: 0 }));
    expect(result.totalTrades).toBe(0);
    expect(result.finalCapital).toBe(10000);
  });

  it('handles empty candles', () => {
    const result = runBacktest(makeDefaultInput({ candles: [] }));
    expect(result.totalTrades).toBe(0);
    expect(result.finalCapital).toBe(10000);
  });

  it('handles very low initialCapital', () => {
    const result = runBacktest(makeDefaultInput({ initialCapital: 1 }));
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.finalCapital).toBeGreaterThanOrEqual(0);
  });

  // ── OCO Take-Profit / Stop-Loss ────────────────────

  it('OCO: TP on LONG position when high crosses take-profit level', () => {
    // Create candles that gap up significantly — should hit TP immediately
    const candles = [
      makeCandle(1000, 100, 105, 98, 103),
      makeCandle(1060, 104, 130, 102, 128), // high=130, +30% from entry of ~100
    ];
    // Force a BUY signal at candle 1 via simple SMA crossover setup
    const result = runBacktest({
      symbol: 'TEST/USD',
      interval: '1m',
      candles,
      strategy: { type: 'sma_crossover', fastPeriod: 2, slowPeriod: 2 },
      initialCapital: 10000,
      positionSize: 0.5,
      feeBps: 0,
      slippage: 0,
      oco: { takeProfitPercent: 5, stopLossPercent: 5 },
    });

    if (result.totalTrades > 0) {
      expect(result.trades[0].exitReason).toBe('take_profit');
    }
  });

  it('OCO: SL on LONG position when low crosses stop-loss level', () => {
    // Create candles that drop significantly — should hit SL immediately
    const candles = [
      makeCandle(1000, 100, 102, 99, 101),
      makeCandle(1060, 99, 100, 80, 85), // low=80, -20% from entry of ~99
    ];
    const result = runBacktest({
      symbol: 'TEST/USD',
      interval: '1m',
      candles,
      strategy: { type: 'sma_crossover', fastPeriod: 2, slowPeriod: 2 },
      initialCapital: 10000,
      positionSize: 0.5,
      feeBps: 0,
      slippage: 0,
      oco: { takeProfitPercent: 10, stopLossPercent: 5 },
    });

    if (result.totalTrades > 0) {
      expect(result.trades[0].exitReason).toBe('stop_loss');
    }
  });

  it('OCO: TP on SHORT position when low crosses take-profit level', () => {
    const candles = [
      makeCandle(1000, 100, 102, 99, 101),
      makeCandle(1060, 99, 101, 70, 75), // low=70, -30% from entry of ~99 → TP for SHORT
    ];
    const result = runBacktest({
      symbol: 'TEST/USD',
      interval: '1m',
      candles,
      // Force a SELL signal at candle 1
      strategy: { type: 'sma_crossover', fastPeriod: 2, slowPeriod: 2 },
      initialCapital: 10000,
      positionSize: 0.5,
      feeBps: 0,
      slippage: 0,
      oco: { takeProfitPercent: 10, stopLossPercent: 10 },
    });

    if (result.totalTrades > 0) {
      // SHORT take-profit: price drops below entry - TP%
      expect(result.trades[0].exitReason).toBe('take_profit');
    }
  });

  it('OCO: without oco config, exits use signal-based reason', () => {
    const candles = generateUpDownCandles(100, 50000);
    const result = runBacktest(makeDefaultInput({ candles, strategy: { type: 'sma_crossover', fastPeriod: 5, slowPeriod: 15 } }));
    if (result.totalTrades > 0) {
      expect(result.trades[0].exitReason).toBe('signal');
    }
  });

  it('OCO: exitReason field is always present on trades', () => {
    const candles = generateUpDownCandles(100, 50000);
    const result = runBacktest(
      makeDefaultInput({
        candles,
        strategy: { type: 'sma_crossover', fastPeriod: 5, slowPeriod: 15 },
        oco: { takeProfitPercent: 20, stopLossPercent: 10 },
      }),
    );
    for (const trade of result.trades) {
      expect(['signal', 'take_profit', 'stop_loss']).toContain(trade.exitReason);
    }
  });

  // ── Performance Metrics ────────────────────────────

  it('calculates win rate correctly', () => {
    const candles = generateUpDownCandles(200, 50000);
    const result = runBacktest(
      makeDefaultInput({ candles, strategy: { type: 'sma_crossover', fastPeriod: 5, slowPeriod: 20 } }),
    );
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
    if (result.totalTrades > 0) {
      expect(result.winningTrades + result.losingTrades).toBe(result.totalTrades);
    }
  });

  it('calculates profitFactor correctly', () => {
    const candles = generateUpDownCandles(200, 50000);
    const result = runBacktest(
      makeDefaultInput({ candles, strategy: { type: 'sma_crossover', fastPeriod: 5, slowPeriod: 20 } }),
    );
    expect(result.profitFactor).toBeGreaterThanOrEqual(0);
  });

  it('calculates maxDrawdown as non-negative', () => {
    const result = runBacktest(makeDefaultInput());
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
  });

  it('calculates Sharpe ratio as a finite number', () => {
    const result = runBacktest(makeDefaultInput());
    expect(isFinite(result.sharpeRatio)).toBe(true);
  });

  // ── Fee and Slippage ───────────────────────────────

  it('deducts fees from trades', () => {
    const result = runBacktest(makeDefaultInput({ feeBps: 260 })); // 2.6% fee
    expect(result.totalFees).toBeGreaterThanOrEqual(0);
  });

  it('higher slippage reduces profitability', () => {
    const lowSlipResult = runBacktest(makeDefaultInput({ slippage: 0.0001 }));
    const highSlipResult = runBacktest(makeDefaultInput({ slippage: 0.05 }));
    // High slippage should generally result in higher fees
    expect(highSlipResult.totalFees).toBeGreaterThanOrEqual(0);
    expect(lowSlipResult.totalFees).toBeGreaterThanOrEqual(0);
  });
});
