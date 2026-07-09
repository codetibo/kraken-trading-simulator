/**
 * Portfolio Analytics Engine
 *
 * Computes performance metrics from trade history and equity curve data:
 *   - Sharpe Ratio (risk-adjusted return)
 *   - Sortino Ratio (downside risk-adjusted return)
 *   - Max Drawdown (peak-to-trough decline)
 *   - Win/Loss Rate & Count
 *   - Average Risk-Reward Ratio
 *   - Monthly & Weekly PnL Breakdown
 *   - Trade Distribution (profit/loss histogram)
 */

/** A single completed trade used for performance analysis. */
export interface TradeRecord {
  /** Profit or loss in quote currency. */
  pnl: number;
  /** ISO date string of when the trade was executed. */
  executedAt: string;
  /** Trade direction. */
  side: 'BUY' | 'SELL';
  /** Trading pair symbol. */
  assetSymbol: string;
}

/** A point on the equity curve time series. */
export interface EquityPoint {
  /** ISO date string of this data point. */
  timestamp: string;
  /** Total account equity at this point in time. */
  equity: number;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

interface PerformanceMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  averageRR: number;
  totalPnl: number;
  totalFees: number;
}

interface MonthlyPnL {
  month: string; // "2026-01"
  pnl: number;
  tradeCount: number;
}

interface WeeklyPnL {
  week: string; // "2026-W03"
  pnl: number;
  tradeCount: number;
}

interface PnLDistribution {
  /** Bucket label like "-500 to -250", "-250 to 0", "0 to 250", etc. */
  bucket: string;
  count: number;
  /** Lower bound of the bucket */
  min: number;
  /** Upper bound of the bucket */
  max: number;
}

/**
 * Complete portfolio analytics result.
 * Combines performance metrics, time-series breakdowns, and equity curve.
 *
 * Note: sharpeRatio, sortinoRatio, maxDrawdown, and maxDrawdownPercent are
 * computed from the equity curve, not from individual trade PnLs.
 */
export interface PortfolioAnalytics {
  /** Aggregate performance metrics. */
  metrics: PerformanceMetrics;
  /** Monthly PnL breakdown. */
  monthlyPnL: MonthlyPnL[];
  /** Weekly PnL breakdown. */
  weeklyPnL: WeeklyPnL[];
  /** PnL distribution histogram buckets. */
  pnlDistribution: PnLDistribution[];
  /** Time series of total account equity. */
  equityCurve: EquityPoint[];
}

// ---------------------------------------------------------------------------
// Calculations
// ---------------------------------------------------------------------------

/**
 * Compute aggregate performance metrics from a list of trades.
 *
 * Covers: win/loss counts, win rate, average win/loss, profit factor,
 * average risk-reward ratio, total PnL, and total fees.
 *
 * Note: sharpeRatio, sortinoRatio, maxDrawdown, and maxDrawdownPercent
 * are returned as 0 from this function — they are populated by
 * computePortfolioAnalytics using the equity curve instead.
 *
 * @param trades - Array of completed trade records.
 * @returns Performance metrics object.
 *
 * Edge cases:
 *   - Empty trades array: all metrics return 0, winRate = 0, totalTrades = 0.
 *   - All trades winning or all losing: profitFactor may be Infinity or 0.
 *   - Fees are not tracked at this level; totalFees always returns 0.
 */
export function computePerformanceMetrics(trades: TradeRecord[]): PerformanceMetrics {
  const totalTrades = trades.length;
  const winning = trades.filter((t) => t.pnl > 0);
  const losing = trades.filter((t) => t.pnl <= 0);
  const winningTrades = winning.length;
  const losingTrades = losing.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const averageWin = winningTrades > 0
    ? winning.reduce((s, t) => s + t.pnl, 0) / winningTrades
    : 0;
  const averageLoss = losingTrades > 0
    ? Math.abs(losing.reduce((s, t) => s + t.pnl, 0)) / losingTrades
    : 0;
  const profitFactor = averageLoss > 0 ? averageWin / averageLoss : averageWin > 0 ? Infinity : 0;

  // Average R:R (Risk-Reward) = average win / average loss
  const averageRR = averageLoss > 0 ? averageWin / averageLoss : 0;

  const totalFees = 0; // fees are embedded in trade PnL; not separately tracked at this level

  return {
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    averageWin,
    averageLoss,
    profitFactor,
    averageRR,
    totalPnl,
    totalFees,
  };
}

/**
 * Compute risk-adjusted performance metrics from an equity curve.
 *
 * Uses ~365 periods/year for annualization (assuming daily data).
 * Assumes risk-free rate ≈ 0.
 *
 * @param equityCurve - Time series of account equity values.
 * @returns Object containing annualized Sharpe ratio, Sortino ratio,
 *          max drawdown (absolute), and max drawdown (percentage).
 *
 * Edge cases:
 *   - Fewer than 2 equity points: all metrics return 0.
 *   - Fewer than 2 returns after filtering: all metrics return 0.
 *   - All returns positive: downsideDev is 0, Sortino ratio is 0.
 *   - All returns negative: Sharpe ratio may be negative (indicating poor performance).
 *   - Equity goes to 0 or negative: subsequent returns are skipped (prev > 0 check).
 */
export function computeRiskMetrics(equityCurve: EquityPoint[]): {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
} {
  if (equityCurve.length < 2) {
    return { sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, maxDrawdownPercent: 0 };
  }

  // Compute returns
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const curr = equityCurve[i].equity;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }

  if (returns.length < 2) {
    return { sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, maxDrawdownPercent: 0 };
  }

  const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;

  // Standard deviation (total risk)
  const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  // Downside deviation (only negative returns)
  const negReturns = returns.filter((r) => r < 0);
  const downsideVariance = negReturns.length > 0
    ? negReturns.reduce((s, r) => s + r * r, 0) / returns.length
    : 0;
  const downsideDev = Math.sqrt(downsideVariance);

  // Annualize: assume ~365 data points per year (daily data)
  const periodsPerYear = 365;
  const sharpeRatio = stdDev > 0
    ? (meanReturn / stdDev) * Math.sqrt(periodsPerYear)
    : 0;
  const sortinoRatio = downsideDev > 0
    ? (meanReturn / downsideDev) * Math.sqrt(periodsPerYear)
    : 0;

  // Max drawdown
  let peak = equityCurve[0].equity;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const drawdown = peak - point.equity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

  return { sharpeRatio, sortinoRatio, maxDrawdown, maxDrawdownPercent };
}

/**
 * Group trades by calendar month and compute total PnL per month.
 *
 * @param trades - Array of trade records.
 * @returns Array of MonthlyPnL objects sorted chronologically.
 *
 * Edge cases:
 *   - Empty trades: returns empty array.
 *   - Single month: returns one entry.
 *   - Trades spanning multiple years: groups correctly by "YYYY-MM" key.
 */
export function computeMonthlyPnL(trades: TradeRecord[]): MonthlyPnL[] {
  const map = new Map<string, { pnl: number; count: number }>();

  for (const t of trades) {
    const month = t.executedAt.slice(0, 7); // "2026-01"
    const entry = map.get(month) ?? { pnl: 0, count: 0 };
    entry.pnl += t.pnl;
    entry.count++;
    map.set(month, entry);
  }

  return Array.from(map.entries())
    .map(([month, data]) => ({ month, pnl: data.pnl, tradeCount: data.count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Group trades by ISO week and compute total PnL per week.
 *
 * Weeks start on Monday. Uses ISO 8601 week numbering (e.g., "2026-W03").
 *
 * @param trades - Array of trade records.
 * @returns Array of WeeklyPnL objects sorted chronologically.
 *
 * Edge cases:
 *   - Empty trades: returns empty array.
 *   - Trades at week boundaries: grouped correctly by ISO week.
 *   - Trades spanning multiple years: "YYYY-WNN" format keeps years separate.
 */
export function computeWeeklyPnL(trades: TradeRecord[]): WeeklyPnL[] {
  const map = new Map<string, { pnl: number; count: number }>();

  for (const t of trades) {
    const date = new Date(t.executedAt);
    // Get ISO week number
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
    const yearStart = new Date(weekStart.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((weekStart.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7,
    );
    const weekKey = `${weekStart.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    const entry = map.get(weekKey) ?? { pnl: 0, count: 0 };
    entry.pnl += t.pnl;
    entry.count++;
    map.set(weekKey, entry);
  }

  return Array.from(map.entries())
    .map(([week, data]) => ({ week, pnl: data.pnl, tradeCount: data.count }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Compute a PnL distribution histogram with dynamically-sized buckets.
 *
 * Buckets are sized based on the full data range (max - min), so they
 * adapt to both tight and wide PnL distributions.
 *
 * @param trades - Array of trade records.
 * @param bucketCount - Number of histogram buckets (default 8).
 * @returns Array of buckets with label, count, min, and max bounds.
 *
 * Edge cases:
 *   - Empty trades: returns empty array.
 *   - All trades have identical PnL: returns single bucket.
 *   - Single trade: returns one bucket with that trade's PnL.
 *   - Large positive and negative outliers: buckets may become wide.
 */
export function computePnLDistribution(trades: TradeRecord[], bucketCount = 8): PnLDistribution[] {
  if (trades.length === 0) return [];

  const pnls = trades.map((t) => t.pnl);
  const minPnl = Math.min(...pnls);
  const maxPnl = Math.max(...pnls);

  if (maxPnl - minPnl < 0.01) {
    // All PnLs are the same — single bucket
    return [{ bucket: `${minPnl.toFixed(2)}`, count: trades.length, min: minPnl, max: maxPnl }];
  }

  const bucketSize = (maxPnl - minPnl) / bucketCount;
  const buckets = new Array(bucketCount).fill(0);
  const bucketMins = new Array(bucketCount);
  const bucketMaxs = new Array(bucketCount);

  for (let i = 0; i < bucketCount; i++) {
    bucketMins[i] = minPnl + i * bucketSize;
    bucketMaxs[i] = minPnl + (i + 1) * bucketSize;
  }

  for (const pnl of pnls) {
    let idx = Math.floor((pnl - minPnl) / bucketSize);
    if (idx >= bucketCount) idx = bucketCount - 1;
    if (idx < 0) idx = 0;
    buckets[idx]++;
  }

  const result: PnLDistribution[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const low = bucketMins[i];
    const high = bucketMaxs[i];
    result.push({
      bucket: `${low >= 0 ? '+' : ''}$${low.toFixed(0)} to ${high >= 0 ? '+' : ''}$${high.toFixed(0)}`,
      count: buckets[i],
      min: low,
      max: high,
    });
  }

  return result;
}

/**
 * Compute the full portfolio analytics suite.
 *
 * Combines basic performance metrics with risk metrics (Sharpe, Sortino,
 * max drawdown from equity curve) plus monthly/weekly breakdowns and
 * a PnL distribution histogram.
 *
 * @param trades - Array of completed trade records.
 * @param equityCurve - Time series of account equity values.
 * @returns Complete PortfolioAnalytics object.
 *
 * Note: The Sharpe/Sortino values from computePerformanceMetrics are
 * overridden by values from computeRiskMetrics (equity curve-based).
 */
export function computePortfolioAnalytics(
  trades: TradeRecord[],
  equityCurve: EquityPoint[],
): PortfolioAnalytics {
  const metrics = computePerformanceMetrics(trades);
  const riskMetrics = computeRiskMetrics(equityCurve);

  return {
    metrics: {
      ...metrics,
      sharpeRatio: riskMetrics.sharpeRatio,
      sortinoRatio: riskMetrics.sortinoRatio,
      maxDrawdown: riskMetrics.maxDrawdown,
      maxDrawdownPercent: riskMetrics.maxDrawdownPercent,
    },
    monthlyPnL: computeMonthlyPnL(trades),
    weeklyPnL: computeWeeklyPnL(trades),
    pnlDistribution: computePnLDistribution(trades),
    equityCurve,
  };
}
