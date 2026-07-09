/* eslint-disable @typescript-eslint/no-require-imports */
import {
  convertAdvancedToOrderParams,
  convertSimpleTriggerToPrice,
} from '../triggerConversion';

// ====================================================================
// convertSimpleTriggerToPrice
// ====================================================================

describe('convertSimpleTriggerToPrice', () => {
  // ── PRICE type ──
  it('returns the raw value for PRICE type', () => {
    expect(
      convertSimpleTriggerToPrice('PRICE', 52000, 50000, 1, 'LONG', true),
    ).toBe(52000);
  });
  // ── PRICE type ──
  it('returns the raw value for PRICE type', () => {
    expect(
      convertSimpleTriggerToPrice('PRICE', 52000, 50000, 1, 'LONG', true),
    ).toBe(52000);
  });

  // ── PERCENT TP ──
  it('computes TP PERCENT for LONG', () => {
    // 5% TP on $50,000 LONG = $52,500
    expect(
      convertSimpleTriggerToPrice('PERCENT', 5, 50000, 1, 'LONG', true),
    ).toBe(52500);
  });

  it('computes TP PERCENT for SHORT', () => {
    // 5% TP on $50,000 SHORT = $47,500
    expect(
      convertSimpleTriggerToPrice('PERCENT', 5, 50000, 1, 'SHORT', true),
    ).toBe(47500);
  });

  // ── PERCENT SL ──
  it('computes SL PERCENT for LONG', () => {
    // 2% SL on $50,000 LONG = $49,000
    expect(
      convertSimpleTriggerToPrice('PERCENT', 2, 50000, 1, 'LONG', false),
    ).toBe(49000);
  });

  it('computes SL PERCENT for SHORT', () => {
    // 2% SL on $50,000 SHORT = $51,000
    expect(
      convertSimpleTriggerToPrice('PERCENT', 2, 50000, 1, 'SHORT', false),
    ).toBe(51000);
  });

  // ── PNL_USD TP ──
  it('computes TP PNL_USD for LONG', () => {
    // $2000 profit on 1 BTC LONG = $52,000 trigger
    expect(
      convertSimpleTriggerToPrice('PNL_USD', 2000, 50000, 1, 'LONG', true),
    ).toBe(52000);
  });

  it('computes TP PNL_USD for SHORT', () => {
    // $2000 profit on 1 BTC SHORT = $48,000 trigger
    expect(
      convertSimpleTriggerToPrice('PNL_USD', 2000, 50000, 1, 'SHORT', true),
    ).toBe(48000);
  });

  it('computes TP PNL_USD with fractional quantity', () => {
    // $500 profit on 0.5 BTC LONG = $51,000 trigger
    expect(
      convertSimpleTriggerToPrice('PNL_USD', 500, 50000, 0.5, 'LONG', true),
    ).toBe(51000);
  });

  // ── PNL_USD SL ──
  it('computes SL PNL_USD for LONG', () => {
    // $1000 loss limit on 1 BTC LONG = $49,000 trigger
    expect(
      convertSimpleTriggerToPrice('PNL_USD', 1000, 50000, 1, 'LONG', false),
    ).toBe(49000);
  });

  it('computes SL PNL_USD for SHORT', () => {
    // $1000 loss limit on 1 BTC SHORT = $51,000 trigger
    expect(
      convertSimpleTriggerToPrice('PNL_USD', 1000, 50000, 1, 'SHORT', false),
    ).toBe(51000);
  });

  // ── Edge cases ──
  it('returns 0 when triggerValue is 0', () => {
    expect(
      convertSimpleTriggerToPrice('PERCENT', 0, 50000, 1, 'LONG', true),
    ).toBe(0);
  });

  it('returns 0 when entryPrice is 0', () => {
    expect(convertSimpleTriggerToPrice('PERCENT', 5, 0, 1, 'LONG', true)).toBe(
      0,
    );
  });

  it('returns 0 for PNL_USD when quantity is 0', () => {
    expect(
      convertSimpleTriggerToPrice('PNL_USD', 1000, 50000, 0, 'LONG', true),
    ).toBe(0);
  });
});

describe('simpleTriggerTypeLabel', () => {
  it('returns "% Change" for PERCENT', () => {
    const { simpleTriggerTypeLabel } = require('../triggerConversion');
    expect(simpleTriggerTypeLabel('PERCENT')).toBe('% Change');
  });

  it('returns "P&L USD" for PNL_USD', () => {
    const { simpleTriggerTypeLabel } = require('../triggerConversion');
    expect(simpleTriggerTypeLabel('PNL_USD')).toBe('P&L USD');
  });

  it('returns "Exchange Rate" for PRICE', () => {
    const { simpleTriggerTypeLabel } = require('../triggerConversion');
    expect(simpleTriggerTypeLabel('PRICE')).toBe('Exchange Rate');
  });
});

// ====================================================================
// convertAdvancedToOrderParams
// ====================================================================

const ENTRY = 50000;
const QTY = 1;
const LONG = 'LONG';
const SHORT = 'SHORT';

// ──────────────────────────────────────────────────────────
// Field 1 = PROFIT_TAKING + Field 2 = DISTANCE
// ──────────────────────────────────────────────────────────

describe('Advanced: PROFIT_TAKING + DISTANCE', () => {
  it('LONG: computes TAKE_PROFIT trigger with fixed distance', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '2000',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toEqual({ type: 'TAKE_PROFIT', triggerPrice: 52000 });
  });

  it('SHORT: computes TAKE_PROFIT trigger with fixed distance', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '2000',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    expect(result.tp).toEqual({ type: 'TAKE_PROFIT', triggerPrice: 48000 });
  });

  it('LONG: computes TAKE_PROFIT trigger with percentage distance (5%)', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '5%',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toEqual({ type: 'TAKE_PROFIT', triggerPrice: 52500 });
  });

  it('SHORT: computes TAKE_PROFIT trigger with percentage distance (5%)', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '5%',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    expect(result.tp).toEqual({ type: 'TAKE_PROFIT', triggerPrice: 47500 });
  });
});

// ──────────────────────────────────────────────────────────
// Field 1 = PROFIT_TAKING + Field 2 = PNL
// ──────────────────────────────────────────────────────────

describe('Advanced: PROFIT_TAKING + PNL', () => {
  it('LONG: computes TAKE_PROFIT trigger from P&L', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'PNL',
      '3000',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toEqual({ type: 'TAKE_PROFIT', triggerPrice: 53000 });
  });

  it('SHORT: computes TAKE_PROFIT trigger from P&L', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'PNL',
      '3000',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    expect(result.tp).toEqual({ type: 'TAKE_PROFIT', triggerPrice: 47000 });
  });

  it('uses fractional quantity for P&L calculation', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'PNL',
      '1500',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      0.5,
      LONG,
    );
    // $1500 / 0.5 = $3000 price offset → $53,000 trigger
    expect(result.tp).toEqual({ type: 'TAKE_PROFIT', triggerPrice: 53000 });
  });
});

// ──────────────────────────────────────────────────────────
// Field 1 = PROFIT_TAKING_LIMIT + Field 2 = DISTANCE
// ──────────────────────────────────────────────────────────

describe('Advanced: PROFIT_TAKING_LIMIT + DISTANCE', () => {
  it('LONG: uses default 10% limit buffer when field3Extra is 0', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING_LIMIT',
      'DISTANCE',
      '2000',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    // trigger = $52,000, default buffer = 2000 * 0.1 = 200 → limit = $51,800
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT_LIMIT',
      triggerPrice: 52000,
      limitPrice: 51800,
    });
  });

  it('SHORT: uses default 10% limit buffer when field3Extra is 0', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING_LIMIT',
      'DISTANCE',
      '2000',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    // trigger = $48,000, default buffer = 200 → limit = $48,200
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT_LIMIT',
      triggerPrice: 48000,
      limitPrice: 48200,
    });
  });

  it('LONG: uses custom field3Extra as limit buffer', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING_LIMIT',
      'DISTANCE',
      '2000',
      'TRAILING_STOP',
      '0',
      '500',
      ENTRY,
      QTY,
      LONG,
    );
    // trigger = $52,000, custom buffer = 500 → limit = $51,500
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT_LIMIT',
      triggerPrice: 52000,
      limitPrice: 51500,
    });
  });
});

// ──────────────────────────────────────────────────────────
// Field 1 = PROFIT_TAKING_LIMIT + Field 2 = PNL
// ──────────────────────────────────────────────────────────

describe('Advanced: PROFIT_TAKING_LIMIT + PNL', () => {
  it('LONG: computes TAKE_PROFIT_LIMIT with default 10% buffer', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING_LIMIT',
      'PNL',
      '3000',
      'TRAILING_STOP',
      '0',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    // trigger = $53,000, default buffer = $300 → limit = $52,700
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT_LIMIT',
      triggerPrice: 53000,
      limitPrice: 52700,
    });
  });
});

// ──────────────────────────────────────────────────────────
// Field 1 = LIMIT (no conditional TP)
// ──────────────────────────────────────────────────────────

describe('Advanced: Field 1 = LIMIT', () => {
  it('returns tp: null when field1 is LIMIT', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_DISTANCE',
      '1000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────
// Field 3: STOP_LOSS_DISTANCE
// ──────────────────────────────────────────────────────────

describe('Advanced: STOP_LOSS_DISTANCE', () => {
  it('LONG: computes SL trigger with fixed distance', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_DISTANCE',
      '2000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toEqual({ type: 'STOP_LOSS', triggerPrice: 48000 });
  });

  it('SHORT: computes SL trigger with fixed distance', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_DISTANCE',
      '2000',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    expect(result.sl).toEqual({ type: 'STOP_LOSS', triggerPrice: 52000 });
  });

  it('LONG: computes SL trigger with percentage distance (2%)', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_DISTANCE',
      '2%',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toEqual({ type: 'STOP_LOSS', triggerPrice: 49000 });
  });

  it('SHORT: computes SL trigger with percentage distance (2%)', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_DISTANCE',
      '2%',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    expect(result.sl).toEqual({ type: 'STOP_LOSS', triggerPrice: 51000 });
  });
});

// ──────────────────────────────────────────────────────────
// Field 3: STOP_LOSS_PNL
// ──────────────────────────────────────────────────────────

describe('Advanced: STOP_LOSS_PNL', () => {
  it('LONG: computes SL trigger from P&L', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_PNL',
      '1000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toEqual({ type: 'STOP_LOSS', triggerPrice: 49000 });
  });

  it('SHORT: computes SL trigger from P&L', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_PNL',
      '1000',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    expect(result.sl).toEqual({ type: 'STOP_LOSS', triggerPrice: 51000 });
  });

  it('returns no SL when quantity is 0', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_PNL',
      '1000',
      '',
      ENTRY,
      0,
      LONG,
    );
    expect(result.sl).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────
// Field 3: STOP_LOSS_LIMIT_DISTANCE
// ──────────────────────────────────────────────────────────

describe('Advanced: STOP_LOSS_LIMIT_DISTANCE', () => {
  it('LONG: uses default 10% buffer', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_LIMIT_DISTANCE',
      '2000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    // trigger = $48,000, buffer = $200 → limit = $48,200
    expect(result.sl).toMatchObject({
      type: 'STOP_LOSS_LIMIT',
      triggerPrice: 48000,
      limitPrice: 48200,
    });
  });

  it('SHORT: uses custom field3Extra buffer', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_LIMIT_DISTANCE',
      '2000',
      '500',
      ENTRY,
      QTY,
      SHORT,
    );
    // trigger = $52,000, buffer = $500 → limit = $51,500
    expect(result.sl).toMatchObject({
      type: 'STOP_LOSS_LIMIT',
      triggerPrice: 52000,
      limitPrice: 51500,
    });
  });
});

// ──────────────────────────────────────────────────────────
// Field 3: STOP_LOSS_LIMIT_PNL
// ──────────────────────────────────────────────────────────

describe('Advanced: STOP_LOSS_LIMIT_PNL', () => {
  it('LONG: computes STOP_LOSS_LIMIT with default buffer', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_LIMIT_PNL',
      '1000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    // trigger = $49,000, buffer = $100 → limit = $49,100
    expect(result.sl).toMatchObject({
      type: 'STOP_LOSS_LIMIT',
      triggerPrice: 49000,
      limitPrice: 49100,
    });
  });

  it('SHORT: computes STOP_LOSS_LIMIT with default buffer', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_LIMIT_PNL',
      '1000',
      '',
      ENTRY,
      QTY,
      SHORT,
    );
    // SHORT SL: trigger = $51,000, buffer = $100 → limit = $50,900
    expect(result.sl).toMatchObject({
      type: 'STOP_LOSS_LIMIT',
      triggerPrice: 51000,
      limitPrice: 50900,
    });
  });
});

// ──────────────────────────────────────────────────────────
// Field 3: TRAILING_STOP
// ──────────────────────────────────────────────────────────

describe('Advanced: TRAILING_STOP', () => {
  it('detects PERCENT from % suffix', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'TRAILING_STOP',
      '2%',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toMatchObject({
      type: 'TRAILING_STOP',
      trailingOffsetType: 'PERCENT',
      trailingOffsetValue: 2,
    });
  });

  it('detects FIXED when no % suffix', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'TRAILING_STOP',
      '1000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toMatchObject({
      type: 'TRAILING_STOP',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
    });
  });
});

// ──────────────────────────────────────────────────────────
// Field 3: TRAILING_STOP_LIMIT
// ──────────────────────────────────────────────────────────

describe('Advanced: TRAILING_STOP_LIMIT', () => {
  it('uses default 10% trailingLimitOffset when field3Extra is 0', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'TRAILING_STOP_LIMIT',
      '1000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toMatchObject({
      type: 'TRAILING_STOP_LIMIT',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingLimitOffset: 100, // 10% of 1000
    });
  });

  it('uses custom field3Extra as trailingLimitOffset', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'TRAILING_STOP_LIMIT',
      '1000',
      '250',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toMatchObject({
      type: 'TRAILING_STOP_LIMIT',
      trailingOffsetType: 'FIXED',
      trailingOffsetValue: 1000,
      trailingLimitOffset: 250,
    });
  });

  it('detects PERCENT offset type', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'TRAILING_STOP_LIMIT',
      '3%',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.sl).toMatchObject({
      type: 'TRAILING_STOP_LIMIT',
      trailingOffsetType: 'PERCENT',
      trailingOffsetValue: 3,
    });
  });
});

// ──────────────────────────────────────────────────────────
// Combined TP + SL
// ──────────────────────────────────────────────────────────

describe('Advanced: combined TP + SL', () => {
  it('returns both tp and sl when both are set', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '2000',
      'STOP_LOSS_DISTANCE',
      '1500',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT',
      triggerPrice: 52000,
    });
    expect(result.sl).toMatchObject({ type: 'STOP_LOSS', triggerPrice: 48500 });
  });

  it('returns only sl when field1 is LIMIT', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_DISTANCE',
      '1000',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toBeNull();
    expect(result.sl).toMatchObject({ type: 'STOP_LOSS', triggerPrice: 49000 });
  });

  it('returns only tp when field3 value is 0', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '2000',
      'STOP_LOSS_DISTANCE',
      '0',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT',
      triggerPrice: 52000,
    });
    expect(result.sl).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────────────────

describe('Advanced: edge cases', () => {
  it('returns empty result when field2Value and field3Value are empty', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '',
      'STOP_LOSS_DISTANCE',
      '',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toBeUndefined();
    expect(result.sl).toBeUndefined();
  });

  it('returns no tp when entry price is 0', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '2000',
      'STOP_LOSS_DISTANCE',
      '1000',
      '',
      0,
      QTY,
      LONG,
    );
    expect(result.tp).toBeUndefined();
    expect(result.sl).toBeUndefined();
  });

  it('returns no sl for STOP_LOSS_PNL when quantity is 0', () => {
    const result = convertAdvancedToOrderParams(
      'LIMIT',
      'DISTANCE',
      '0',
      'STOP_LOSS_PNL',
      '1000',
      '',
      ENTRY,
      0,
      LONG,
    );
    expect(result.sl).toBeUndefined();
  });

  it('handles very large distance values', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '99999',
      'STOP_LOSS_DISTANCE',
      '99999',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT',
      triggerPrice: 149999,
    });
    expect(result.sl).toMatchObject({
      type: 'STOP_LOSS',
      triggerPrice: -49999,
    });
  });

  it('handles fractional distance', () => {
    const result = convertAdvancedToOrderParams(
      'PROFIT_TAKING',
      'DISTANCE',
      '0.5',
      'STOP_LOSS_DISTANCE',
      '0.3',
      '',
      ENTRY,
      QTY,
      LONG,
    );
    expect(result.tp).toMatchObject({
      type: 'TAKE_PROFIT',
      triggerPrice: 50000.5,
    });
    expect(result.sl).toMatchObject({
      type: 'STOP_LOSS',
      triggerPrice: 49999.7,
    });
  });
});
