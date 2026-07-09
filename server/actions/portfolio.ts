'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getPriceFeed } from '@/lib/engine/priceFeed/PriceFeedFactory';
import {
  calculateUnrealizedPnl,
  summarizeWalletMargin,
} from '@/lib/engine/marginEngine';
import { resetSimulationSchema } from '@/lib/validation/orderSchemas';
import { getCurrentUserId } from './orders';

/** Full portfolio balance summary for the Dashboard and Portfolio pages. */
export interface PortfolioSummary {
  /** Cash in the wallet (excluding margin). */
  cashBalance: number;
  /** Current USD value of all spot crypto holdings. */
  cryptoValueUsd: number;
  /** Total account equity: cash + crypto + unrealized PnL. */
  totalEquity: number;
  /** Sum of used margin across all open positions. */
  usedMargin: number;
  /** Available margin for new positions (totalEquity - usedMargin). */
  freeMargin: number;
  /** Margin level percentage: (totalEquity / usedMargin) * 100. */
  marginLevel: number;
  /** Realized PnL from the past 24 hours (transactions-based). */
  dailyPnl: number;
  /** Overall PnL since simulation start (totalEquity - startingBalance). */
  overallPnl: number;
}

/**
 * Compute full portfolio balance summary including spot holdings at
 * current market value and open margin positions' unrealized PnL.
 *
 * @returns PortfolioSummary with all balance components.
 *
 * Edge cases:
 *   - Wallet not found: throws (user should always have a wallet).
 *   - Unknown asset symbols in holdings: silently skipped (stablecoins, etc.).
 *   - No open positions: usedMargin = 0, freeMargin = cashBalance, marginLevel = Infinity.
 *   - No transactions in past 24h: dailyPnl = 0.
 */
export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const userId = await getCurrentUserId();
  const priceFeed = getPriceFeed();

  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId },
    include: { holdings: true },
  });

  let cryptoValueUsd = 0;
  for (const holding of wallet.holdings) {
    const symbol = `${holding.assetSymbol}/USD`;
    try {
      const price = await priceFeed.getCurrentPrice(symbol);
      cryptoValueUsd += Number(holding.quantity) * price;
    } catch {
      // Unknown pair (e.g. stablecoin) — skip pricing.
    }
  }

  const openPositions = await prisma.position.findMany({
    where: { userId, status: 'OPEN' },
    include: { asset: true },
  });

  const positionsForSummary = await Promise.all(
    openPositions.map(async p => {
      const markPrice = await priceFeed.getCurrentPrice(p.asset.symbol);
      const unrealizedPnl = calculateUnrealizedPnl(
        p.side as 'LONG' | 'SHORT',
        Number(p.size),
        Number(p.entryPrice),
        markPrice,
      );
      return { usedMargin: Number(p.usedMargin), unrealizedPnl };
    }),
  );

  const marginSummary = summarizeWalletMargin(
    Number(wallet.cashBalance),
    positionsForSummary,
  );
  const totalUnrealizedPnl = positionsForSummary.reduce(
    (sum, p) => sum + p.unrealizedPnl,
    0,
  );

  const totalEquity =
    Number(wallet.cashBalance) + cryptoValueUsd + totalUnrealizedPnl;
  const overallPnl = totalEquity - Number(wallet.startingBalance);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyTransactions = await prisma.transaction.findMany({
    where: { userId, createdAt: { gte: dayAgo } },
  });
  const dailyPnl = dailyTransactions
    .filter(
      t =>
        t.type === 'REALIZED_PNL' ||
        t.type === 'TRADE_FEE' ||
        t.type === 'FUNDING_FEE',
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    cashBalance: Number(wallet.cashBalance),
    cryptoValueUsd,
    totalEquity,
    usedMargin: marginSummary.usedMargin,
    freeMargin: marginSummary.freeMargin,
    marginLevel: marginSummary.marginLevel,
    dailyPnl,
    overallPnl,
  };
}

/** View model for a trade as shown in the Dashboard's recent trades panel. */
export interface RecentTradeView {
  id: string;
  /** Trading pair symbol. */
  assetSymbol: string;
  /** Trade direction. */
  side: 'BUY' | 'SELL';
  /** Order type that caused this trade. */
  orderType: string;
  /** Execution price. */
  price: number;
  /** Executed quantity. */
  quantity: number;
  /** Fee charged for this trade. */
  fee: number;
  /** Realized PnL from this trade (0 for spot trades). */
  pnl: number;
  /** ISO date string of execution time. */
  executedAt: string;
}

/**
 * Fetch the most recent trades for the Dashboard's "recent trades" panel.
 *
 * @param limit - Maximum number of trades to return (default 8).
 * @returns Array of RecentTradeView objects, newest first.
 */
export async function getRecentTrades(limit = 8): Promise<RecentTradeView[]> {
  const userId = await getCurrentUserId();
  const trades = await prisma.trade.findMany({
    where: { userId },
    include: { asset: true },
    orderBy: { executedAt: 'desc' },
    take: limit,
  });

  return trades.map(t => ({
    id: t.id,
    assetSymbol: t.asset.symbol,
    side: t.side as 'BUY' | 'SELL',
    orderType: t.orderType,
    price: Number(t.price),
    quantity: Number(t.quantity),
    fee: Number(t.fee),
    pnl: Number(t.pnl),
    executedAt: t.executedAt.toISOString(),
  }));
}

/** View model for a spot crypto holding with current market price. */
export interface HoldingView {
  /** Trading pair symbol (e.g. "BTC/USD"). */
  assetSymbol: string;
  /** Base asset symbol (e.g. "BTC"). */
  baseSymbol: string;
  /** Amount of the base asset held. */
  quantity: number;
  /** Current market price of the pair. */
  currentPrice: number;
  /** USD value of this holding (quantity * currentPrice). */
  valueUsd: number;
}

/**
 * Query all spot crypto holdings with current market prices.
 * Skips holdings with zero or negative quantity and assets whose
 * price cannot be fetched (silent skip).
 *
 * @returns Array of HoldingView objects.
 */
export async function getHoldings(): Promise<HoldingView[]> {
  const userId = await getCurrentUserId();
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId },
    include: { holdings: true },
  });
  const priceFeed = getPriceFeed();

  const result: HoldingView[] = [];
  for (const holding of wallet.holdings) {
    if (Number(holding.quantity) <= 0) continue;
    const symbol = `${holding.assetSymbol}/USD`;
    try {
      const currentPrice = await priceFeed.getCurrentPrice(symbol);
      result.push({
        assetSymbol: symbol,
        baseSymbol: holding.assetSymbol,
        quantity: Number(holding.quantity),
        currentPrice,
        valueUsd: Number(holding.quantity) * currentPrice,
      });
    } catch {
      // Skip if price unavailable
    }
  }
  return result;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
}

/**
 * Build the equity time series for the past ~24 hours.
 *
 * Reconstruction logic:
 * 1. Reconstruct cash balance at each point by reversing later
 *    realized PnL/fee transactions.
 * 2. Value crypto holdings using historical candle prices (not just
 *    the current price).
 * 3. Compute unrealized PnL for open margin positions using historical
 *    prices as well.
 *
 * This means the chart reflects real price movements, not just
 * transaction-based changes.
 */
export async function getEquityHistory(): Promise<EquityPoint[]> {
  const userId = await getCurrentUserId();
  const priceFeed = getPriceFeed();
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId },
    include: { holdings: true },
  });

  const openPositions = await prisma.position.findMany({
    where: { userId, status: 'OPEN' },
    include: { asset: true },
  });

  // Collect all symbols we need prices for
  const symbols = new Set<string>();
  for (const holding of wallet.holdings) {
    if (Number(holding.quantity) > 0) {
      symbols.add(`${holding.assetSymbol}/USD`);
    }
  }
  for (const p of openPositions) {
    symbols.add(p.asset.symbol);
  }

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const numPoints = 24;

  // Fetch candle prices for each symbol (1h candles for the past 24h)
  const priceMap: Record<string, Map<number, number>> = {};
  for (const symbol of symbols) {
    try {
      const candles = await prisma.candle.findMany({
        where: {
          asset: { symbol },
          interval: '1h',
          timestamp: { gte: new Date(dayAgo) },
        },
        orderBy: { timestamp: 'asc' },
      });
      const map = new Map<number, number>();
      for (const c of candles) {
        map.set(c.timestamp.getTime(), Number(c.close));
      }
      // Fill in current price as latest
      const currentPrice = await priceFeed.getCurrentPrice(symbol);
      map.set(now, currentPrice);
      priceMap[symbol] = map;
    } catch {
      // Skip symbols without candle data
    }
  }

  // Get current prices for all symbols (fallback)
  const currentPrices: Record<string, number> = {};
  for (const symbol of symbols) {
    try {
      currentPrices[symbol] = await priceFeed.getCurrentPrice(symbol);
    } catch {
      currentPrices[symbol] = 0;
    }
  }

  // Get recent transactions to reconstruct cash balance history
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(dayAgo - 3600000) }, // 1h buffer
    },
    orderBy: { createdAt: 'desc' },
  });

  // Cache sorted timestamps for each symbol once
  const sortedTimestamps: Record<string, number[]> = {};
  for (const symbol of symbols) {
    const map = priceMap[symbol];
    if (map) {
      sortedTimestamps[symbol] = Array.from(map.keys()).sort((a, b) => a - b);
    }
  }

  // Helper: get the closest price at or before a given timestamp (O(log n) using cached sorted keys)
  function getPriceAt(symbol: string, timestamp: number): number {
    const map = priceMap[symbol];
    if (!map) return currentPrices[symbol] || 0;
    const times = sortedTimestamps[symbol];
    if (!times || times.length === 0) return currentPrices[symbol] || 0;
    // Binary search for closest timestamp <= target
    let lo = 0, hi = times.length - 1, best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (times[mid] <= timestamp) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best >= 0 ? map.get(times[best])! : (currentPrices[symbol] || 0);
  }

  const currentCashBalance = Number(wallet.cashBalance);

  // Build history points from oldest to newest
  const points: EquityPoint[] = [];
  let runningCash = currentCashBalance;

  // First, calculate cash at the oldest point (24h ago) by reversing all transactions
  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (
      tx.type === 'REALIZED_PNL' ||
      tx.type === 'TRADE_FEE' ||
      tx.type === 'FUNDING_FEE' ||
      tx.type === 'RESET_ADJUSTMENT'
    ) {
      runningCash -= amount;
    }
  }

  // Now walk forward through time, applying transactions as we go
  const reversedTxns = [...transactions].reverse();
  let txIdx = 0;

  for (let i = 0; i <= numPoints; i++) {
    const pointTime = new Date(dayAgo + (i / numPoints) * (now - dayAgo));
    const pointTs = pointTime.getTime();

    // Apply transactions that happened up to this point
    while (
      txIdx < reversedTxns.length &&
      new Date(reversedTxns[txIdx].createdAt).getTime() <= pointTs
    ) {
      const tx = reversedTxns[txIdx];
      const amount = Number(tx.amount);
      if (
        tx.type === 'REALIZED_PNL' ||
        tx.type === 'TRADE_FEE' ||
        tx.type === 'FUNDING_FEE'
      ) {
        runningCash += amount;
      } else if (tx.type === 'RESET_ADJUSTMENT') {
        runningCash += amount;
      }
      txIdx++;
    }

    // Calculate crypto holdings value at this point using historical prices
    let cryptoValueAtPoint = 0;
    for (const holding of wallet.holdings) {
      const qty = Number(holding.quantity);
      if (qty <= 0) continue;
      const symbol = `${holding.assetSymbol}/USD`;
      const price = getPriceAt(symbol, pointTs);
      cryptoValueAtPoint += qty * price;
    }

    // Calculate position PnL at this point using historical prices
    let unrealizedPnlAtPoint = 0;
    for (const p of openPositions) {
      const side = p.side as 'LONG' | 'SHORT';
      const markPrice = getPriceAt(p.asset.symbol, pointTs);
      unrealizedPnlAtPoint += calculateUnrealizedPnl(
        side,
        Number(p.size),
        Number(p.entryPrice),
        markPrice,
      );
    }

    const totalEquity = runningCash + cryptoValueAtPoint + unrealizedPnlAtPoint;

    points.push({
      timestamp: pointTime.toISOString(),
      equity: Math.round(totalEquity * 100) / 100,
    });
  }

  return points;
}

/**
 * Settings > "Reset Simulation" — full reset to a clean state with the
 * given starting balance. All open orders/positions are deleted, the
 * wallet is reset, and the trade/transaction log is cleared.
 */
export async function resetSimulation(
  rawInput: { startingBalance?: number } = {},
): Promise<{ success: boolean; error?: string }> {
  const parsed = resetSimulationSchema.safeParse(rawInput);
  if (!parsed.success)
    return { success: false, error: 'Invalid starting balance' };

  const userId = await getCurrentUserId();

  await prisma.$transaction([
    prisma.trade.deleteMany({ where: { userId } }),
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.position.deleteMany({ where: { userId } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.assetHolding.deleteMany({ where: { wallet: { userId } } }),
    prisma.wallet.update({
      where: { userId },
      data: {
        cashBalance: parsed.data.startingBalance,
        startingBalance: parsed.data.startingBalance,
        reservedMargin: 0,
      },
    }),
    prisma.tutorialProgress.deleteMany({ where: { userId } }),
  ]);

  revalidatePath('/dashboard');
  revalidatePath('/trade');
  revalidatePath('/portfolio');

  return { success: true };
}
