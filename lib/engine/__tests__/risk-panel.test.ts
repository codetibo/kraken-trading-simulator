import { describe, it, expect } from '@jest/globals';

describe('RiskManagementPanel Component', () => {
  it('exports RiskManagementPanel component', async () => {
    const mod = await import('@/components/trade/RiskManagementPanel');
    expect(mod.RiskManagementPanel).toBeDefined();
  });

  it('calculates risk amount correctly', async () => {
    const { calculateRiskReward } = await import('@/lib/engine/marginEngine');

    // LONG: entry=50000, stopLoss=48000, size=1 → risk = |50000-48000| * 1 = 2000
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 48000,
      takeProfitPrice: 55000,
      size: 1,
    });

    expect(result.riskAmount).toBe(2000);
    expect(result.rewardAmount).toBe(5000);
    expect(result.riskRewardRatio).toBe(2.5);
    expect(result.riskPercent).toBeCloseTo(4, 1);
    expect(result.rewardPercent).toBeCloseTo(10, 1);
  });

  it('calculates SHORT risk/reward correctly', async () => {
    const { calculateRiskReward } = await import('@/lib/engine/marginEngine');

    // SHORT: entry=50000, stopLoss=52000, takeProfit=45000, size=2
    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 52000,
      takeProfitPrice: 45000,
      size: 2,
    });

    expect(result.riskAmount).toBe(4000);  // |50000-52000| * 2
    expect(result.rewardAmount).toBe(10000); // |45000-50000| * 2
    expect(result.riskRewardRatio).toBe(2.5);
  });

  it('returns 0 risk when entry equals stopLoss', async () => {
    const { calculateRiskReward } = await import('@/lib/engine/marginEngine');

    const result = calculateRiskReward({
      entryPrice: 50000,
      stopLossPrice: 50000,
      takeProfitPrice: 55000,
      size: 1,
    });

    expect(result.riskAmount).toBe(0);
    expect(result.riskRewardRatio).toBe(0);
  });

  it('calculates position size from risk correctly', async () => {
    const { calculatePositionSizeForRisk } = await import('@/lib/engine/marginEngine');

    // accountEquity=10000, risk=1% (=$100), entry=50000, stopLoss=48000 (distance=2000)
    // size = 100 / 2000 = 0.05
    const size = calculatePositionSizeForRisk(10000, 1, 50000, 48000);

    expect(size).toBe(0.05);
  });

  it('returns 0 position size when price distance is 0', async () => {
    const { calculatePositionSizeForRisk } = await import('@/lib/engine/marginEngine');

    const size = calculatePositionSizeForRisk(10000, 1, 50000, 50000);

    expect(size).toBe(0);
  });

  it('calculates position size for different risk percentages', async () => {
    const { calculatePositionSizeForRisk } = await import('@/lib/engine/marginEngine');

    const size2pct = calculatePositionSizeForRisk(10000, 2, 50000, 48000);
    expect(size2pct).toBe(0.1); // $200 / $2000 = 0.1

    const size5pct = calculatePositionSizeForRisk(10000, 5, 50000, 48000);
    expect(size5pct).toBe(0.25); // $500 / $2000 = 0.25
  });
});
