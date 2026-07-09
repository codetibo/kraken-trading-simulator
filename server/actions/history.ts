'use server';

import prisma from '@/lib/prisma';
import { getCurrentUserId } from './orders';
import { Prisma } from '@/app/generated/prisma/client';

// ─── Trade History ──────────────────────────────────────

/** View model for a trade history entry. */
export interface TradeView {
  id: string;
  /** Trading pair symbol. */
  assetSymbol: string;
  /** Trade direction. */
  side: 'BUY' | 'SELL';
  /** Order type that caused this trade. */
  orderType: string;
  /** Market type (SPOT or MARGIN). */
  marketType: string;
  /** Execution price. */
  price: number;
  /** Executed quantity. */
  quantity: number;
  /** Fee charged. */
  fee: number;
  /** Realized PnL (0 for spot trades). */
  pnl: number;
  /** ISO date string of execution time. */
  executedAt: string;
}

/** Filters for querying trade history. */
export interface TradeFilters {
  /** Filter by trading pair (partial match). */
  pair?: string;
  /** Filter by order type (exact match). */
  type?: string;
  /** Filter by side (BUY or SELL). */
  side?: string;
  /** Predefined date range key (24h, 7d, 30d, 90d). */
  dateRange?: string;
}

/**
 * Query trade history with optional filters.
 * Always returns newest-first, capped at 200 records.
 *
 * @param filters - Optional filters (pair, type, side, dateRange).
 * @returns Array of TradeView objects.
 */
export async function listTradeHistory(
  filters?: TradeFilters,
): Promise<TradeView[]> {
  const userId = await getCurrentUserId();

  const where: Prisma.TradeWhereInput = { userId };

  if (filters?.pair) {
    where.asset = { symbol: { contains: filters.pair.toUpperCase() } };
  }
  if (filters?.side) {
    where.side = filters.side as 'BUY' | 'SELL';
  }
  if (filters?.type) {
    where.orderType = filters.type as Prisma.TradeWhereInput['orderType'];
  }
  if (filters?.dateRange) {
    const ms = dateRangeToMs(filters.dateRange);
    if (ms) {
      where.executedAt = { gte: new Date(Date.now() - ms) };
    }
  }

  const trades = await prisma.trade.findMany({
    where,
    include: { asset: true },
    orderBy: { executedAt: 'desc' },
    take: 200,
  });

  return trades.map(t => ({
    id: t.id,
    assetSymbol: t.asset.symbol,
    side: t.side as 'BUY' | 'SELL',
    orderType: t.orderType,
    marketType: t.marketType,
    price: Number(t.price),
    quantity: Number(t.quantity),
    fee: Number(t.fee),
    pnl: Number(t.pnl),
    executedAt: t.executedAt.toISOString(),
  }));
}

// ─── Transaction Log ────────────────────────────────────

/** View model for a transaction history entry. */
export interface TransactionView {
  id: string;
  /** Transaction type (DEPOSIT, WITHDRAWAL, TRADE_FEE, FUNDING_FEE, REALIZED_PNL, RESET_ADJUSTMENT). */
  type: string;
  /** Amount in quote currency (positive for credits, negative for debits). */
  amount: number;
  /** Optional human-readable note. */
  note: string | null;
  /** ISO date string. */
  createdAt: string;
}

/** Filters for querying the transaction log. */
export interface TransactionFilters {
  /** Filter by transaction type. */
  type?: string;
  /** Predefined date range key (24h, 7d, 30d, 90d). */
  dateRange?: string;
  /** Full-text search in transaction notes. */
  search?: string;
}

/**
 * Query the transaction log with optional filters.
 * Always returns newest-first, capped at 200 records.
 *
 * @param filters - Optional filters (type, dateRange, search).
 * @returns Array of TransactionView objects.
 */
export async function listTransactions(
  filters?: TransactionFilters,
): Promise<TransactionView[]> {
  const userId = await getCurrentUserId();

  const where: Prisma.TransactionWhereInput = { userId };

  if (filters?.type) {
    where.type = filters.type as Prisma.TransactionWhereInput['type'];
  }
  if (filters?.search) {
    where.note = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters?.dateRange) {
    const ms = dateRangeToMs(filters.dateRange);
    if (ms) {
      where.createdAt = { gte: new Date(Date.now() - ms) };
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return transactions.map(t => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    note: t.note,
    createdAt: t.createdAt.toISOString(),
  }));
}

// ─── Helpers ──────────────────────────────────────────

const DATE_RANGES: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

/**
 * Convert a predefined date range key to milliseconds.
 *
 * @param key - Date range key ('24h', '7d', '30d', '90d').
 * @returns Milliseconds for the range, or undefined if unknown key.
 */
function dateRangeToMs(key: string): number | undefined {
  return DATE_RANGES[key];
}
