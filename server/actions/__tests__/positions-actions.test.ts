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
  user: { findFirst: jest.fn() },
  position: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  wallet: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  order: { create: jest.fn() },
  trade: { create: jest.fn() },
  transaction: { create: jest.fn() },
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

import { listOpenPositions, closePosition, checkLiquidations } from '@/server/actions/positions';

const USER_ID = 'test-user-id';
const ASSET_ID = 'asset-btc';

describe('listOpenPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
    mockGetCurrentPrice.mockResolvedValue(55000);
  });

  it('returns empty array when no positions', async () => {
    mockPrisma.position.findMany.mockResolvedValue([]);
    const result = await listOpenPositions();
    expect(result).toEqual([]);
  });

  it('returns LONG position with correct PnL and ROE', async () => {
    mockPrisma.position.findMany.mockResolvedValue([{
      id: 'pos-1', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
      side: 'LONG', leverage: 5, size: 1, entryPrice: 50000, markPrice: 50000, liquidationPrice: 40000,
      usedMargin: 10000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
      openedAt: new Date(), closedAt: null, updatedAt: new Date(),
    }]);
    mockGetCurrentPrice.mockResolvedValue(55000);
    const result = await listOpenPositions();
    expect(result[0].unrealizedPnl).toBe(5000);
    expect(result[0].roe).toBeCloseTo(50, 1);
  });

  it('returns SHORT position with negative PnL', async () => {
    mockPrisma.position.findMany.mockResolvedValue([{
      id: 'pos-2', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
      side: 'SHORT', leverage: 3, size: 2, entryPrice: 50000, markPrice: 50000, liquidationPrice: 66667,
      usedMargin: 33333, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
      openedAt: new Date(), closedAt: null, updatedAt: new Date(),
    }]);
    mockGetCurrentPrice.mockResolvedValue(52000);
    const result = await listOpenPositions();
    expect(result[0].unrealizedPnl).toBe(-4000);
  });

  it('handles multiple positions with different assets', async () => {
    mockPrisma.position.findMany.mockResolvedValue([
      { id: 'pos-1', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
        side: 'LONG', leverage: 5, size: 1, entryPrice: 50000, markPrice: 50000, liquidationPrice: 40000,
        usedMargin: 10000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
        openedAt: new Date(), closedAt: null, updatedAt: new Date() },
      { id: 'pos-2', userId: USER_ID, assetId: 'asset-eth', asset: { symbol: 'ETH/USD' },
        side: 'SHORT', leverage: 3, size: 10, entryPrice: 3400, markPrice: 3400, liquidationPrice: 4533,
        usedMargin: 11333, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
        openedAt: new Date(), closedAt: null, updatedAt: new Date() },
    ]);
    mockGetCurrentPrice.mockImplementation(async (symbol: string) => {
      if (symbol === 'BTC/USD') return 55000;
      if (symbol === 'ETH/USD') return 3200;
      return 0;
    });
    const result = await listOpenPositions();
    expect(result).toHaveLength(2);
  });
});

describe('closePosition', () => {
  const openPosition = {
    id: 'pos-1', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
    side: 'LONG', leverage: 5, size: 1, entryPrice: 50000, markPrice: 50000, liquidationPrice: 40000,
    usedMargin: 10000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
    openedAt: new Date(), closedAt: null, updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
    mockGetCurrentPrice.mockResolvedValue(55000);
  });

  it('closes LONG with profit', async () => {
    mockPrisma.position.findUnique.mockResolvedValue(openPosition);
    mockGetCurrentPrice.mockResolvedValue(55000);
    const mockWalletUpdate = jest.fn<any>();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        wallet: { findUniqueOrThrow: jest.fn<any>().mockResolvedValue({ id: 'wallet-1', userId: USER_ID, cashBalance: 100000, reservedMargin: 10000 }), update: mockWalletUpdate },
        position: { update: jest.fn<any>() }, order: { create: jest.fn<any>().mockResolvedValue({ id: 'close-order-1' }) }, trade: { create: jest.fn<any>() }, transaction: { create: jest.fn<any>() },
      };
      return cb(tx);
    });
    const result = await closePosition({ positionId: 'pos-1' });
    expect(result.success).toBe(true);
    expect(mockWalletUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { cashBalance: { increment: 5000 }, reservedMargin: { decrement: 10000 } },
    }));
  });

  it('closes SHORT with loss', async () => {
    mockPrisma.position.findUnique.mockResolvedValue({ ...openPosition, side: 'SHORT' });
    mockGetCurrentPrice.mockResolvedValue(55000);
    const mockWalletUpdate = jest.fn<any>();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        wallet: { findUniqueOrThrow: jest.fn<any>().mockResolvedValue({ id: 'wallet-1', userId: USER_ID, cashBalance: 100000, reservedMargin: 10000 }), update: mockWalletUpdate },
        position: { update: jest.fn<any>() }, order: { create: jest.fn<any>().mockResolvedValue({ id: 'close-order-1' }) }, trade: { create: jest.fn<any>() }, transaction: { create: jest.fn<any>() },
      };
      return cb(tx);
    });
    const result = await closePosition({ positionId: 'pos-1' });
    expect(result.success).toBe(true);
    expect(mockWalletUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cashBalance: { increment: -5000 } }),
    }));
  });

  it('rejects non-existent position', async () => {
    mockPrisma.position.findUnique.mockResolvedValue(null);
    const result = await closePosition({ positionId: 'nonexistent' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Position not found');
  });

  it('rejects already closed position', async () => {
    mockPrisma.position.findUnique.mockResolvedValue({ ...openPosition, status: 'CLOSED' });
    const result = await closePosition({ positionId: 'pos-1' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('already closed');
  });

  it('rejects invalid input', async () => {
    const result = await closePosition({} as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('checkLiquidations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentPrice.mockResolvedValue(50000);
  });

  it('returns 0 when no positions', async () => {
    mockPrisma.position.findMany.mockResolvedValue([]);
    const result = await checkLiquidations();
    expect(result.liquidatedCount).toBe(0);
  });

  it('liquidates LONG when price drops below liquidation', async () => {
    mockPrisma.position.findMany.mockResolvedValue([{
      id: 'pos-1', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
      side: 'LONG', leverage: 5, size: 1, entryPrice: 50000, markPrice: 50000, liquidationPrice: 40100,
      usedMargin: 10000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
      openedAt: new Date(), closedAt: null, updatedAt: new Date(),
    }]);
    mockGetCurrentPrice.mockResolvedValue(40000);
    const mockWalletUpdate = jest.fn<any>();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        wallet: { findUniqueOrThrow: jest.fn<any>().mockResolvedValue({ id: 'wallet-1', userId: USER_ID, reservedMargin: 10000 }), update: mockWalletUpdate },
        position: { update: jest.fn<any>() }, transaction: { create: jest.fn<any>() },
      };
      return cb(tx);
    });
    const result = await checkLiquidations();
    expect(result.liquidatedCount).toBe(1);
    expect(mockWalletUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { reservedMargin: { decrement: 10000 } },
    }));
  });

  it('liquidates SHORT when price rises above liquidation', async () => {
    mockPrisma.position.findMany.mockResolvedValue([{
      id: 'pos-2', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
      side: 'SHORT', leverage: 3, size: 1, entryPrice: 50000, markPrice: 50000, liquidationPrice: 66667,
      usedMargin: 16667, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
      openedAt: new Date(), closedAt: null, updatedAt: new Date(),
    }]);
    mockGetCurrentPrice.mockResolvedValue(67000);
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        wallet: { findUniqueOrThrow: jest.fn<any>().mockResolvedValue({ id: 'wallet-1', userId: USER_ID, reservedMargin: 16667 }), update: jest.fn<any>() },
        position: { update: jest.fn<any>() }, transaction: { create: jest.fn<any>() },
      };
      return cb(tx);
    });
    const result = await checkLiquidations();
    expect(result.liquidatedCount).toBe(1);
  });

  it('updates markPrice when position is safe', async () => {
    mockPrisma.position.findMany.mockResolvedValue([{
      id: 'pos-1', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
      side: 'LONG', leverage: 5, size: 1, entryPrice: 50000, markPrice: 50000, liquidationPrice: 40100,
      usedMargin: 10000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
      openedAt: new Date(), closedAt: null, updatedAt: new Date(),
    }]);
    mockGetCurrentPrice.mockResolvedValue(42000);
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {};
      return cb(tx);
    });
    const result = await checkLiquidations();
    expect(result.liquidatedCount).toBe(0);
    expect(mockPrisma.position.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pos-1' }, data: { markPrice: 42000 } }),
    );
  });

  it('handles mixed liquidation states', async () => {
    mockPrisma.position.findMany.mockResolvedValue([
      { id: 'pos-liq', userId: USER_ID, assetId: ASSET_ID, asset: { symbol: 'BTC/USD' },
        side: 'LONG', leverage: 5, size: 1, entryPrice: 50000, markPrice: 50000, liquidationPrice: 40100,
        usedMargin: 10000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
        openedAt: new Date(), closedAt: null, updatedAt: new Date() },
      { id: 'pos-safe', userId: USER_ID, assetId: 'asset-eth', asset: { symbol: 'ETH/USD' },
        side: 'LONG', leverage: 2, size: 10, entryPrice: 3000, markPrice: 3000, liquidationPrice: 1500,
        usedMargin: 15000, realizedPnl: 0, unrealizedPnl: 0, fundingPaid: 0, status: 'OPEN',
        openedAt: new Date(), closedAt: null, updatedAt: new Date() },
    ]);
    let callCount = 0;
    mockGetCurrentPrice.mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? 40000 : 3200;
    });
    let transactionCalls = 0;
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      transactionCalls++;
      if (transactionCalls === 1) {
        const tx = {
          wallet: { findUniqueOrThrow: jest.fn<any>().mockResolvedValue({ id: 'wallet-1', userId: USER_ID, reservedMargin: 10000 }), update: jest.fn<any>() },
          position: { update: jest.fn<any>() }, transaction: { create: jest.fn<any>() },
        };
        return cb(tx);
      }
      return [];
    });
    mockPrisma.position.update = jest.fn();
    const result = await checkLiquidations();
    expect(result.liquidatedCount).toBe(1);
  });
});
