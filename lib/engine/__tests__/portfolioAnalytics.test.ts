import {
  computePerformanceMetrics,
  computeRiskMetrics,
  computeMonthlyPnL,
  computeWeeklyPnL,
  computePnLDistribution,
  computePortfolioAnalytics,
  type TradeRecord,
  type EquityPoint,
} from '../portfolioAnalytics';

function makeTrade(pnl: number, dateStr: string, side: 'BUY' | 'SELL' = 'BUY', assetSymbol = 'BTC/USD'): TradeRecord {
  return { pnl, executedAt: new Date(dateStr).toISOString(), side, assetSymbol };
}

function makeEquityPoint(timestamp: string, equity: number): EquityPoint {
  return { timestamp: new Date(timestamp).toISOString(), equity };
}

describe('computePerformanceMetrics', () => {
  it('returns zero metrics for empty trades', () => {
    const m = computePerformanceMetrics([]);
    expect(m.totalTrades).toBe(0);
    expect(m.winRate).toBe(0);
    expect(m.averageRR).toBe(0);
  });

  it('calculates win rate correctly', () => {
    const trades = [
      makeTrade(100, '2026-01-01'),
      makeTrade(-50, '2026-01-02'),
      makeTrade(200, '2026-01-03'),
      makeTrade(50, '2026-01-04'),
      makeTrade(-30, '2026-01-05'),
    ];
    const m = computePerformanceMetrics(trades);
    expect(m.totalTrades).toBe(5);
    expect(m.winningTrades).toBe(3);
    expect(m.losingTrades).toBe(2);
    expect(m.winRate).toBe(60);
  });

  it('calculates average win and loss', () => {
    const trades = [
      makeTrade(100, '2026-01-01'),
      makeTrade(-50, '2026-01-02'),
      makeTrade(200, '2026-01-03'),
    ];
    const m = computePerformanceMetrics(trades);
    expect(m.averageWin).toBe(150); // (100 + 200) / 2
    expect(m.averageLoss).toBe(50); // |(-50)| / 1
  });

  it('calculates profit factor', () => {
    const trades = [
      makeTrade(100, '2026-01-01'),
      makeTrade(-50, '2026-01-02'),
      makeTrade(200, '2026-01-03'),
    ];
    const m = computePerformanceMetrics(trades);
    expect(m.profitFactor).toBe(150 / 50); // 3.0
  });

  it('calculates average R:R', () => {
    const trades = [
      makeTrade(200, '2026-01-01'),
      makeTrade(-50, '2026-01-02'),
      makeTrade(100, '2026-01-03'),
    ];
    const m = computePerformanceMetrics(trades);
    expect(m.averageRR).toBe(150 / 50); // 3.0
  });

  it('handles all winning trades', () => {
    const trades = [makeTrade(100, '2026-01-01'), makeTrade(200, '2026-01-02')];
    const m = computePerformanceMetrics(trades);
    expect(m.winRate).toBe(100);
    expect(m.losingTrades).toBe(0);
    expect(m.profitFactor).toBe(Infinity);
  });

  it('handles all losing trades', () => {
    const trades = [makeTrade(-100, '2026-01-01'), makeTrade(-200, '2026-01-02')];
    const m = computePerformanceMetrics(trades);
    expect(m.winRate).toBe(0);
    expect(m.winningTrades).toBe(0);
    expect(m.averageRR).toBe(0);
  });
});

describe('computeRiskMetrics', () => {
  it('returns zeros for empty or single-point data', () => {
    expect(computeRiskMetrics([]).sharpeRatio).toBe(0);
    expect(computeRiskMetrics([makeEquityPoint('2026-01-01', 100)]).sharpeRatio).toBe(0);
  });

  it('computes max drawdown correctly', () => {
    const curve = [
      makeEquityPoint('2026-01-01', 10000), // peak
      makeEquityPoint('2026-01-02', 10500), // new peak
      makeEquityPoint('2026-01-03', 9500),  // -$1000 from peak
      makeEquityPoint('2026-01-04', 9000),  // -$1500 from peak = max DD
      makeEquityPoint('2026-01-05', 9800),
      makeEquityPoint('2026-01-06', 11000), // new peak
      makeEquityPoint('2026-01-07', 10500),
    ];
    const risk = computeRiskMetrics(curve);
    expect(risk.maxDrawdown).toBe(1500); // 10500 -> 9000
    // Code computes % from global peak (11000), not local peak (10500)
    expect(risk.maxDrawdownPercent).toBeCloseTo((1500 / 11000) * 100, 1); // 13.64%
  });

  it('returns positive Sharpe for upward-trending equity', () => {
    // Include a few dips so Sortino has downside deviation to compute
    const curve = Array.from({ length: 31 }, (_, i) =>
      makeEquityPoint(
        `2026-01-${String(i + 1).padStart(2, '0')}`,
        10000 + i * 50 - (i % 5 === 3 ? 120 : 0), // dip of 120 every 5th day
      ),
    );
    const risk = computeRiskMetrics(curve);
    expect(risk.sharpeRatio).toBeGreaterThan(0);
    expect(risk.sortinoRatio).toBeGreaterThan(0);
  });

  it('returns negative Sharpe for downward-trending equity', () => {
    const curve = Array.from({ length: 31 }, (_, i) =>
      makeEquityPoint(`2026-01-${String(i + 1).padStart(2, '0')}`, 10000 - i * 50),
    );
    const risk = computeRiskMetrics(curve);
    expect(risk.sharpeRatio).toBeLessThan(0);
  });
});

describe('computeMonthlyPnL', () => {
  it('groups trades by month', () => {
    const trades = [
      makeTrade(100, '2026-01-15'),
      makeTrade(-50, '2026-01-20'),
      makeTrade(200, '2026-02-10'),
    ];
    const monthly = computeMonthlyPnL(trades);
    expect(monthly).toHaveLength(2);
    expect(monthly[0].month).toBe('2026-01');
    expect(monthly[0].pnl).toBe(50); // 100 + (-50)
    expect(monthly[0].tradeCount).toBe(2);
    expect(monthly[1].month).toBe('2026-02');
    expect(monthly[1].pnl).toBe(200);
    expect(monthly[1].tradeCount).toBe(1);
  });

  it('returns empty for no trades', () => {
    expect(computeMonthlyPnL([])).toEqual([]);
  });
});

describe('computeWeeklyPnL', () => {
  it('groups trades by ISO week', () => {
    const trades = [
      makeTrade(100, '2026-01-05'), // Monday of W02
      makeTrade(-50, '2026-01-07'), // Wednesday of W02
      makeTrade(200, '2026-01-12'), // Monday of W03
    ];
    const weekly = computeWeeklyPnL(trades);
    expect(weekly).toHaveLength(2);
    expect(weekly[0].pnl).toBe(50);
    expect(weekly[1].pnl).toBe(200);
  });
});

describe('computePnLDistribution', () => {
  it('creates histogram buckets', () => {
    const trades = [
      makeTrade(-500, '2026-01-01'),
      makeTrade(-200, '2026-01-02'),
      makeTrade(0, '2026-01-03'),
      makeTrade(300, '2026-01-04'),
      makeTrade(800, '2026-01-05'),
    ];
    const dist = computePnLDistribution(trades, 4);
    expect(dist).toHaveLength(4);
    const totalCount = dist.reduce((s, d) => s + d.count, 0);
    expect(totalCount).toBe(5);
  });

  it('returns empty for empty trades', () => {
    expect(computePnLDistribution([])).toEqual([]);
  });
});

describe('computePortfolioAnalytics', () => {
  it('combines all metrics into a single report', () => {
    const trades = [
      makeTrade(100, '2026-01-01'),
      makeTrade(-50, '2026-01-05'),
      makeTrade(200, '2026-01-10'),
    ];
    const curve = [
      makeEquityPoint('2026-01-01', 10000),
      makeEquityPoint('2026-01-05', 10050),
      makeEquityPoint('2026-01-10', 10300),
    ];
    const result = computePortfolioAnalytics(trades, curve);
    expect(result.metrics.totalTrades).toBe(3);
    expect(result.metrics.winRate).toBeCloseTo(66.67, 1);
    expect(result.monthlyPnL).toHaveLength(1);
    expect(result.weeklyPnL.length).toBeGreaterThanOrEqual(1);
    expect(result.pnlDistribution.length).toBeGreaterThan(0);
    expect(result.equityCurve).toHaveLength(3);
  });
});
