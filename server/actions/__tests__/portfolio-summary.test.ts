import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/* eslint-disable @typescript-eslint/no-explicit-any */

class MockDecimal {
  value: number;
  constructor(n: number) { this.value = n; }
  neg() { return new MockDecimal(-this.value); }
}

jest.mock('@/app/generated/prisma/client', () => ({
  Prisma: { Decimal: MockDecimal },
}), { virtual: true });

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
  user: { findFirst: jest.fn(), upsert: jest.fn() },
  wallet: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  position: { findMany: jest.fn(), deleteMany: jest.fn() },
  trade: { findMany: jest.fn(), deleteMany: jest.fn() },
  transaction: { findMany: jest.fn(), deleteMany: jest.fn() },
  order: { deleteMany: jest.fn() },
  assetHolding: { deleteMany: jest.fn() },
  tutorialProgress: { deleteMany: jest.fn() },
  candle: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockGetCurrentPrice = jest.fn<any>();
jest.mock('@/lib/engine/priceFeed/PriceFeedFactory', () => ({
  getPriceFeed: () => ({ getCurrentPrice: mockGetCurrentPrice }),
}));

import { getPortfolioSummary, getRecentTrades, resetSimulation } from '@/server/actions/portfolio';

const USER_ID = 'test-user-id';

describe('getPortfolioSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.position.findMany.mockResolvedValue([]);
    mockPrisma.candle.findMany.mockResolvedValue([]);
  });

  it('returns summary for empty wallet', async () => {
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
      id: 'wallet-1', userId: USER_ID, cashBalance: 10000, startingBalance: 10000, reservedMargin: 0, holdings: [],
    });
    const result = await getPortfolioSummary();
    expect(result.cashBalance).toBe(10000);
    expect(result.cryptoValueUsd).toBe(0);
    expect(result.totalEquity).toBe(10000);
    expect(result.usedMargin).toBe(0);
    expect(result.freeMargin).toBe(10000);
    expect(result.marginLevel).toBe(Infinity);
    expect(result.overallPnl).toBe(0);
  });

  it('includes crypto holdings at market value', async () => {
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
      id: 'wallet-1', userId: USER_ID, cashBalance: 10000, startingBalance: 10000, reservedMargin: 0,
      holdings: [
        { id: 'h1', walletId: 'wallet-1', assetSymbol: 'BTC', quantity: 0.5 },
        { id: 'h2', walletId: 'wallet-1', assetSymbol: 'ETH', quantity: 10 },
      ],
    });
    mockGetCurrentPrice.mockImplementation(async (symbol: string) => {
      if (symbol === 'BTC/USD') return 50000;
      if (symbol === 'ETH/USD') return 3000;
      return 0;
    });
    const result = await getPortfolioSummary();
    expect(result.cryptoValueUsd).toBe(55000);
    expect(result.totalEquity).toBe(65000);
    expect(result.overallPnl).toBe(55000);
  });

  it('includes unrealized PnL from margin positions', async () => {
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
      id: 'wallet-1', userId: USER_ID, cashBalance: 50000, startingBalance: 10000, reservedMargin: 10000, holdings: [],
    });
    mockPrisma.position.findMany.mockResolvedValue([{
      id: 'pos-1', userId: USER_ID, assetId: 'asset-btc', asset: { symbol: 'BTC/USD' },
      side: 'LONG', leverage: 5, size: 1, entryPrice: 50000, markPrice: 55000, liquidationPrice: 40100,
      usedMargin: 10000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
      openedAt: new Date(), closedAt: null, updatedAt: new Date(),
    }]);
    mockGetCurrentPrice.mockResolvedValue(55000);
    const result = await getPortfolioSummary();
    expect(result.totalEquity).toBe(55000);
    expect(result.usedMargin).toBe(10000);
    expect(result.freeMargin).toBe(45000);
  });

  it('calculates daily PnL from transactions', async () => {
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
      id: 'wallet-1', userId: USER_ID, cashBalance: 15000, startingBalance: 10000, reservedMargin: 0, holdings: [],
    });
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: 't1', type: 'REALIZED_PNL', amount: 2000, note: null, createdAt: new Date() },
      { id: 't2', type: 'TRADE_FEE', amount: -50, note: null, createdAt: new Date() },
    ]);
    const result = await getPortfolioSummary();
    expect(result.dailyPnl).toBe(1950);
  });

  it('skips symbols that fail price lookup', async () => {
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
      id: 'wallet-1', userId: USER_ID, cashBalance: 10000, startingBalance: 10000, reservedMargin: 0,
      holdings: [{ id: 'h1', walletId: 'wallet-1', assetSymbol: 'UNKNOWN', quantity: 1 }],
    });
    mockGetCurrentPrice.mockRejectedValue(new Error('Unknown symbol'));
    const result = await getPortfolioSummary();
    expect(result.cryptoValueUsd).toBe(0);
    expect(result.totalEquity).toBe(10000);
  });
});

describe('getRecentTrades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('returns empty array when no trades', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    const result = await getRecentTrades();
    expect(result).toEqual([]);
  });

  it('returns trades with correct shape', async () => {
    const executedAt = new Date('2026-07-06T12:00:00Z');
    mockPrisma.trade.findMany.mockResolvedValue([{
      id: 'trade-1', asset: { symbol: 'BTC/USD' }, side: 'BUY', orderType: 'MARKET', price: 50000,
      quantity: 0.5, fee: 65, pnl: 0, executedAt,
    }]);
    const result = await getRecentTrades();
    expect(result[0].price).toBe(50000);
    expect(result[0].executedAt).toBe(executedAt.toISOString());
  });

  it('respects custom limit', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await getRecentTrades(3);
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
  });

  it('orders by executedAt desc', async () => {
    mockPrisma.trade.findMany.mockResolvedValue([]);
    await getRecentTrades();
    expect(mockPrisma.trade.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { executedAt: 'desc' } }));
  });
});

describe('resetSimulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
    mockPrisma.$transaction.mockImplementation(async (promises: any) => Promise.all(promises));
  });

  it('resets with default balance', async () => {
    const result = await resetSimulation({ startingBalance: 10000 });
    expect(result.success).toBe(true);
    expect(mockPrisma.trade.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { cashBalance: 10000, startingBalance: 10000, reservedMargin: 0 },
    }));
  });

  it('resets with custom balance', async () => {
    await resetSimulation({ startingBalance: 50000 });
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { cashBalance: 50000, startingBalance: 50000, reservedMargin: 0 },
    }));
  });

  it('rejects invalid balance', async () => {
    const result = await resetSimulation({ startingBalance: -100 });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('uses default 10000 when no input', async () => {
    const result = await resetSimulation();
    expect(result.success).toBe(true);
  });
});
