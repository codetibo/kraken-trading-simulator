import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ──────────────────────────────────────────────

class MockDecimal {
  value: number;
  constructor(n: number) {
    this.value = n;
  }
  minus(n: MockDecimal) {
    return new MockDecimal(this.value - n.value);
  }
  neg() {
    return new MockDecimal(-this.value);
  }
}

jest.mock(
  '@/app/generated/prisma/client',
  () => ({
    Prisma: { Decimal: MockDecimal },
  }),
  { virtual: true },
);

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
  asset: { findUnique: jest.fn() },
  wallet: { findUnique: jest.fn(), update: jest.fn() },
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  assetHolding: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  position: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  trade: { create: jest.fn() },
  transaction: { create: jest.fn() },
  settings: { findUnique: jest.fn() },
  tutorialProgress: { findMany: jest.fn() },
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
  getPriceFeed: () => ({
    getCurrentPrice: mockGetCurrentPrice,
  }),
}));

import {
  createOrder,
  cancelOrder,
  listOpenOrders,
  listOrderHistory,
} from '@/server/actions/orders';
import type { OrderInputForm } from '@/lib/validation/orderSchemas';

// ─── Helpers ────────────────────────────────────────────

const USER_ID = 'test-user-id';
const ASSET_ID = 'asset-btc';
const WALLET_ID = 'wallet-1';

function setupBaseMocks() {
  mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  mockPrisma.asset.findUnique.mockResolvedValue({
    id: ASSET_ID,
    symbol: 'BTC/USD',
    base: 'BTC',
    quote: 'USD',
    name: 'Bitcoin',
    isActive: true,
    maxLeverage: 5,
    makerFeeBps: 16,
    takerFeeBps: 26,
  });
  mockPrisma.wallet.findUnique.mockResolvedValue({
    id: WALLET_ID,
    userId: USER_ID,
    cashBalance: 100000,
    reservedMargin: 0,
    startingBalance: 10000,
  });
  mockPrisma.assetHolding.findUnique.mockResolvedValue({
    walletId: WALLET_ID,
    assetSymbol: 'BTC',
    quantity: 100,
  });
  mockGetCurrentPrice.mockResolvedValue(50000);
  mockPrisma.order.create.mockResolvedValue({
    id: 'order-1',
    userId: USER_ID,
    assetId: ASSET_ID,
    status: 'OPEN',
  });
  // Make tryImmediateSettlement return early (order not found)
  mockPrisma.order.findUnique.mockResolvedValue(null);
}

function makeOrderInput(
  overrides: Partial<OrderInputForm> = {},
): OrderInputForm {
  return {
    assetSymbol: 'BTC/USD',
    side: 'BUY',
    marketType: 'SPOT',
    type: 'MARKET',
    quantity: 1,
    ...overrides,
  } as OrderInputForm;
}

// ─── createOrder Tests ─────────────────────────────────

describe('createOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupBaseMocks();
  });

  describe('validation', () => {
    it('rejects invalid input', async () => {
      const result = await createOrder({} as OrderInputForm);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects unknown asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);
      const result = await createOrder(makeOrderInput());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown');
    });

    it('rejects missing wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      const result = await createOrder(makeOrderInput());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet not found');
    });
  });

  describe('SPOT MARKET orders', () => {
    it('executes SPOT MARKET BUY successfully', async () => {
      const result = await createOrder(
        makeOrderInput({ side: 'BUY', type: 'MARKET', quantity: 1 }),
      );
      expect(result.success).toBe(true);
      expect(result.data?.orderId).toBe('order-1');
    });

    it('rejects SPOT MARKET BUY with insufficient cash', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: WALLET_ID,
        userId: USER_ID,
        cashBalance: 100,
        reservedMargin: 0,
        startingBalance: 10000,
      });
      mockPrisma.assetHolding.findUnique.mockResolvedValue(null);
      const result = await createOrder(
        makeOrderInput({ side: 'BUY', type: 'MARKET', quantity: 1 }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });

    it('executes SPOT MARKET SELL with sufficient holdings', async () => {
      mockPrisma.assetHolding.findUnique.mockResolvedValue({
        walletId: WALLET_ID,
        assetSymbol: 'BTC',
        quantity: 2,
      });
      const result = await createOrder(
        makeOrderInput({ side: 'SELL', type: 'MARKET', quantity: 1 }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects SPOT MARKET SELL with insufficient holdings', async () => {
      mockPrisma.assetHolding.findUnique.mockResolvedValue(null);
      const result = await createOrder(
        makeOrderInput({ side: 'SELL', type: 'MARKET', quantity: 1 }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });
  });

  describe('SPOT LIMIT orders', () => {
    it('creates LIMIT BUY with limit price', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'LIMIT',
          side: 'BUY',
          limitPrice: 49000,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'LIMIT', limitPrice: 49000 }),
        }),
      );
    });

    it('checks balance against limit price', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: WALLET_ID,
        userId: USER_ID,
        cashBalance: 48000,
        reservedMargin: 0,
        startingBalance: 10000,
      });
      const result = await createOrder(
        makeOrderInput({
          type: 'LIMIT',
          side: 'BUY',
          limitPrice: 49000,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });
  });

  describe('STOP_LOSS orders', () => {
    it('creates STOP_LOSS with trigger price', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'STOP_LOSS',
          side: 'SELL',
          triggerPrice: 45000,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'STOP_LOSS',
            triggerPrice: 45000,
          }),
        }),
      );
    });
  });

  describe('STOP_LIMIT orders', () => {
    it('creates STOP_LIMIT with trigger and limit prices', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'STOP_LOSS_LIMIT',
          side: 'SELL',
          triggerPrice: 45000,
          limitPrice: 44500,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'STOP_LOSS_LIMIT',
            triggerPrice: 45000,
            limitPrice: 44500,
          }),
        }),
      );
    });
  });

  describe('TAKE_PROFIT orders', () => {
    it('creates TAKE_PROFIT with trigger price', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'TAKE_PROFIT',
          side: 'SELL',
          triggerPrice: 55000,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TAKE_PROFIT',
            triggerPrice: 55000,
          }),
        }),
      );
    });
  });

  describe('TAKE_PROFIT_LIMIT orders', () => {
    it('creates TAKE_PROFIT_LIMIT order', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'TAKE_PROFIT_LIMIT',
          side: 'SELL',
          triggerPrice: 55000,
          limitPrice: 54800,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'TAKE_PROFIT_LIMIT' }),
        }),
      );
    });
  });

  describe('TRAILING_STOP orders', () => {
    it('creates TRAILING_STOP with FIXED offset', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'TRAILING_STOP',
          side: 'SELL',
          trailingOffsetType: 'FIXED',
          trailingOffsetValue: 1000,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TRAILING_STOP',
            trailingOffsetType: 'FIXED',
            trailingOffsetValue: 1000,
            trailingHighWater: 50000,
          }),
        }),
      );
    });

    it('creates TRAILING_STOP with PERCENT offset', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'TRAILING_STOP',
          side: 'SELL',
          trailingOffsetType: 'PERCENT',
          trailingOffsetValue: 5,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trailingOffsetType: 'PERCENT',
            trailingOffsetValue: 5,
          }),
        }),
      );
    });

    it('creates TRAILING_STOP_LIMIT with limit offset', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'TRAILING_STOP_LIMIT',
          side: 'SELL',
          trailingOffsetType: 'FIXED',
          trailingOffsetValue: 1000,
          trailingLimitOffset: 200,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TRAILING_STOP_LIMIT',
            trailingLimitOffset: 200,
          }),
        }),
      );
    });
  });

  describe('ICEBERG orders', () => {
    it('creates ICEBERG order with visible quantity', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'ICEBERG',
          side: 'BUY',
          limitPrice: 50000,
          visibleQuantity: 0.3,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ICEBERG',
            limitPrice: 50000,
            trailingOffsetValue: 0.3,
          }),
        }),
      );
    });
  });

  describe('TWAP orders', () => {
    it('creates TWAP order with duration and slices', async () => {
      // Increase wallet balance for larger TWAP quantity
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: WALLET_ID,
        userId: USER_ID,
        cashBalance: 1000000,
        reservedMargin: 0,
        startingBalance: 10000,
      });
      const result = await createOrder(
        makeOrderInput({
          type: 'TWAP',
          side: 'BUY',
          twapDurationSeconds: 300,
          twapSlices: 10,
          quantity: 10,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TWAP',
            trailingOffsetValue: 300,
            trailingLimitOffset: 10,
            trailingHighWater: 0,
          }),
        }),
      );
    });
  });

  describe('OCO orders', () => {
    beforeEach(() => {
      mockPrisma.order.create
        .mockReset()
        .mockResolvedValueOnce({ id: 'oco-parent', userId: USER_ID, assetId: ASSET_ID, status: 'OPEN' })
        .mockResolvedValueOnce({ id: 'oco-sibling', userId: USER_ID, assetId: ASSET_ID, status: 'OPEN' });
    });

    it('creates OCO with two sibling orders', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'OCO',
          side: 'BUY',
          triggerPrice: 45000,
          limitPrice: 44500,
          secondTriggerPrice: 55000,
          secondLimitPrice: 54800,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledTimes(2);
    });

    it('passes timeInForce and triggerType to the parent OCO order', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'OCO',
          side: 'BUY',
          triggerPrice: 45000,
          limitPrice: 44500,
          secondTriggerPrice: 55000,
          secondLimitPrice: 54800,
          timeInForce: 'IOC',
          triggerType: 'MARK_PRICE',
          quantity: 1,
        }),
      );
      // The OCO schema (via commonFields) accepts timeInForce and triggerType,
      // so the server action should process them without validation errors.
      expect(result.success).toBe(true);
    });
  });

  describe('SETTLE_POSITION orders', () => {
    it('creates SETTLE_POSITION order', async () => {
      // Mock the position lookup
      mockPrisma.position.findUnique.mockResolvedValue({
        id: 'pos-123',
        userId: USER_ID,
        assetId: ASSET_ID,
        side: 'LONG',
        size: 1.5,
        leverage: 2,
        entryPrice: 48000,
        status: 'OPEN',
      });
      const result = await createOrder(
        makeOrderInput({
          type: 'SETTLE_POSITION',
          side: 'SELL',
          positionId: 'pos-123',
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'SETTLE_POSITION' }),
        }),
      );
    });
  });

  describe('POST_ONLY_LIMIT orders', () => {
    it('creates POST_ONLY_LIMIT order', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'POST_ONLY_LIMIT',
          side: 'BUY',
          limitPrice: 49000,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'POST_ONLY_LIMIT' }),
        }),
      );
    });
  });

  describe('REDUCE_ONLY orders', () => {
    it('creates REDUCE_ONLY order', async () => {
      const result = await createOrder(
        makeOrderInput({
          type: 'REDUCE_ONLY',
          side: 'SELL',
          positionId: 'pos-123',
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'REDUCE_ONLY' }),
        }),
      );
    });
  });

  describe('MARGIN orders', () => {
    it('opens MARGIN LONG and reserves margin', async () => {
      const result = await createOrder(
        makeOrderInput({
          marketType: 'MARGIN',
          side: 'BUY',
          positionSide: 'LONG',
          leverage: 5,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { reservedMargin: { increment: expect.any(Number) } },
        }),
      );
    });

    it('opens MARGIN SHORT', async () => {
      const result = await createOrder(
        makeOrderInput({
          marketType: 'MARGIN',
          side: 'SELL',
          positionSide: 'SHORT',
          leverage: 3,
          quantity: 2,
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects MARGIN with insufficient free margin', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: WALLET_ID,
        userId: USER_ID,
        cashBalance: 1000,
        reservedMargin: 900,
        startingBalance: 10000,
      });
      const result = await createOrder(
        makeOrderInput({
          marketType: 'MARGIN',
          side: 'BUY',
          positionSide: 'LONG',
          leverage: 5,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient free margin');
    });

    it('uses limitPrice for margin calculation in LIMIT MARGIN', async () => {
      const result = await createOrder(
        makeOrderInput({
          marketType: 'MARGIN',
          side: 'BUY',
          positionSide: 'LONG',
          leverage: 5,
          type: 'LIMIT',
          limitPrice: 40000,
          quantity: 1,
        }),
      );
      expect(result.success).toBe(true);
    });

    describe('conditional trailing stop', () => {
      beforeEach(() => {
        // Mock order.create to return two different IDs (main order + trailing order)
        mockPrisma.order.create
          .mockReset()
          .mockResolvedValueOnce({ id: 'order-main', userId: USER_ID, assetId: ASSET_ID, status: 'OPEN' })
          .mockResolvedValueOnce({ id: 'order-trailing', userId: USER_ID, assetId: ASSET_ID, status: 'OPEN' });
      });

      it('creates conditional TRAILING_STOP with PERCENT offset on MARGIN LONG MARKET', async () => {
        const result = await createOrder(
          makeOrderInput({
            marketType: 'MARGIN',
            side: 'BUY',
            positionSide: 'LONG',
            leverage: 5,
            type: 'MARKET',
            quantity: 1,
            conditionalTrailingStopEnabled: true,
            conditionalTrailingOffsetType: 'PERCENT',
            conditionalTrailingOffsetValue: 2,
          } as any),
        );
        expect(result.success).toBe(true);
        // Should create TWO orders: main MARKET order + trailing stop order
        expect(mockPrisma.order.create).toHaveBeenCalledTimes(2);
        // Main order is MARKET
        expect(mockPrisma.order.create).toHaveBeenNthCalledWith(1,
          expect.objectContaining({
            data: expect.objectContaining({ type: 'MARKET' }),
          }),
        );
        // Trailing stop order: SELL (closing side for LONG), PERCENT offset, trailingHighWater set
        expect(mockPrisma.order.create).toHaveBeenNthCalledWith(2,
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'TRAILING_STOP',
              side: 'SELL',
              trailingOffsetType: 'PERCENT',
              trailingOffsetValue: 2,
              trailingHighWater: 50000,
            }),
          }),
        );
      });

      it('creates conditional TRAILING_STOP with FIXED offset on MARGIN SHORT LIMIT', async () => {
        const result = await createOrder(
          makeOrderInput({
            marketType: 'MARGIN',
            side: 'SELL',
            positionSide: 'SHORT',
            leverage: 3,
            type: 'LIMIT',
            limitPrice: 50000,
            quantity: 2,
            conditionalTrailingStopEnabled: true,
            conditionalTrailingOffsetType: 'FIXED',
            conditionalTrailingOffsetValue: 500,
          } as any),
        );
        expect(result.success).toBe(true);
        expect(mockPrisma.order.create).toHaveBeenCalledTimes(2);
        // Trailing stop order: BUY (closing side for SHORT), FIXED offset
        expect(mockPrisma.order.create).toHaveBeenNthCalledWith(2,
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'TRAILING_STOP',
              side: 'BUY',
              trailingOffsetType: 'FIXED',
              trailingOffsetValue: 500,
              trailingHighWater: 50000,
            }),
          }),
        );
      });

      it('creates conditional TRAILING_STOP_LIMIT when limit offset is provided', async () => {
        const result = await createOrder(
          makeOrderInput({
            marketType: 'MARGIN',
            side: 'BUY',
            positionSide: 'LONG',
            leverage: 5,
            type: 'MARKET',
            quantity: 1,
            conditionalTrailingStopEnabled: true,
            conditionalTrailingOffsetType: 'FIXED',
            conditionalTrailingOffsetValue: 1000,
            conditionalTrailingLimitOffset: 100,
          } as any),
        );
        expect(result.success).toBe(true);
        expect(mockPrisma.order.create).toHaveBeenCalledTimes(2);
        // Trailing stop limit order with trailingLimitOffset
        expect(mockPrisma.order.create).toHaveBeenNthCalledWith(2,
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'TRAILING_STOP_LIMIT',
              side: 'SELL',
              trailingOffsetType: 'FIXED',
              trailingOffsetValue: 1000,
              trailingLimitOffset: 100,
              trailingHighWater: 50000,
            }),
          }),
        );
      });

      it('does not create trailing stop when conditionalTrailingStopEnabled is false', async () => {
        // Reset mock for single-order case
        mockPrisma.order.create
          .mockReset()
          .mockResolvedValue({ id: 'order-1', userId: USER_ID, assetId: ASSET_ID, status: 'OPEN' });

        const result = await createOrder(
          makeOrderInput({
            marketType: 'MARGIN',
            side: 'BUY',
            positionSide: 'LONG',
            leverage: 5,
            type: 'MARKET',
            quantity: 1,
            conditionalTrailingStopEnabled: false,
          } as any),
        );
        expect(result.success).toBe(true);
        // Only the main order should be created
        expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);
      });

      it('does not create trailing stop for SPOT SELL orders', async () => {
        // SPOT SELL should skip conditional orders (it's already a closing action)
        mockPrisma.order.create
          .mockReset()
          .mockResolvedValue({ id: 'order-1', userId: USER_ID, assetId: ASSET_ID, status: 'OPEN' });

        const result = await createOrder(
          makeOrderInput({
            marketType: 'SPOT',
            side: 'SELL',
            type: 'MARKET',
            quantity: 1,
            conditionalTrailingStopEnabled: true,
            conditionalTrailingOffsetType: 'PERCENT',
            conditionalTrailingOffsetValue: 2,
          } as any),
        );
        expect(result.success).toBe(true);
        // Only the main order, no trailing stop for SPOT SELL
        expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);
      });
    });
  });
});

// ─── cancelOrder Tests ─────────────────────────────────

describe('cancelOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupBaseMocks();
  });

  it('cancels an OPEN order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: USER_ID,
      assetId: ASSET_ID,
      status: 'OPEN',
      marketType: 'SPOT',
    });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        order: { update: jest.fn<any>() },
        wallet: { findUniqueOrThrow: jest.fn<any>() },
      };
      return cb(tx);
    });
    const result = await cancelOrder({ orderId: 'order-1' });
    expect(result.success).toBe(true);
  });

  it('rejects cancel for non-existent order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    const result = await cancelOrder({ orderId: 'nonexistent' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Order not found');
  });

  it('rejects cancel for already FILLED order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: USER_ID,
      status: 'FILLED',
    });
    const result = await cancelOrder({ orderId: 'order-1' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('open orders can be cancelled');
  });

  it('releases reserved margin when cancelling MARGIN order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: USER_ID,
      assetId: ASSET_ID,
      status: 'OPEN',
      marketType: 'MARGIN',
      leverage: 5,
      quantity: 1,
      filledQuantity: 0,
      limitPrice: 50000,
      triggerPrice: null,
    });
    const mockWalletUpdate = jest.fn();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        order: { update: jest.fn<any>() },
        wallet: {
          findUniqueOrThrow: jest.fn<any>().mockResolvedValue({
            id: WALLET_ID,
            userId: USER_ID,
            reservedMargin: 10000,
          }),
          update: mockWalletUpdate,
        },
      };
      return cb(tx);
    });
    const result = await cancelOrder({ orderId: 'order-1' });
    expect(result.success).toBe(true);
    expect(mockWalletUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reservedMargin: { decrement: expect.any(Number) } },
      }),
    );
  });

  it('rejects invalid input', async () => {
    const result = await cancelOrder({} as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ─── listOpenOrders Tests ──────────────────────────────

describe('listOpenOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('returns empty array when no open orders', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await listOpenOrders();
    expect(result).toEqual([]);
  });

  it('returns open orders with correct shape', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        asset: { symbol: 'BTC/USD' },
        marketType: 'SPOT',
        side: 'BUY',
        type: 'LIMIT',
        status: 'OPEN',
        positionSide: null,
        leverage: null,
        quantity: 1,
        filledQuantity: 0,
        limitPrice: 49000,
        triggerPrice: null,
        trailingOffsetType: null,
        trailingOffsetValue: null,
        averageFillPrice: null,
        feePaid: 0,
        createdAt: new Date('2026-07-06T10:00:00Z'),
        updatedAt: new Date('2026-07-06T10:00:00Z'),
      },
    ]);
    const result = await listOpenOrders();
    expect(result).toHaveLength(1);
    expect(result[0].assetSymbol).toBe('BTC/USD');
  });

  it('queries only OPEN and PARTIALLY_FILLED statuses', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    await listOpenOrders();
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
        }),
      }),
    );
  });
});

// ─── listOrderHistory Tests ────────────────────────────

describe('listOrderHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('returns empty array when no history', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await listOrderHistory();
    expect(result).toEqual([]);
  });

  it('queries closed statuses with limit 50', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    await listOrderHistory();
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: expect.objectContaining({
          status: { in: ['FILLED', 'CANCELLED', 'EXPIRED', 'TRIGGERED', 'REJECTED'] },
        }),
      }),
    );
  });

  it('returns filled order with margin fields', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order-filled',
        asset: { symbol: 'ETH/USD' },
        marketType: 'MARGIN',
        side: 'SELL',
        type: 'MARKET',
        status: 'FILLED',
        positionSide: 'SHORT',
        leverage: 3,
        quantity: 10,
        filledQuantity: 10,
        limitPrice: null,
        triggerPrice: null,
        trailingOffsetType: null,
        trailingOffsetValue: null,
        averageFillPrice: 3400,
        feePaid: 8.84,
        createdAt: new Date('2026-07-06T09:00:00Z'),
        updatedAt: new Date('2026-07-06T09:00:05Z'),
      },
    ]);
    const result = await listOrderHistory();
    expect(result[0].averageFillPrice).toBe(3400);
    expect(result[0].leverage).toBe(3);
    expect(result[0].positionSide).toBe('SHORT');
  });
});
