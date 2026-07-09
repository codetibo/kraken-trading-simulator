import { describe, it, expect } from '@jest/globals';
import {
  evaluateOrder,
  evaluateOrderBook,
} from '@/lib/engine/matchingEngine';
import { calculateRiskReward, calculatePositionSizeForRisk } from '@/lib/engine/marginEngine';
import type { OrderRecord } from '@/lib/engine/types';

// ── Helpers ──

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'test-order',
    userId: 'user-1',
    assetSymbol: 'BTC/USD',
    marketType: 'SPOT',
    side: 'BUY',
    type: 'MARKET',
    status: 'OPEN',
    quantity: 1,
    filledQuantity: 0,
    feePaid: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as OrderRecord;
}

// ── Empty State Tests ──

describe('Order Flow — Empty State Edge Cases', () => {
  it('handles empty order book evaluation', () => {
    const result = evaluateOrderBook([], 50000);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('handles zero quantity market order', () => {
    const order = makeOrder({ quantity: 0, type: 'MARKET' });
    const result = evaluateOrder({ order, currentPrice: 50000 });

    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(0);
    expect(result.fill!.remainingQuantity).toBe(0);
    expect(result.fill!.isFullyFilled).toBe(true);
  });

  it('handles negative quantity gracefully', () => {
    const order = makeOrder({ quantity: -1, type: 'MARKET' });
    const result = evaluateOrder({ order, currentPrice: 50000 });

    // Should still execute (negative quantity means selling)
    expect(result.shouldExecute).toBe(true);
    expect(typeof result.fill!.filledQuantity).toBe('number');
    expect(typeof result.fill!.fee).toBe('number');
  });

  it('handles zero price gracefully in risk calculation', () => {
    const result = calculateRiskReward({
      entryPrice: 0,
      stopLossPrice: 0,
      takeProfitPrice: 0,
      size: 0,
    });

    expect(result.riskAmount).toBe(0);
    expect(result.rewardAmount).toBe(0);
    expect(result.riskRewardRatio).toBe(0);
  });

  it('returns zero position size for zero risk tolerance', () => {
    const size = calculatePositionSizeForRisk(10000, 0, 50000, 48000);
    expect(size).toBe(0);
  });

  it('handles stop loss with price equal to entry (no risk)', () => {
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 50000,
      takeProfitPrice: 55000,
      size: 1,
    });

    expect(result.riskAmount).toBe(0);
    expect(result.riskRewardRatio).toBe(0);
  });
});

// ── Large Order Edge Cases ──

describe('Order Flow — Large & Extreme Values', () => {
  it('handles extremely large market order quantity', () => {
    const hugeQuantity = 1_000_000;
    const result = evaluateOrder({
      order: makeOrder({ quantity: hugeQuantity, type: 'MARKET' }),
      currentPrice: 50000,
    });

    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(hugeQuantity);
    expect(result.fill!.isFullyFilled).toBe(true);
    expect(result.fill!.fee).toBeGreaterThan(0);
  });

  it('handles extremely small quantity (dust)', () => {
    const dustQuantity = 0.00000001;
    const result = evaluateOrder({
      order: makeOrder({ quantity: dustQuantity, type: 'MARKET' }),
      currentPrice: 50000,
    });

    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(dustQuantity);
    expect(result.fill!.fee).toBeGreaterThan(0);
  });

  it('handles limit order with extremely high price', () => {
    const result = evaluateOrder({
      order: makeOrder({
        type: 'LIMIT',
        quantity: 1,
        limitPrice: 9_999_999,
      }),
      currentPrice: 50000,
    });

    // Limit price far above current price for BUY — should trigger
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(1);
  });

  it('handles limit order with extremely low price', () => {
    const result = evaluateOrder({
      order: makeOrder({
        type: 'LIMIT',
        side: 'SELL',
        quantity: 1,
        limitPrice: 0.01,
      }),
      currentPrice: 50000,
    });

    // Limit price far below current price for SELL — should trigger
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(1);
  });

  it('handles zero price market order', () => {
    const result = evaluateOrder({
      order: makeOrder({ quantity: 1, type: 'MARKET' }),
      currentPrice: 0,
    });

    // Zero price should not crash
    expect(result.shouldExecute).toBe(true);
  });

  it('handles negative price gracefully', () => {
    const result = evaluateOrder({
      order: makeOrder({ quantity: 1, type: 'MARKET' }),
      currentPrice: -100,
    });

    expect(result.shouldExecute).toBe(true);
  });

  it('processes limit order at exact current price', () => {
    const result = evaluateOrder({
      order: makeOrder({
        type: 'LIMIT',
        limitPrice: 50000,
      }),
      currentPrice: 50000,
    });

    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(1);
    expect(result.fill!.fillPrice).toBe(50000);
  });

  it('handles max integer safe quantity', () => {
    const maxSafe = Number.MAX_SAFE_INTEGER;
    const result = evaluateOrder({
      order: makeOrder({ quantity: maxSafe, type: 'MARKET' }),
      currentPrice: 50000,
    });

    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(maxSafe);
  });

  it('handles market order with MAX_VALUE price point', () => {
    const result = evaluateOrder({
      order: makeOrder({ type: 'LIMIT', limitPrice: Number.MAX_VALUE }),
      currentPrice: 50000,
    });

    // Should execute at current price
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(1);
  });
});

// ── Concurrent Order Edge Cases ──

describe('Order Flow — Concurrent Order Edge Cases', () => {
  it('processes multiple orders at same price level', () => {
    const orders = Array.from({ length: 5 }, (_, i) =>
      makeOrder({
        id: `order-${i}`,
        type: 'LIMIT',
        limitPrice: 50000,
      }),
    );

    const result = evaluateOrderBook(orders, 50000);

    // All orders should settle
    expect(result.size).toBe(5);
    result.forEach((outcome) => {
      expect(outcome.shouldExecute).toBe(true);
    });
  });

  it('processes mixed BUY and SELL orders in batch', () => {
    const orders = [
      makeOrder({ id: 'buy-1', side: 'BUY', type: 'MARKET', quantity: 2 }),
      makeOrder({ id: 'sell-1', side: 'SELL', type: 'MARKET', quantity: 1 }),
      makeOrder({ id: 'buy-2', side: 'BUY', type: 'LIMIT', quantity: 3, limitPrice: 49000 }),
    ];

    const result = evaluateOrderBook(orders, 50000);

    // MARKET orders should execute; LIMIT at 49000 should not (price is 50000 > 49000)
    expect(result.size).toBe(3);
    expect(result.get('buy-1')!.shouldExecute).toBe(true);
    expect(result.get('sell-1')!.shouldExecute).toBe(true);
    expect(result.get('buy-2')!.shouldExecute).toBe(false);
  });

  it('handles same order appearing twice', () => {
    const duplicate = makeOrder({ id: 'dup', type: 'LIMIT', limitPrice: 50000 });
    const orders = [duplicate, duplicate];

    const result = evaluateOrderBook(orders, 50000);

    // Both should fill independently (Map overwrites duplicates)
    expect(result.size).toBe(1);
    expect(result.get('dup')!.shouldExecute).toBe(true);
  });

  it('processes orders with same timestamp concurrently', () => {
    const now = new Date();
    const orders = Array.from({ length: 10 }, (_, i) =>
      makeOrder({
        id: `concurrent-${i}`,
        type: 'MARKET',
        quantity: 1,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const result = evaluateOrderBook(orders, 50000);

    // All 10 market orders should fill instantly
    expect(result.size).toBe(10);
    result.forEach((outcome) => {
      expect(outcome.shouldExecute).toBe(true);
    });
  });

  it('skips non-open orders in batch evaluation', () => {
    const orders = [
      makeOrder({ id: 'open-1', type: 'MARKET', status: 'OPEN' }),
      makeOrder({ id: 'filled-1', type: 'MARKET', status: 'FILLED' }),
      makeOrder({ id: 'cancelled-1', type: 'LIMIT', status: 'CANCELLED', limitPrice: 50000 }),
      makeOrder({ id: 'part-filled', type: 'LIMIT', status: 'PARTIALLY_FILLED', quantity: 5, filledQuantity: 2, limitPrice: 50000 }),
    ];

    const result = evaluateOrderBook(orders, 50000);

    // OPEN and PARTIALLY_FILLED should be evaluated (2 orders)
    expect(result.size).toBe(2);
    expect(result.has('open-1')).toBe(true);
    expect(result.has('part-filled')).toBe(true);
  });
});
