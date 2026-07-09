import { orderInputSchema } from '../orderSchemas';

function validBase() {
  return {
    assetSymbol: 'BTC/USD',
    side: 'BUY' as const,
    marketType: 'SPOT' as const,
    quantity: 1,
  };
}

// ─── MARKET ─────────────────────────────────────────────

describe('MARKET order schema', () => {
  it('validates a basic MARKET order', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'MARKET',
    });
    expect(result.success).toBe(true);
  });

  it('validates MARGIN MARKET with positionSide and leverage', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'MARKET',
      marketType: 'MARGIN',
      positionSide: 'LONG',
      leverage: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts MARGIN MARKET with positionSide and leverage', () => {
    // positionSide and leverage are optional in the schema
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'MARKET',
      marketType: 'MARGIN',
      positionSide: 'LONG',
      leverage: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts MARGIN MARKET without positionSide (optional field)', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'MARKET',
      marketType: 'MARGIN',
      leverage: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative quantity', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'MARKET',
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });
});

// ─── LIMIT ──────────────────────────────────────────────

describe('LIMIT order schema', () => {
  it('validates a LIMIT order with limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'LIMIT',
      limitPrice: 49000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects LIMIT without limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'LIMIT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects LIMIT with zero limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'LIMIT',
      limitPrice: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ─── STOP_LOSS ─────────────────────────────────────────

describe('STOP_LOSS order schema', () => {
  it('validates with triggerPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'STOP_LOSS',
      triggerPrice: 45000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without triggerPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'STOP_LOSS',
    });
    expect(result.success).toBe(false);
  });
});

// ─── STOP_LOSS_LIMIT ───────────────────────────────────

describe('STOP_LOSS_LIMIT order schema', () => {
  it('validates with triggerPrice and limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'STOP_LOSS_LIMIT',
      triggerPrice: 45000,
      limitPrice: 44500,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'STOP_LOSS_LIMIT',
      triggerPrice: 45000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects without triggerPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'STOP_LOSS_LIMIT',
      limitPrice: 44500,
    });
    expect(result.success).toBe(false);
  });
});

// ─── TAKE_PROFIT ───────────────────────────────────────

describe('TAKE_PROFIT order schema', () => {
  it('validates with triggerPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TAKE_PROFIT',
      triggerPrice: 55000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without triggerPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TAKE_PROFIT',
    });
    expect(result.success).toBe(false);
  });
});

// ─── TAKE_PROFIT_LIMIT ─────────────────────────────────

describe('TAKE_PROFIT_LIMIT order schema', () => {
  it('validates with triggerPrice and limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TAKE_PROFIT_LIMIT',
      triggerPrice: 55000,
      limitPrice: 54800,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TAKE_PROFIT_LIMIT',
      triggerPrice: 55000,
    });
    expect(result.success).toBe(false);
  });
});

// ─── TRAILING_STOP ─────────────────────────────────────

describe('TRAILING_STOP order schema', () => {
  it('validates with FIXED offset', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TRAILING_STOP',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
    });
    expect(result.success).toBe(true);
  });

  it('validates with PERCENT offset', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TRAILING_STOP',
      trailingOffsetType: 'PERCENT',
      trailingOffsetValue: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without trailingOffsetType', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TRAILING_STOP',
      trailingOffsetValue: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects without trailingOffsetValue', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TRAILING_STOP',
      trailingOffsetType: 'FIXED',
    });
    expect(result.success).toBe(false);
  });
});

// ─── TRAILING_STOP_LIMIT ───────────────────────────────

describe('TRAILING_STOP_LIMIT order schema', () => {
  it('validates with all trailing fields', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TRAILING_STOP_LIMIT',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingLimitOffset: 200,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without trailingLimitOffset', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TRAILING_STOP_LIMIT',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
    });
    expect(result.success).toBe(false);
  });
});

// ─── ICEBERG ────────────────────────────────────────────

describe('ICEBERG order schema', () => {
  it('validates with limitPrice and visibleQuantity', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'ICEBERG',
      limitPrice: 50000,
      visibleQuantity: 0.3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without visibleQuantity', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'ICEBERG',
      limitPrice: 50000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects without limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'ICEBERG',
      visibleQuantity: 0.3,
    });
    expect(result.success).toBe(false);
  });
});

// ─── TWAP ────────────────────────────────────────────────

describe('TWAP order schema', () => {
  it('validates with duration and slices', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TWAP',
      twapDurationSeconds: 300,
      twapSlices: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects duration below 60 seconds', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TWAP',
      twapDurationSeconds: 30,
      twapSlices: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects slices less than 2', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TWAP',
      twapDurationSeconds: 300,
      twapSlices: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects slices more than 100', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TWAP',
      twapDurationSeconds: 300,
      twapSlices: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejects without twapDurationSeconds', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'TWAP',
      twapSlices: 10,
    });
    expect(result.success).toBe(false);
  });
});

// ─── OCO ──────────────────────────────────────────────────

describe('OCO order schema', () => {
  it('validates with trigger, limit, and second prices', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'OCO',
      triggerPrice: 45000,
      limitPrice: 44500,
      secondTriggerPrice: 55000,
      secondLimitPrice: 54800,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without secondTriggerPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'OCO',
      triggerPrice: 45000,
      limitPrice: 44500,
      secondLimitPrice: 54800,
    });
    expect(result.success).toBe(false);
  });

  it('rejects without secondLimitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'OCO',
      triggerPrice: 45000,
      limitPrice: 44500,
      secondTriggerPrice: 55000,
    });
    expect(result.success).toBe(false);
  });

  it('accepts timeInForce on OCO order', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'OCO',
      triggerPrice: 45000,
      limitPrice: 44500,
      secondTriggerPrice: 55000,
      secondLimitPrice: 54800,
      timeInForce: 'IOC',
    });
    expect(result.success).toBe(true);
  });

  it('accepts triggerType on OCO order', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'OCO',
      triggerPrice: 45000,
      limitPrice: 44500,
      secondTriggerPrice: 55000,
      secondLimitPrice: 54800,
      triggerType: 'MARK_PRICE',
    });
    expect(result.success).toBe(true);
  });

  it('accepts both timeInForce and triggerType on OCO order', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'OCO',
      triggerPrice: 45000,
      limitPrice: 44500,
      secondTriggerPrice: 55000,
      secondLimitPrice: 54800,
      timeInForce: 'GTC',
      triggerType: 'LAST_PRICE',
    });
    expect(result.success).toBe(true);
  });
});

// ─── SETTLE_POSITION ─────────────────────────────────────

describe('SETTLE_POSITION order schema', () => {
  it('validates with positionId', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'SETTLE_POSITION',
      positionId: 'pos-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects without positionId', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'SETTLE_POSITION',
    });
    expect(result.success).toBe(false);
  });

  it('rejects with empty positionId', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'SETTLE_POSITION',
      positionId: '',
    });
    expect(result.success).toBe(false);
  });
});

// ─── POST_ONLY_LIMIT ─────────────────────────────────────

describe('POST_ONLY_LIMIT order schema', () => {
  it('validates with limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'POST_ONLY_LIMIT',
      limitPrice: 49000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects without limitPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'POST_ONLY_LIMIT',
    });
    expect(result.success).toBe(false);
  });
});

// ─── REDUCE_ONLY ─────────────────────────────────────────

describe('REDUCE_ONLY order schema', () => {
  it('validates with positionId', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'REDUCE_ONLY',
      positionId: 'pos-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects without positionId', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'REDUCE_ONLY',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional limitPrice and triggerPrice', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'REDUCE_ONLY',
      positionId: 'pos-123',
      limitPrice: 49000,
      triggerPrice: 45000,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Common Fields ──────────────────────────────────────

describe('Common optional fields', () => {
  it('accepts timeInForce on LIMIT order', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'LIMIT',
      limitPrice: 49000,
      timeInForce: 'IOC',
    });
    expect(result.success).toBe(true);
  });

  it('accepts triggerType on STOP_LOSS order', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'STOP_LOSS',
      triggerPrice: 45000,
      triggerType: 'MARK_PRICE',
    });
    expect(result.success).toBe(true);
  });

  it('accepts postOnly flag on LIMIT', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'LIMIT',
      limitPrice: 49000,
      postOnly: true,
    });
    expect(result.success).toBe(true);
  });

  it('validates MARGIN with all common fields', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'LIMIT',
      marketType: 'MARGIN',
      positionSide: 'LONG',
      leverage: 5,
      limitPrice: 49000,
      timeInForce: 'GTC',
      triggerType: 'LAST_PRICE',
      postOnly: true,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Discriminated Union ────────────────────────────────

describe('Discriminated union', () => {
  it('rejects unknown order type', () => {
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'INVALID_TYPE',
    });
    expect(result.success).toBe(false);
  });

  it('ignores fields not relevant to the type', () => {
    // MARKET order with extra fields should still pass (extra keys are ignored)
    const result = orderInputSchema.safeParse({
      ...validBase(),
      type: 'MARKET',
      limitPrice: 49000, // irrelevant for MARKET but shouldn't cause error
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(orderInputSchema.safeParse(null).success).toBe(false);
    expect(orderInputSchema.safeParse(undefined).success).toBe(false);
    expect(orderInputSchema.safeParse('string').success).toBe(false);
  });
});
