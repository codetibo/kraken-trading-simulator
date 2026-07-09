import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the Prisma client
/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFindMany = jest.fn<any>();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    trade: { findMany: (...args: any[]) => mockFindMany(...args) },
    transaction: { findMany: (...args: any[]) => mockFindMany(...args) },
  },
}));

// Mock getCurrentUserId
jest.mock('@/server/actions/orders', () => ({
  getCurrentUserId: jest.fn<any>().mockResolvedValue('test-user-id'),
}));

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
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('History Page - Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listTradeHistory', () => {
    it('returns formatted trade data', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          userId: 'test-user-id',
          orderId: 'order-1',
          assetId: 'asset-1',
          asset: { symbol: 'BTC/USD' },
          marketType: 'SPOT',
          side: 'BUY',
          orderType: 'MARKET',
          price: 50000,
          quantity: 0.5,
          fee: 10,
          pnl: 0,
          executedAt: new Date('2026-07-06T10:00:00Z'),
        },
      ];
      mockFindMany.mockResolvedValue(mockTrades);

      const { listTradeHistory } = await import(
        '@/server/actions/history'
      );
      const result = await listTradeHistory();

      expect(result).toHaveLength(1);
      expect(result[0].assetSymbol).toBe('BTC/USD');
      expect(result[0].side).toBe('BUY');
      expect(result[0].orderType).toBe('MARKET');
      expect(result[0].price).toBe(50000);
      expect(result[0].quantity).toBe(0.5);
      expect(result[0].fee).toBe(10);
      expect(result[0].pnl).toBe(0);
      expect(result[0].executedAt).toBe('2026-07-06T10:00:00.000Z');
    });

    it('filters by pair', async () => {
      const { listTradeHistory } = await import(
        '@/server/actions/history'
      );
      await listTradeHistory({ pair: 'BTC' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
            asset: { symbol: { contains: 'BTC' } },
          }),
        }),
      );
    });

    it('filters by side', async () => {
      const { listTradeHistory } = await import(
        '@/server/actions/history'
      );
      await listTradeHistory({ side: 'SELL' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ side: 'SELL' }),
        }),
      );
    });

    it('filters by date range', async () => {
      const { listTradeHistory } = await import(
        '@/server/actions/history'
      );
      await listTradeHistory({ dateRange: '24h' });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = mockFindMany.mock.calls[0][0] as any;
      const whereArg = callArgs.where;
      expect(whereArg.executedAt).toBeDefined();
      expect(whereArg.executedAt.gte).toBeInstanceOf(Date);
      const diff = Date.now() - whereArg.executedAt.gte.getTime();
      // Should be within ~1 second of 24 hours
      expect(diff).toBeGreaterThan(23.5 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(24.5 * 60 * 60 * 1000);
    });
  });

  describe('listTransactions', () => {
    it('returns formatted transaction data', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'tx-1',
          userId: 'test-user-id',
          type: 'TRADE_FEE',
          amount: -10,
          note: 'MARKET BUY BTC/USD',
          createdAt: new Date('2026-07-06T10:00:00Z'),
        },
      ]);

      const { listTransactions } = await import(
        '@/server/actions/history'
      );
      const result = await listTransactions();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('TRADE_FEE');
      expect(result[0].amount).toBe(-10);
      expect(result[0].note).toBe('MARKET BUY BTC/USD');
    });

    it('filters by transaction type', async () => {
      const { listTransactions } = await import(
        '@/server/actions/history'
      );
      await listTransactions({ type: 'DEPOSIT' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
            type: 'DEPOSIT',
          }),
        }),
      );
    });
  });
});
