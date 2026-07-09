import {
  calculateRequiredMargin,
  calculateLiquidationPrice,
  calculateMargin,
  calculateUnrealizedPnl,
  calculateRoe,
  summarizeWalletMargin,
  getMarginWarningState,
  MARGIN_CALL_LEVEL,
  LIQUIDATION_LEVEL,
  isPositionLiquidated,
  calculateRiskReward,
  calculatePositionSizeForRisk,
} from '../marginEngine';

// ─── calculateRequiredMargin ───────────────────────────

describe('calculateRequiredMargin', () => {
  it('calculates margin for a simple LONG position', () => {
    // 1 BTC at $50,000 with 2x leverage => $25,000 margin
    expect(calculateRequiredMargin(1, 50000, 2)).toBe(25000);
  });

  it('calculates margin for high leverage', () => {
    // 1 BTC at $50,000 with 5x leverage => $10,000 margin
    expect(calculateRequiredMargin(1, 50000, 5)).toBe(10000);
  });

  it('handles fractional quantities', () => {
    // 0.5 BTC at $40,000 with 2x leverage => $10,000
    expect(calculateRequiredMargin(0.5, 40000, 2)).toBe(10000);
  });

  it('handles small positions', () => {
    // 0.01 BTC at $60,000 with 3x leverage => $200
    expect(calculateRequiredMargin(0.01, 60000, 3)).toBe(200);
  });

  it('returns 0 for zero quantity', () => {
    expect(calculateRequiredMargin(0, 50000, 2)).toBe(0);
  });
});

// ─── calculateLiquidationPrice ─────────────────────────

describe('calculateLiquidationPrice', () => {
  const defaultInput = {
    side: 'LONG' as const,
    size: 1,
    entryPrice: 50000,
    leverage: 2,
  };

  it('calculates LONG liquidation price below entry', () => {
    // LONG 2x: liq = 50000 * (1 - 0.5 + 0.005 + 0.001) = 50000 * 0.506 = 25,300
    const liq = calculateLiquidationPrice(defaultInput);
    expect(liq).toBeLessThan(defaultInput.entryPrice);
    expect(liq).toBeCloseTo(25300, 0);
  });

  it('calculates SHORT liquidation price above entry', () => {
    // SHORT 2x: liq = 50000 * (1 + 0.5 - 0.005 - 0.001) = 50000 * 1.494 = 74,700
    const liq = calculateLiquidationPrice({
      ...defaultInput,
      side: 'SHORT',
    });
    expect(liq).toBeGreaterThan(defaultInput.entryPrice);
    expect(liq).toBeCloseTo(74700, 0);
  });

  it('liquidation price moves closer to entry with higher leverage', () => {
    const liq2x = calculateLiquidationPrice({ ...defaultInput, leverage: 2 });
    const liq5x = calculateLiquidationPrice({ ...defaultInput, leverage: 5 });
    // 5x should be closer to entry price than 2x
    const dist2x = Math.abs(liq2x - defaultInput.entryPrice);
    const dist5x = Math.abs(liq5x - defaultInput.entryPrice);
    expect(dist5x).toBeLessThan(dist2x);
  });

  it('uses custom maintenance margin rate when provided', () => {
    const customMMR = 0.01; // 1%
    const liqDefault = calculateLiquidationPrice(defaultInput);
    const liqCustom = calculateLiquidationPrice({
      ...defaultInput,
      maintenanceMarginRate: customMMR,
    });
    // Higher MMR brings liquidation closer to entry (stops out sooner)
    // LONG: liq = entry * (1 - 1/lev + mmr + lfr) — higher mmr => higher liq => closer to entry
    expect(Math.abs(liqCustom - defaultInput.entryPrice)).toBeLessThan(
      Math.abs(liqDefault - defaultInput.entryPrice),
    );
    expect(liqCustom).toBeGreaterThan(liqDefault); // liquidation price is higher
  });

  it('liquidation price is positive for reasonable parameters', () => {
    const liq = calculateLiquidationPrice(defaultInput);
    expect(liq).toBeGreaterThan(0);
  });
});

// ─── calculateMargin (combined) ─────────────────────────

describe('calculateMargin', () => {
  it('returns all three values correctly', () => {
    const result = calculateMargin({
      side: 'LONG',
      size: 2,
      entryPrice: 30000,
      leverage: 3,
    });
    expect(result.positionSizeUsd).toBe(60000);       // 2 * 30000
    expect(result.requiredMargin).toBe(20000);          // 60000 / 3
    expect(result.liquidationPrice).toBeGreaterThan(0);
    expect(result.liquidationPrice).toBeLessThan(30000); // LONG below entry
  });
});

// ─── calculateUnrealizedPnl ────────────────────────────

describe('calculateUnrealizedPnl', () => {
  it('LONG: positive PnL when mark price > entry price', () => {
    const pnl = calculateUnrealizedPnl('LONG', 1, 50000, 55000);
    expect(pnl).toBe(5000);
  });

  it('LONG: negative PnL when mark price < entry price', () => {
    const pnl = calculateUnrealizedPnl('LONG', 1, 50000, 45000);
    expect(pnl).toBe(-5000);
  });

  it('SHORT: positive PnL when mark price < entry price', () => {
    const pnl = calculateUnrealizedPnl('SHORT', 1, 50000, 45000);
    expect(pnl).toBe(5000);
  });

  it('SHORT: negative PnL when mark price > entry price', () => {
    const pnl = calculateUnrealizedPnl('SHORT', 1, 50000, 55000);
    expect(pnl).toBe(-5000);
  });

  it('PnL is 0 when mark price equals entry price', () => {
    expect(calculateUnrealizedPnl('LONG', 1, 50000, 50000)).toBe(0);
    expect(calculateUnrealizedPnl('SHORT', 1, 50000, 50000)).toBe(0);
  });

  it('scales linearly with size', () => {
    const pnl1 = calculateUnrealizedPnl('LONG', 1, 50000, 55000);
    const pnl2 = calculateUnrealizedPnl('LONG', 2, 50000, 55000);
    expect(pnl2).toBe(pnl1 * 2);
  });

  it('handles fractional sizes', () => {
    const pnl = calculateUnrealizedPnl('LONG', 0.5, 50000, 51000);
    expect(pnl).toBe(500); // 0.5 * 1000
  });
});

// ─── calculateRoe ──────────────────────────────────────

describe('calculateRoe', () => {
  it('calculates positive ROE', () => {
    // $1000 PnL on $10000 margin = 10%
    expect(calculateRoe(1000, 10000)).toBeCloseTo(10, 1);
  });

  it('calculates negative ROE', () => {
    expect(calculateRoe(-500, 10000)).toBeCloseTo(-5, 1);
  });

  it('returns 0 for zero used margin', () => {
    expect(calculateRoe(1000, 0)).toBe(0);
  });

  it('ROE is amplified by leverage', () => {
    // Without leverage, 5% move = 5% return
    // With 2x leverage, 5% move = 10% return on margin
    const roe = calculateRoe(1000, 5000); // 20% ROE
    expect(roe).toBe(20);
  });
});

// ─── summarizeWalletMargin ─────────────────────────────

describe('summarizeWalletMargin', () => {
  it('no positions: infinite margin level, equity = cash', () => {
    const result = summarizeWalletMargin(10000, []);
    expect(result.totalEquity).toBe(10000);
    expect(result.usedMargin).toBe(0);
    expect(result.freeMargin).toBe(10000);
    expect(result.marginLevel).toBe(Infinity);
  });

  it('one profitable position', () => {
    const result = summarizeWalletMargin(5000, [
      { usedMargin: 2000, unrealizedPnl: 1000 },
    ]);
    expect(result.totalEquity).toBe(6000); // 5000 + 1000
    expect(result.usedMargin).toBe(2000);
    expect(result.freeMargin).toBe(4000);
    expect(result.marginLevel).toBe(300); // (6000 / 2000) * 100
  });

  it('multiple positions', () => {
    const result = summarizeWalletMargin(10000, [
      { usedMargin: 2000, unrealizedPnl: 500 },
      { usedMargin: 3000, unrealizedPnl: -1000 },
    ]);
    expect(result.totalEquity).toBe(9500); // 10000 + 500 - 1000
    expect(result.usedMargin).toBe(5000);  // 2000 + 3000
    expect(result.freeMargin).toBe(4500);  // 9500 - 5000
    expect(result.marginLevel).toBe(190);  // (9500 / 5000) * 100
  });

  it('margin level is computed correctly when near liquidation', () => {
    // If equity is only slightly above used margin
    const result = summarizeWalletMargin(100, [
      { usedMargin: 1000, unrealizedPnl: -50 },
    ]);
    expect(result.totalEquity).toBe(50);    // 100 - 50 = 50
    expect(result.usedMargin).toBe(1000);
    expect(result.marginLevel).toBe(5);     // (50 / 1000) * 100 = 5%
  });
});

// ─── getMarginWarningState ─────────────────────────────

describe('getMarginWarningState', () => {
  it('returns SAFE for margin level above MARGIN_CALL_LEVEL', () => {
    expect(getMarginWarningState(MARGIN_CALL_LEVEL + 1)).toBe('SAFE');
    expect(getMarginWarningState(300)).toBe('SAFE');
    expect(getMarginWarningState(Infinity)).toBe('SAFE');
  });

  it('returns MARGIN_CALL for margin level between LIQUIDATION and MARGIN_CALL', () => {
    expect(getMarginWarningState(LIQUIDATION_LEVEL + 1)).toBe('MARGIN_CALL');
    expect(getMarginWarningState(MARGIN_CALL_LEVEL)).toBe('MARGIN_CALL');
    expect(getMarginWarningState(125)).toBe('MARGIN_CALL');
  });

  it('returns LIQUIDATION for margin level at or below LIQUIDATION_LEVEL', () => {
    expect(getMarginWarningState(LIQUIDATION_LEVEL)).toBe('LIQUIDATION');
    expect(getMarginWarningState(LIQUIDATION_LEVEL - 1)).toBe('LIQUIDATION');
    expect(getMarginWarningState(0)).toBe('LIQUIDATION');
    expect(getMarginWarningState(-50)).toBe('LIQUIDATION');
  });
});

// ─── isPositionLiquidated ──────────────────────────────

describe('isPositionLiquidated', () => {
  it('LONG: liquidated when mark price <= liquidation price', () => {
    expect(isPositionLiquidated('LONG', 100, 100)).toBe(true);   // equal
    expect(isPositionLiquidated('LONG', 99, 100)).toBe(true);    // below
    expect(isPositionLiquidated('LONG', 101, 100)).toBe(false);  // above (safe)
  });

  it('SHORT: liquidated when mark price >= liquidation price', () => {
    expect(isPositionLiquidated('SHORT', 100, 100)).toBe(true);   // equal
    expect(isPositionLiquidated('SHORT', 101, 100)).toBe(true);   // above
    expect(isPositionLiquidated('SHORT', 99, 100)).toBe(false);   // below (safe)
  });
});

// ─── calculateRiskReward ───────────────────────────────

describe('calculateRiskReward', () => {
  it('calculates basic LONG risk/reward', () => {
    // Entry: 50000, Stop: 48000, TP: 55000, Size: 1
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 48000,
      takeProfitPrice: 55000,
      size: 1,
    });
    expect(result.riskAmount).toBe(2000);       // |50000 - 48000| * 1
    expect(result.rewardAmount).toBe(5000);      // |55000 - 50000| * 1
    expect(result.riskRewardRatio).toBe(2.5);     // 5000 / 2000 = 2.5
    expect(result.riskPercent).toBeCloseTo(4, 1);     // 2000 / 50000 * 100
    expect(result.rewardPercent).toBeCloseTo(10, 1);   // 5000 / 50000 * 100
  });

  it('calculates 1:1 risk/reward ratio', () => {
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 49000,
      takeProfitPrice: 51000,
      size: 1,
    });
    expect(result.riskRewardRatio).toBeCloseTo(1, 2);
  });

  it('returns 0 ratio when risk amount is 0', () => {
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 50000, // no risk
      takeProfitPrice: 55000,
      size: 1,
    });
    expect(result.riskRewardRatio).toBe(0);
  });

  it('handles fractional sizes', () => {
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 48000,
      takeProfitPrice: 55000,
      size: 0.5,
    });
    expect(result.riskAmount).toBe(1000);  // 2000 * 0.5
    expect(result.rewardAmount).toBe(2500); // 5000 * 0.5
  });

  it('works correctly for SHORT positions (entry above SL/TP)', () => {
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 52000, // SL above entry for short
      takeProfitPrice: 45000, // TP below entry for short
      size: 1,
    });
    expect(result.riskAmount).toBe(2000);
    expect(result.rewardAmount).toBe(5000);
    expect(result.riskRewardRatio).toBe(2.5);
  });
});

// ─── calculatePositionSizeForRisk ──────────────────────

describe('calculatePositionSizeForRisk', () => {
  it('calculates position size for given risk budget', () => {
    // $10,000 account, risking 1% ($100), entry 50000, SL 49000
    // priceDistance = 1000, so size = 100 / 1000 = 0.1
    const size = calculatePositionSizeForRisk(10000, 1, 50000, 49000);
    expect(size).toBeCloseTo(0.1, 4);
  });

  it('returns 0 when stop distance is 0', () => {
    const size = calculatePositionSizeForRisk(10000, 1, 50000, 50000);
    expect(size).toBe(0);
  });

  it('larger risk allowance gives larger position', () => {
    const size1 = calculatePositionSizeForRisk(10000, 1, 50000, 49000);
    const size2 = calculatePositionSizeForRisk(10000, 2, 50000, 49000);
    expect(size2).toBeCloseTo(size1 * 2, 4);
  });

  it('larger account gives larger position', () => {
    const size1 = calculatePositionSizeForRisk(10000, 1, 50000, 49000);
    const size2 = calculatePositionSizeForRisk(20000, 1, 50000, 49000);
    expect(size2).toBeCloseTo(size1 * 2, 4);
  });

  it('smaller stop distance gives larger position', () => {
    const size1 = calculatePositionSizeForRisk(10000, 1, 50000, 49500); // $500 distance
    const size2 = calculatePositionSizeForRisk(10000, 1, 50000, 49000); // $1000 distance
    expect(size1).toBeCloseTo(size2 * 2, 4);
  });
});
