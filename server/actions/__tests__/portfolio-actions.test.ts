import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type MockFn = ReturnType<typeof jest.fn>;

// Mock prisma
const mockPrisma: Record<string, Record<string, MockFn>> = {
  wallet: {
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
  },
  position: {
    findMany: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
  },
  candle: {
    findMany: jest.fn(),
  },
  asset: {
    findUnique: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock price feed
const mockGetCurrentPrice: MockFn = jest.fn();
jest.mock('@/lib/engine/priceFeed/PriceFeedFactory', () => ({
  getPriceFeed: () => ({
    getCurrentPrice: mockGetCurrentPrice,
  }),
}));

// Mock getCurrentUserId
jest.mock('@/server/actions/orders', () => ({
  getCurrentUserId: () => Promise.resolve('test-user-id'),
}));

import { getHoldings, getEquityHistory } from '@/server/actions/portfolio';

describe('portfolio actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHoldings', () => {
    it('returns holdings with current prices', async () => {
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
        id: 'wallet-1',
        userId: 'test-user-id',
        cashBalance: 10000,
        startingBalance: 10000,
        holdings: [
          { id: 'h1', walletId: 'wallet-1', assetSymbol: 'BTC', quantity: 0.5 },
          { id: 'h2', walletId: 'wallet-1', assetSymbol: 'ETH', quantity: 10 },
        ],
      });

      mockGetCurrentPrice.mockImplementation((symbol: string) => {
        if (symbol === 'BTC/USD') return Promise.resolve(50000);
        if (symbol === 'ETH/USD') return Promise.resolve(3000);
        return Promise.reject(new Error('Unknown symbol'));
      });

      const result = await getHoldings();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        assetSymbol: 'BTC/USD',
        baseSymbol: 'BTC',
        quantity: 0.5,
        currentPrice: 50000,
        valueUsd: 25000,
      });
      expect(result[1]).toEqual({
        assetSymbol: 'ETH/USD',
        baseSymbol: 'ETH',
        quantity: 10,
        currentPrice: 3000,
        valueUsd: 30000,
      });
    });

    it('skips holdings with zero quantity', async () => {
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
        id: 'wallet-1',
        userId: 'test-user-id',
        cashBalance: 10000,
        startingBalance: 10000,
        holdings: [
          { id: 'h1', walletId: 'wallet-1', assetSymbol: 'BTC', quantity: 0 },
        ],
      });

      const result = await getHoldings();
      expect(result).toHaveLength(0);
    });

    it('returns empty array when there are no holdings', async () => {
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
        id: 'wallet-1',
        userId: 'test-user-id',
        cashBalance: 10000,
        startingBalance: 10000,
        holdings: [],
      });

      const result = await getHoldings();
      expect(result).toHaveLength(0);
    });

    it('skips symbols that fail price lookup', async () => {
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
        id: 'wallet-1',
        userId: 'test-user-id',
        cashBalance: 10000,
        startingBalance: 10000,
        holdings: [
          { id: 'h1', walletId: 'wallet-1', assetSymbol: 'BTC', quantity: 0.5 },
        ],
      });

      mockGetCurrentPrice.mockRejectedValue(new Error('Unknown symbol'));

      const result = await getHoldings();
      expect(result).toHaveLength(0);
    });
  });

  describe('getEquityHistory', () => {
    it('returns equity history points with correct structure and ordering', async () => {
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
        id: 'wallet-1',
        userId: 'test-user-id',
        cashBalance: 15000,
        startingBalance: 10000,
        holdings: [
          { id: 'h1', walletId: 'wallet-1', assetSymbol: 'BTC', quantity: 0.5 },
        ],
      });

      mockPrisma.position.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.candle.findMany.mockResolvedValue([]);
      mockGetCurrentPrice.mockResolvedValue(51000);

      const result = await getEquityHistory();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(25);

      for (const point of result) {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('equity');
        expect(typeof point.timestamp).toBe('string');
        expect(typeof point.equity).toBe('number');
      }

      // Verify chronological order
      const timestamps = result.map((p: { timestamp: string }) =>
        new Date(p.timestamp).getTime(),
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('returns consistent equity for empty wallet with no transactions', async () => {
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
        id: 'wallet-1',
        userId: 'test-user-id',
        cashBalance: 10000,
        startingBalance: 10000,
        holdings: [],
      });

      mockPrisma.position.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.candle.findMany.mockResolvedValue([]);
      mockGetCurrentPrice.mockResolvedValue(0);

      const result = await getEquityHistory();
      expect(result.length).toBe(25);
      // All points should show $10,000 equity (cash only, no movements)
      for (const point of result) {
        expect(point.equity).toBeCloseTo(10000, -1);
      }
    });
  });
});
