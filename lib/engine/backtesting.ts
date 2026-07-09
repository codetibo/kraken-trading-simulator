/**
 * Backtesting Engine
 *
 * Runs a strategy against historical Candle data and produces a performance report.
 *
 * Supported strategies:
 *   - SMA Crossover: buy when fast SMA crosses above slow SMA, sell when crosses below
 *   - RSI: buy when RSI crosses below oversold threshold, sell when crosses above overbought
 *   - MACD: buy when MACD crosses above signal line, sell when crosses below
 */

import type { Candle } from './priceFeed/PriceFeedProvider';
import { sma, rsi, macd } from '@/lib/indicators';

// ---------------------------------------------------------------------------
// Strategy Configuration
// ---------------------------------------------------------------------------

/** Supported backtest strategy types. */
export type StrategyType = 'sma_crossover' | 'rsi' | 'macd';

interface SmaCrossoverConfig {
  type: 'sma_crossover';
  fastPeriod: number;
  slowPeriod: number;
}

interface RsiConfig {
  type: 'rsi';
  period: number;
  oversoldThreshold: number;
  overboughtThreshold: number;
}

interface MacdConfig {
  type: 'macd';
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

/** Union type for all supported strategy configurations. */
export type StrategyConfig = SmaCrossoverConfig | RsiConfig | MacdConfig;

/** Full input specification for running a backtest simulation. */
export interface BacktestInput {
  /** Trading pair symbol (e.g. "BTC/USD"). */
  symbol: string;
  /** Candle interval (e.g. "1h", "1D"). Used for annualization in Sharpe ratio. */
  interval: string;
  /** Historical candle data to run the strategy against. */
  candles: Candle[];
  /** Strategy configuration (SMA crossover, RSI, or MACD). */
  strategy: StrategyConfig;
  /** Starting capital in USD. */
  initialCapital: number;
  /** Fraction of capital allocated per trade (0.0 to 1.0). */
  positionSize: number;
  /** Taker fee in basis points (e.g. 26 = 0.26%). */
  feeBps: number;
  /** Slippage as fraction of price (e.g. 0.001 = 0.1%). */
  slippage: number;
  /**
   * OCO (One Cancels Other) exit strategy.
   * If set, every position will have a take-profit and stop-loss order attached.
   * Whichever level is hit first closes the position.
   * Values are percentages away from entry price (e.g. 5 = 5% above entry for LONG).
   */
  oco?: {
    /** Take-profit distance from entry as a percentage (e.g. 5 = 5%). */
    takeProfitPercent: number;
    /** Stop-loss distance from entry as a percentage (e.g. 2 = 2%). */
    stopLossPercent: number;
  };
}

// ---------------------------------------------------------------------------
// Trade & Performance Report Types
// ---------------------------------------------------------------------------

type ExitReason = 'signal' | 'take_profit' | 'stop_loss';

interface BacktestTrade {
  entryTimestamp: number;
  exitTimestamp: number;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  fee: number;
  holdingPeriod: number; // in candles
  exitReason: ExitReason;
}

/**
 * Comprehensive performance report from a backtest run.
 * Includes trade-by-trade details, aggregate metrics, and equity curve.
 */
export interface PerformanceReport {
  strategy: StrategyType;
  symbol: string;
  interval: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalFees: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  equityCurve: { timestamp: number; equity: number }[];
}

// ---------------------------------------------------------------------------
// Signal generation
// ---------------------------------------------------------------------------

interface Signal {
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
}

function generateSignals(candles: Candle[], config: StrategyConfig): Signal[] {
  const closes = candles.map((c) => c.close);
  const n = candles.length;
  const signals: Signal[] = new Array(n).fill({ action: 'HOLD', strength: 0 });

  switch (config.type) {
    case 'sma_crossover': {
      const fastValues = sma(closes, config.fastPeriod);
      const slowValues = sma(closes, config.slowPeriod);
      for (let i = 1; i < n; i++) {
        const fastPrev = fastValues[i - 1];
        const slowPrev = slowValues[i - 1];
        const fastCurr = fastValues[i];
        const slowCurr = slowValues[i];
        if (fastPrev === null || slowPrev === null || fastCurr === null || slowCurr === null) {
          signals[i] = { action: 'HOLD', strength: 0 };
        } else if (fastPrev <= slowPrev && fastCurr > slowCurr) {
          // Bullish crossover
          signals[i] = { action: 'BUY', strength: 1 };
        } else if (fastPrev >= slowPrev && fastCurr < slowCurr) {
          // Bearish crossover
          signals[i] = { action: 'SELL', strength: 1 };
        } else {
          signals[i] = { action: 'HOLD', strength: 0 };
        }
      }
      break;
    }

    case 'rsi': {
      const rsiValues = rsi(closes, config.period);
      for (let i = 1; i < n; i++) {
        const prev = rsiValues[i - 1];
        const curr = rsiValues[i];
        if (prev === null || curr === null) {
          signals[i] = { action: 'HOLD', strength: 0 };
        } else if (prev <= config.oversoldThreshold && curr > config.oversoldThreshold) {
          // Exit oversold → buy signal
          signals[i] = { action: 'BUY', strength: (config.oversoldThreshold - prev) / config.oversoldThreshold };
        } else if (prev >= config.overboughtThreshold && curr < config.overboughtThreshold) {
          // Exit overbought → sell signal
          signals[i] = { action: 'SELL', strength: (prev - config.overboughtThreshold) / (100 - config.overboughtThreshold) };
        } else {
          signals[i] = { action: 'HOLD', strength: 0 };
        }
      }
      break;
    }

    case 'macd': {
      const macdResult = macd(closes, config.fastPeriod, config.slowPeriod, config.signalPeriod);
      const macdLine = macdResult.macdLine ?? [];
      const signalLine = macdResult.signalLine ?? [];
      for (let i = 1; i < n; i++) {
        const mPrev = macdLine[i - 1];
        const sPrev = signalLine[i - 1];
        const mCurr = macdLine[i];
        const sCurr = signalLine[i];
        if (mPrev === null || sPrev === null || mCurr === null || sCurr === null) {
          signals[i] = { action: 'HOLD', strength: 0 };
        } else if (mPrev <= sPrev && mCurr > sCurr) {
          // Bullish crossover
          signals[i] = { action: 'BUY', strength: Math.abs(mCurr - sCurr) / Math.abs(mCurr || 1) };
        } else if (mPrev >= sPrev && mCurr < sCurr) {
          // Bearish crossover
          signals[i] = { action: 'SELL', strength: Math.abs(mCurr - sCurr) / Math.abs(mCurr || 1) };
        } else {
          signals[i] = { action: 'HOLD', strength: 0 };
        }
      }
      break;
    }
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Main backtest runner
// ---------------------------------------------------------------------------

/**
 * Run a strategy against historical candle data and produce a performance report.
 *
 * The simulation walks through each candle, generates signals, opens/closes
 * positions based on signals or OCO levels, tracks an equity curve, and
 * calculates comprehensive performance metrics.
 *
 * @param input - Backtest configuration including strategy, candles, capital, and fees.
 * @returns PerformanceReport with trade list, metrics, and equity curve.
 *
 * Edge cases:
 *   - Insufficient candles for strategy indicator: returns empty trades, 0 metrics.
 *   - OCO with zero percentage: acts as signal-based exit only.
 *   - positionSize of 0: never opens positions, flat equity curve.
 *   - Fee-only trades: position can be opened but immediately at a loss due to fees.
 *   - Last candle: any remaining open position is force-closed at the close price.
 */
export function runBacktest(input: BacktestInput): PerformanceReport {
  const { candles, strategy, initialCapital, positionSize, feeBps, slippage } = input;

  const feeFraction = feeBps / 10_000;
  const signals = generateSignals(candles, strategy);

  // Pre-compute OCO levels if configured
  const ocoTP = input.oco ? input.oco.takeProfitPercent / 100 : null;
  const ocoSL = input.oco ? input.oco.stopLossPercent / 100 : null;

  let capital = initialCapital;
  let position: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    entryIndex: number;
    quantity: number;
  } | null = null;
  const trades: BacktestTrade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];

  let peak = initialCapital;
  let maxDrawdown = 0;

  // Track initial equity at candle 0
  equityCurve.push({ timestamp: candles[0]?.timestamp ?? 0, equity: initialCapital });

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const signal = signals[i];
    const open = candle.open;
    const high = candle.high;
    const low = candle.low;

    // Check for position exit (OCO or signal)
    if (position) {
      let exitReason: ExitReason | null = null;
      let exitPrice = 0;

      // Check OCO levels — TP/SL are percentage thresholds from entry price
      if (ocoTP !== null || ocoSL !== null) {
        if (position.side === 'LONG') {
          const tpPrice = position.entryPrice * (1 + (ocoTP ?? Infinity));
          const slPrice = position.entryPrice * (1 - (ocoSL ?? -Infinity));
          if (high >= tpPrice) {
            exitReason = 'take_profit';
            exitPrice = tpPrice;
          } else if (low <= slPrice) {
            exitReason = 'stop_loss';
            exitPrice = slPrice;
          }
        } else {
          // SHORT: TP is below entry, SL is above entry
          const tpPrice = position.entryPrice * (1 - (ocoTP ?? -Infinity));
          const slPrice = position.entryPrice * (1 + (ocoSL ?? Infinity));
          if (low <= tpPrice) {
            exitReason = 'take_profit';
            exitPrice = tpPrice;
          } else if (high >= slPrice) {
            exitReason = 'stop_loss';
            exitPrice = slPrice;
          }
        }
      }

      // If OCO didn't trigger, check signal-based exit
      if (!exitReason) {
        const shouldExit =
          (position.side === 'LONG' && signal.action === 'SELL') ||
          (position.side === 'SHORT' && signal.action === 'BUY');

        if (shouldExit) {
          exitReason = 'signal';
          exitPrice = open * (1 + (position.side === 'LONG' ? 1 : -1) * slippage);
        }
      }

      if (exitReason) {
        const grossPnl =
          position.side === 'LONG'
            ? (exitPrice - position.entryPrice) * position.quantity
            : (position.entryPrice - exitPrice) * position.quantity;
        const fee = position.quantity * exitPrice * feeFraction;
        const netPnl = grossPnl - fee;
        const pnlPercent = ((exitPrice / position.entryPrice) - 1) * (position.side === 'LONG' ? 1 : -1) * 100;

        capital += netPnl;

        trades.push({
          entryTimestamp: candles[position.entryIndex].timestamp,
          exitTimestamp: candle.timestamp,
          side: position.side,
          entryPrice: position.entryPrice,
          exitPrice,
          quantity: position.quantity,
          pnl: netPnl,
          pnlPercent,
          fee,
          holdingPeriod: i - position.entryIndex,
          exitReason,
        });

        position = null;
      }
    }

    // Check for entry signal if not in a position
    if (!position && (signal.action === 'BUY' || signal.action === 'SELL')) {
      const side = signal.action === 'BUY' ? 'LONG' : 'SHORT';
      const entryPrice = open * (1 + (side === 'LONG' ? 1 : -1) * slippage);
      const allocatedCapital = capital * positionSize;
      const quantity = allocatedCapital / entryPrice;

      // Only open position if quantity is meaningful
      if (quantity >= 1e-12) {
        const fee = quantity * entryPrice * feeFraction;
        capital -= fee;

        position = {
          side,
          entryPrice,
          entryIndex: i,
          quantity,
        };
      }
    }

    // Track equity curve
    const currentValue = position
      ? position.side === 'LONG'
        ? capital + position.quantity * open
        : capital + position.quantity * (2 * position.entryPrice - open)
      : capital;

    equityCurve.push({ timestamp: candle.timestamp, equity: currentValue });

    // Track drawdown
    if (currentValue > peak) peak = currentValue;
    const drawdown = peak - currentValue;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Close any open position at the last candle
  if (position) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close * (1 + (position.side === 'LONG' ? 1 : -1) * slippage);
    const grossPnl =
      position.side === 'LONG'
        ? (exitPrice - position.entryPrice) * position.quantity
        : (position.entryPrice - exitPrice) * position.quantity;
    const fee = position.quantity * exitPrice * feeFraction;
    const netPnl = grossPnl - fee;
    const pnlPercent = ((exitPrice / position.entryPrice) - 1) * (position.side === 'LONG' ? 1 : -1) * 100;

    capital += netPnl;

    trades.push({
      entryTimestamp: candles[position.entryIndex].timestamp,
      exitTimestamp: lastCandle.timestamp,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      pnl: netPnl,
      pnlPercent,
      fee,
      holdingPeriod: candles.length - 1 - position.entryIndex,
      exitReason: 'signal',
    });
  }

  // ── Calculate performance metrics ──

  const totalPnl = capital - initialCapital;
  const totalReturnPercent = initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);

  const averageWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Sharpe ratio (annualized, assuming risk-free rate of 0 and daily returns)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const curr = equityCurve[i].equity;
    if (prev > 0) {
      dailyReturns.push((curr - prev) / prev);
    }
  }
  const meanReturn =
    dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      : 0;
  const variance =
    dailyReturns.length > 1
      ? dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (dailyReturns.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  // Annualize: candles-per-year for each interval
  const tradingDaysPerYear =
    input.interval === '1M' ? 12 :
    input.interval === '1W' ? 52 :
    input.interval === '1D' ? 365 :
    input.interval === '4h' ? 365 * 6 :
    input.interval === '1h' ? 365 * 24 :
    365 * 24 * 60 / parseInt(input.interval); // fallback for minute-based intervals
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(tradingDaysPerYear) : 0;

  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

  return {
    strategy: strategy.type,
    symbol: input.symbol,
    interval: input.interval,
    initialCapital,
    finalCapital: capital,
    totalReturn: totalPnl,
    totalReturnPercent,
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnl,
    totalFees,
    maxDrawdown,
    maxDrawdownPercent,
    averageWin,
    averageLoss,
    profitFactor,
    sharpeRatio,
    trades,
    equityCurve,
  };
}
