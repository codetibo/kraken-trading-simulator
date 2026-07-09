/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/app/generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn<any>().mockResolvedValue({ user: { id: 'test-user-id' } }),
    },
  },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn<any>(),
}));

jest.mock('@prisma/adapter-pg', () => ({}), { virtual: true });

const mockPrisma: any = {
  user: { findFirst: jest.fn() },
  trade: { findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { listTradeHistory, listTransactions } from '@/server/actions/history';

/* eslint-enable @typescript-eslint/no-explicit-any */

const USER_ID = 'test-user-id';

// ─── listTradeHistory Tests ───────────────────────────

describe('listTradeHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('returns empty array when no trades', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    const result = await listTradeHistory();
    expect(result).toEqual([]);
  });

  it('returns all trades when no filters provided', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([
      {
        id: 'trade-1',
        asset: { symbol: 'BTC/USD' },
        side: 'BUY',
        orderType: 'MARKET',
        marketType: 'SPOT',
        price: 50000,
        quantity: 0.5,
        fee: 65,
        pnl: 0,
        executedAt: new Date('2026-07-06T12:00:00Z'),
      },
    ]);

    const result = await listTradeHistory();
    expect(result).toHaveLength(1);
    expect(result[0].assetSymbol).toBe('BTC/USD');
    expect(result[0].price).toBe(50000);
    expect(result[0].pnl).toBe(0);
  });

  it('filters by pair (case-insensitive)', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await listTradeHistory({ pair: 'btc' });
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          asset: { symbol: { contains: 'BTC' } },
        }),
      }),
    );
  });

  it('filters by side', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await listTradeHistory({ side: 'SELL' });
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ side: 'SELL' }),
      }),
    );
  });

  it('filters by order type', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await listTradeHistory({ type: 'LIMIT' });
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orderType: 'LIMIT' }),
      }),
    );
  });

  it('filters by date range', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await listTradeHistory({ dateRange: '7d' });
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          executedAt: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it('returns trades capped at 200', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await listTradeHistory();
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it('returns trades in descending order by executedAt', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await listTradeHistory();
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { executedAt: 'desc' } }),
    );
  });
});

// ─── listTransactions Tests ───────────────────────────

describe('listTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('returns empty array when no transactions', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    const result = await listTransactions();
    expect(result).toEqual([]);
  });

  it('returns all transactions when no filters', async () => {
    const createdAt = new Date('2026-07-06T10:00:00Z');
    mockPrisma.transaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        type: 'TRADE_FEE',
        amount: -65,
        note: 'MARKET BUY BTC/USD',
        createdAt,
      },
    ]);

    const result = await listTransactions();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('TRADE_FEE');
    expect(result[0].amount).toBe(-65);
    expect(result[0].note).toBe('MARKET BUY BTC/USD');
    expect(result[0].createdAt).toBe(createdAt.toISOString());
  });

  it('filters by transaction type', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await listTransactions({ type: 'REALIZED_PNL' });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'REALIZED_PNL' }),
      }),
    );
  });

  it('filters by date range', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await listTransactions({ dateRange: '30d' });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it('filters by note search (case-insensitive)', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await listTransactions({ search: 'BTC' });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          note: { contains: 'BTC', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('combines multiple filters', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await listTransactions({ type: 'TRADE_FEE', dateRange: '24h', search: 'BTC' });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'TRADE_FEE',
          note: { contains: 'BTC', mode: 'insensitive' },
          createdAt: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it('returns transactions capped at 200', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await listTransactions();
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });
});
