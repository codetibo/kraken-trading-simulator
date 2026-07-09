import { evaluateOrder, evaluateOrderBook } from '../matchingEngine';
import type { OrderRecord, OrderSide } from '../types';
import { DEFAULT_FEE_SCHEDULE } from '../types';
import type { MatchContext } from '../matchingEngine';

// ─── Helpers ───────────────────────────────────────────

const BASE_TIME = new Date('2026-07-06T12:00:00Z');

function makeOrder(
  overrides: Partial<OrderRecord> & {
    type: OrderRecord['type'];
    side: OrderSide;
  },
): OrderRecord {
  return {
    id: 'test-order-1',
    userId: 'user-1',
    assetSymbol: 'BTC/USD',
    marketType: 'SPOT',
    status: 'OPEN',
    quantity: 1,
    filledQuantity: 0,
    feePaid: 0,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  };
}

function ctx(order: OrderRecord, currentPrice: number): MatchContext {
  return { order, currentPrice };
}

// ─── MARKET Orders ─────────────────────────────────────

describe('MARKET orders', () => {
  it('executes immediately at current price', () => {
    const order = makeOrder({ type: 'MARKET', side: 'BUY' });
    const result = evaluateOrder(ctx(order, 50000));

    expect(result.shouldExecute).toBe(true);
    expect(result.shouldTrigger).toBe(false);
    expect(result.newStatus).toBe('FILLED');
    expect(result.fill).toBeDefined();
    expect(result.fill!.fillPrice).toBe(50000);
    expect(result.fill!.filledQuantity).toBe(1);
    expect(result.fill!.isFullyFilled).toBe(true);
  });

  it('charges taker fee', () => {
    const order = makeOrder({ type: 'MARKET', side: 'BUY', quantity: 1 });
    const result = evaluateOrder(ctx(order, 50000));
    // taker fee = 50000 * (26 / 10000) = $130
    expect(result.fill!.fee).toBeCloseTo(130, 2);
  });

  it('handles SELL market order', () => {
    const order = makeOrder({ type: 'MARKET', side: 'SELL' });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.fillPrice).toBe(50000);
  });

  it('fills remaining quantity for partially filled orders', () => {
    const order = makeOrder({
      type: 'MARKET',
      side: 'BUY',
      quantity: 2,
      filledQuantity: 0.5,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.fill!.filledQuantity).toBe(1.5); // remaining = 2 - 0.5
    expect(result.fill!.isFullyFilled).toBe(true);
    expect(result.newStatus).toBe('FILLED');
  });
});

// ─── LIMIT Orders ──────────────────────────────────────

describe('LIMIT orders', () => {
  it('executes BUY limit when price drops to limit', () => {
    const order = makeOrder({
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: 49000,
    });
    const result = evaluateOrder(ctx(order, 49000)); // price == limit
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.fillPrice).toBe(49000);
  });

  it('executes BUY limit when price goes below limit (better price)', () => {
    const order = makeOrder({
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: 50000,
    });
    const result = evaluateOrder(ctx(order, 49000)); // price < limit, better for buyer
    expect(result.shouldExecute).toBe(true);
    // execution price should be the current (better) price, not the limit
    expect(result.fill!.fillPrice).toBe(49000);
  });

  it('executes SELL limit when price rises to limit', () => {
    const order = makeOrder({
      type: 'LIMIT',
      side: 'SELL',
      limitPrice: 51000,
    });
    const result = evaluateOrder(ctx(order, 51000)); // price == limit
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.fillPrice).toBe(51000);
  });

  it('does NOT execute BUY limit when price is above limit', () => {
    const order = makeOrder({
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: 49000,
    });
    const result = evaluateOrder(ctx(order, 50000)); // price > limit
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('OPEN');
  });

  it('does NOT execute SELL limit when price is below limit', () => {
    const order = makeOrder({
      type: 'LIMIT',
      side: 'SELL',
      limitPrice: 51000,
    });
    const result = evaluateOrder(ctx(order, 50000)); // price < limit
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('OPEN');
  });

  it('charges maker fee (cheaper than taker)', () => {
    const order = makeOrder({
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: 50000,
    });
    const makerResult = evaluateOrder(ctx(order, 50000));
    const takerFee = 50000 * (DEFAULT_FEE_SCHEDULE.takerFeeBps / 10000);
    const makerFee = 50000 * (DEFAULT_FEE_SCHEDULE.makerFeeBps / 10000);
    expect(makerResult.fill!.fee).toBe(makerFee); // maker fee
    expect(makerFee).toBeLessThan(takerFee);
  });
});

// ─── STOP_LOSS Orders ─────────────────────────────────

describe('STOP_LOSS orders', () => {
  it('triggers SELL stop loss when price drops to trigger', () => {
    const order = makeOrder({
      type: 'STOP_LOSS',
      side: 'SELL',
      triggerPrice: 48000,
    });
    const result = evaluateOrder(ctx(order, 48000));
    expect(result.shouldTrigger).toBe(true);
    expect(result.newStatus).toBe('TRIGGERED');
    expect(result.shouldExecute).toBe(false); // creates child order
  });

  it('triggers SELL stop loss when price goes below trigger', () => {
    const order = makeOrder({
      type: 'STOP_LOSS',
      side: 'SELL',
      triggerPrice: 48000,
    });
    const result = evaluateOrder(ctx(order, 47000));
    expect(result.shouldTrigger).toBe(true);
  });

  it('does not trigger when price is above trigger (SELL stop)', () => {
    const order = makeOrder({
      type: 'STOP_LOSS',
      side: 'SELL',
      triggerPrice: 48000,
    });
    const result = evaluateOrder(ctx(order, 49000));
    expect(result.shouldTrigger).toBe(false);
    expect(result.newStatus).toBe('OPEN');
  });

  it('triggers BUY stop loss when price rises to trigger (for short covering)', () => {
    const order = makeOrder({
      type: 'STOP_LOSS',
      side: 'BUY',
      triggerPrice: 52000,
    });
    const result = evaluateOrder(ctx(order, 52000));
    expect(result.shouldTrigger).toBe(true);
  });

  it('does not trigger BUY stop when price is below trigger', () => {
    const order = makeOrder({
      type: 'STOP_LOSS',
      side: 'BUY',
      triggerPrice: 52000,
    });
    const result = evaluateOrder(ctx(order, 51000));
    expect(result.shouldTrigger).toBe(false);
  });
});

// ─── STOP_LOSS_LIMIT Orders ────────────────────────────────

describe('STOP_LOSS_LIMIT orders', () => {
  it('triggers when price crosses trigger price', () => {
    const order = makeOrder({
      type: 'STOP_LOSS_LIMIT',
      side: 'SELL',
      triggerPrice: 48000,
      limitPrice: 47500,
    });
    const result = evaluateOrder(ctx(order, 48000));
    expect(result.shouldTrigger).toBe(true);
    expect(result.newStatus).toBe('TRIGGERED');
  });
});

// ─── TAKE_PROFIT Orders ───────────────────────────────

describe('TAKE_PROFIT orders', () => {
  it('triggers SELL take profit when price rises to trigger (long position)', () => {
    const order = makeOrder({
      type: 'TAKE_PROFIT',
      side: 'SELL',
      triggerPrice: 55000,
    });
    const result = evaluateOrder(ctx(order, 55000));
    expect(result.shouldTrigger).toBe(true);
    expect(result.newStatus).toBe('TRIGGERED');
  });

  it('does not trigger SELL take profit when price is below trigger', () => {
    const order = makeOrder({
      type: 'TAKE_PROFIT',
      side: 'SELL',
      triggerPrice: 55000,
    });
    const result = evaluateOrder(ctx(order, 54000));
    expect(result.shouldTrigger).toBe(false);
  });

  it('triggers BUY take profit when price drops to trigger (short position)', () => {
    const order = makeOrder({
      type: 'TAKE_PROFIT',
      side: 'BUY',
      triggerPrice: 45000,
    });
    const result = evaluateOrder(ctx(order, 45000));
    expect(result.shouldTrigger).toBe(true);
  });
});

// ─── TAKE_PROFIT_LIMIT Orders ─────────────────────────

describe('TAKE_PROFIT_LIMIT orders', () => {
  it('triggers when price crosses trigger price', () => {
    const order = makeOrder({
      type: 'TAKE_PROFIT_LIMIT',
      side: 'SELL',
      triggerPrice: 55000,
      limitPrice: 54800,
    });
    const result = evaluateOrder(ctx(order, 55000));
    expect(result.shouldTrigger).toBe(true);
    expect(result.newStatus).toBe('TRIGGERED');
  });
});

// ─── TRAILING_STOP Orders ─────────────────────────────

describe('TRAILING_STOP orders', () => {
  it('updates high water mark when price moves favorably', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP',
      side: 'SELL',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingHighWater: 50000,
    });
    // Price moved up to 51000 - favorable for SELL
    const result = evaluateOrder(ctx(order, 51000));
    expect(result.shouldExecute).toBe(false);
    expect(result.shouldTrigger).toBe(false);
    expect(result.updatedTrailingHighWater).toBe(51000);
  });

  it('triggers when price falls below trailing offset from high water', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP',
      side: 'SELL',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingHighWater: 52000, // high water was $52,000
    });
    // Price dropped to $51,000 which is $1,000 below the $52,000 high water
    const result = evaluateOrder(ctx(order, 51000));
    expect(result.shouldExecute).toBe(true);
    expect(result.newStatus).toBe('FILLED');
  });

  it('uses PERCENT offset type', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP',
      side: 'SELL',
      trailingOffsetType: 'PERCENT',
      trailingOffsetValue: 5, // 5%
      trailingHighWater: 50000,
    });
    // 5% of 50000 = 2500, so trigger at 50000 - 2500 = 47500
    // Current price 47500 => should trigger
    const result = evaluateOrder(ctx(order, 47500));
    expect(result.shouldExecute).toBe(true);
  });

  it('does not trigger when price has not retraced enough', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP',
      side: 'SELL',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingHighWater: 50000,
    });
    // Price at 49,500 - only $500 below high water, needs $1,000
    const result = evaluateOrder(ctx(order, 49500));
    expect(result.shouldExecute).toBe(false);
    expect(result.shouldTrigger).toBe(false);
  });

  it('initializes high water to current price if not set', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP',
      side: 'SELL',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingHighWater: undefined,
    });
    // High water should initialize to current price
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.updatedTrailingHighWater).toBe(50000);
  });

  it('TRAILING_STOP for BUY (short covering) tracks minimum price', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP',
      side: 'BUY',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 500,
      trailingHighWater: 48000,
    });
    // Price moved down to 47000 - favorable for BUY
    const result = evaluateOrder(ctx(order, 47000));
    expect(result.updatedTrailingHighWater).toBe(47000); // lower high water
  });

  it('triggers BUY trailing stop when price rises above offset from low', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP',
      side: 'BUY',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 500,
      trailingHighWater: 47000, // lowest seen
    });
    // Price rose to 47600 = 47000 + 600, offset is 500, so trigger: 47000 + 500 = 47500
    // 47600 >= 47500 => triggered
    const result = evaluateOrder(ctx(order, 47600));
    expect(result.shouldExecute).toBe(true);
  });
});

// ─── TRAILING_STOP_LIMIT Orders ───────────────────────

describe('TRAILING_STOP_LIMIT orders', () => {
  it('triggers (creates child limit order) on retracement', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP_LIMIT',
      side: 'SELL',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingHighWater: 52000,
    });
    const result = evaluateOrder(ctx(order, 51000));
    expect(result.shouldTrigger).toBe(true);
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('TRIGGERED');
  });

  it('updates high water on favorable price movement', () => {
    const order = makeOrder({
      type: 'TRAILING_STOP_LIMIT',
      side: 'SELL',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingHighWater: 50000,
    });
    // Price moved favorably to 52000
    const result = evaluateOrder(ctx(order, 52000));
    expect(result.updatedTrailingHighWater).toBe(52000);
    expect(result.shouldTrigger).toBe(false);
  });
});

// ─── evaluateOrderBook ─────────────────────────────────

describe('evaluateOrderBook', () => {
  it('returns results for all OPEN orders', () => {
    const orders: OrderRecord[] = [
      makeOrder({ id: 'a', type: 'MARKET', side: 'BUY' }),
      makeOrder({ id: 'b', type: 'LIMIT', side: 'BUY', limitPrice: 49000 }),
    ];
    const results = evaluateOrderBook(orders, 50000);
    expect(results.size).toBe(2);
    expect(results.get('a')!.shouldExecute).toBe(true);
    expect(results.get('b')!.shouldExecute).toBe(false); // limit not hit
  });

  it('skips non-OPEN orders', () => {
    const orders: OrderRecord[] = [
      makeOrder({ id: 'a', type: 'MARKET', side: 'BUY', status: 'FILLED' }),
      makeOrder({ id: 'b', type: 'MARKET', side: 'BUY', status: 'CANCELLED' }),
      makeOrder({ id: 'c', type: 'MARKET', side: 'BUY' }),
    ];
    const results = evaluateOrderBook(orders, 50000);
    expect(results.size).toBe(1); // only 'c'
    expect(results.has('a')).toBe(false);
  });

  it('includes PARTIALLY_FILLED orders', () => {
    const orders: OrderRecord[] = [
      makeOrder({
        id: 'a',
        type: 'MARKET',
        side: 'BUY',
        status: 'PARTIALLY_FILLED',
        quantity: 2,
        filledQuantity: 1,
      }),
    ];
    const results = evaluateOrderBook(orders, 50000);
    expect(results.size).toBe(1);
    expect(results.get('a')!.shouldExecute).toBe(true);
  });

  it('handles empty order book', () => {
    const results = evaluateOrderBook([], 50000);
    expect(results.size).toBe(0);
  });
});

// ─── ICEBERG Orders ────────────────────────────────────

describe('ICEBERG orders', () => {
  it('fills visibleQuantity when limit is hit, returns PARTIALLY_FILLED', () => {
    const order = makeOrder({
      type: 'ICEBERG',
      side: 'BUY',
      limitPrice: 50000,
      visibleQuantity: 0.3,
      quantity: 1,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(0.3);
    expect(result.fill!.isFullyFilled).toBe(false);
    expect(result.newStatus).toBe('PARTIALLY_FILLED');
    expect(result.icebergFillAmount).toBe(0.3);
  });

  it('completes fully when remaining <= visibleQuantity', () => {
    const order = makeOrder({
      type: 'ICEBERG',
      side: 'BUY',
      limitPrice: 50000,
      visibleQuantity: 2,
      quantity: 1,
      filledQuantity: 0,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(1);
    expect(result.fill!.isFullyFilled).toBe(true);
    expect(result.newStatus).toBe('FILLED');
  });

  it('does not execute when limit not hit', () => {
    const order = makeOrder({
      type: 'ICEBERG',
      side: 'BUY',
      limitPrice: 49000,
      visibleQuantity: 0.3,
      quantity: 1,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('OPEN');
  });

  it('charges taker fee on visible chunk', () => {
    const order = makeOrder({
      type: 'ICEBERG',
      side: 'BUY',
      limitPrice: 50000,
      visibleQuantity: 0.5,
      quantity: 2,
    });
    const result = evaluateOrder(ctx(order, 50000));
    const expectedFee = 0.5 * 50000 * (26 / 10000); // taker fee
    expect(result.fill!.fee).toBeCloseTo(expectedFee, 4);
  });

  it('already fully filled returns FILLED', () => {
    const order = makeOrder({
      type: 'ICEBERG',
      side: 'BUY',
      limitPrice: 50000,
      visibleQuantity: 0.5,
      quantity: 1,
      filledQuantity: 1,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('FILLED');
  });
});

// ─── TWAP Orders ────────────────────────────────────────

describe('TWAP orders', () => {
  const NOW = Date.now();
  const RECENT = new Date(NOW - 100); // 100ms ago (recent enough for first slice)

  it('first slice executes immediately', () => {
    const order = makeOrder({
      type: 'TWAP',
      side: 'BUY',
      quantity: 10,
      twapSlices: 5,
      twapDurationSeconds: 300,
      twapExecutedSlices: 0,
      createdAt: RECENT,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.twapSliceExecuted).toBe(true);
    expect(result.fill!.filledQuantity).toBeCloseTo(2, 3); // 10/5 = 2 per slice
    expect(result.newStatus).toBe('PARTIALLY_FILLED');
  });

  it('returns FILLED when all slices executed', () => {
    const order = makeOrder({
      type: 'TWAP',
      side: 'BUY',
      quantity: 10,
      twapSlices: 5,
      twapDurationSeconds: 300,
      twapExecutedSlices: 5,
      createdAt: RECENT,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('FILLED');
  });

  it('fills remaining when last slice executes', () => {
    const order = makeOrder({
      type: 'TWAP',
      side: 'BUY',
      quantity: 10,
      twapSlices: 5,
      twapDurationSeconds: 300,
      twapExecutedSlices: 4,
      filledQuantity: 8,
      createdAt: new Date(NOW - 300000), // 5 min ago, enough time passed
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBeCloseTo(2, 3);
    expect(result.newStatus).toBe('FILLED');
  });

  it('returns no action when timing has not elapsed', () => {
    const justNow = new Date(); // created just now
    const order = makeOrder({
      type: 'TWAP',
      side: 'BUY',
      quantity: 10,
      twapSlices: 5,
      twapDurationSeconds: 300,
      twapExecutedSlices: 1, // first slice already done
      filledQuantity: 2,
      status: 'PARTIALLY_FILLED',
      createdAt: justNow,
    });
    const result = evaluateOrder(ctx(order, 50000));
    // Elapsed time < sliceInterval (60s), so no action
    expect(result.shouldExecute).toBe(false);
    // noAction returns current order status
    expect(result.newStatus).toBe('PARTIALLY_FILLED');
  });

  it('applies default values for missing TWAP params', () => {
    const order = makeOrder({
      type: 'TWAP',
      side: 'BUY',
      quantity: 10,
      // no twapSlices, twapDurationSeconds
      createdAt: RECENT,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBeCloseTo(1, 3); // default 10 slices
  });
});

// ─── POST_ONLY_LIMIT Orders ─────────────────────────────

describe('POST_ONLY_LIMIT orders', () => {
  it('stays OPEN when limit not yet hit (price beyond limit for BUY)', () => {
    // BUY POST_ONLY at 49000, current price 49500 => limit not hit
    // canFill: 49500 <= 49000? No → stays OPEN
    const order = makeOrder({
      type: 'POST_ONLY_LIMIT',
      side: 'BUY',
      limitPrice: 49000,
    });
    const result = evaluateOrder(ctx(order, 49500));
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('OPEN');
  });

  it('rejects when would execute immediately as taker (BUY)', () => {
    const order = makeOrder({
      type: 'POST_ONLY_LIMIT',
      side: 'BUY',
      limitPrice: 50000,
    });
    // currentPrice(50000) <= limitPrice(50000) => wouldBeTaker = true
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('REJECTED');
    expect(result.rejectReason).toBeDefined();
  });

  it('rejects when would execute immediately as taker (SELL)', () => {
    const order = makeOrder({
      type: 'POST_ONLY_LIMIT',
      side: 'SELL',
      limitPrice: 50000,
    });
    // currentPrice(50000) >= limitPrice(50000) => wouldBeTaker = true
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('REJECTED');
  });

  it('stays OPEN for SELL when price is below limit', () => {
    const order = makeOrder({
      type: 'POST_ONLY_LIMIT',
      side: 'SELL',
      limitPrice: 51000,
    });
    // currentPrice(50500) >= limitPrice(51000)? No → limit not hit, stays OPEN
    const result = evaluateOrder(ctx(order, 50500));
    expect(result.shouldExecute).toBe(false);
    expect(result.newStatus).toBe('OPEN');
  });
});

// ─── SETTLE_POSITION Orders ─────────────────────────────

describe('SETTLE_POSITION orders', () => {
  it('behaves as MARKET fill (taker)', () => {
    const order = makeOrder({ type: 'SETTLE_POSITION', side: 'SELL' });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.shouldTrigger).toBe(false);
    expect(result.newStatus).toBe('FILLED');
    expect(result.fill!.fillPrice).toBe(50000);
    expect(result.fill!.filledQuantity).toBe(1);
    expect(result.fill!.isFullyFilled).toBe(true);
  });

  it('charges taker fee', () => {
    const order = makeOrder({ type: 'SETTLE_POSITION', side: 'SELL', quantity: 1 });
    const result = evaluateOrder(ctx(order, 50000));
    const expectedFee = 50000 * (26 / 10000);
    expect(result.fill!.fee).toBeCloseTo(expectedFee, 4);
  });

  it('fills remaining quantity for partially filled orders', () => {
    const order = makeOrder({
      type: 'SETTLE_POSITION',
      side: 'SELL',
      quantity: 2,
      filledQuantity: 0.5,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.fill!.filledQuantity).toBe(1.5);
    expect(result.newStatus).toBe('FILLED');
  });
});

// ─── REDUCE_ONLY Orders ────────────────────────────────

describe('REDUCE_ONLY orders', () => {
  it('behaves as MARKET fill (taker)', () => {
    const order = makeOrder({ type: 'REDUCE_ONLY', side: 'SELL' });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.shouldExecute).toBe(true);
    expect(result.shouldTrigger).toBe(false);
    expect(result.newStatus).toBe('FILLED');
    expect(result.fill!.fillPrice).toBe(50000);
  });

  it('fills full remaining quantity', () => {
    const order = makeOrder({
      type: 'REDUCE_ONLY',
      side: 'SELL',
      quantity: 3,
      filledQuantity: 1,
    });
    const result = evaluateOrder(ctx(order, 50000));
    expect(result.fill!.filledQuantity).toBe(2);
    expect(result.newStatus).toBe('FILLED');
  });
});

// ─── Edge Cases ────────────────────────────────────────

describe('Edge cases', () => {
  it('handles zero price gracefully for MARKET orders', () => {
    const order = makeOrder({ type: 'MARKET', side: 'BUY' });
    const result = evaluateOrder(ctx(order, 0));
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.fillPrice).toBe(0);
    expect(result.fill!.fee).toBe(0);
  });

  it('handles very large quantities', () => {
    const order = makeOrder({
      type: 'MARKET',
      side: 'BUY',
      quantity: 1_000_000,
    });
    const result = evaluateOrder(ctx(order, 100000));
    expect(result.shouldExecute).toBe(true);
    expect(result.fill!.filledQuantity).toBe(1_000_000);
    // Fee = 100,000 * 1,000,000 * (26/10000) = 260,000,000
    expect(result.fill!.fee).toBe(260_000_000);
  });

  it('handles invalid order type as no action', () => {
    const order = makeOrder({
      type: 'MARKET',
      side: 'BUY',
    });
    // Cast to simulate an unrecognized type hitting the default case
    const hackedOrder = {
      ...order,
      type: 'INVALID' as unknown as OrderRecord['type'],
    };
    const result = evaluateOrder(ctx(hackedOrder, 50000));
    expect(result.shouldExecute).toBe(false);
    expect(result.shouldTrigger).toBe(false);
  });
});
