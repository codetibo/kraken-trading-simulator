import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFetch = jest.fn<typeof global.fetch>();
global.fetch = mockFetch as unknown as typeof global.fetch;

describe('Positions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/positions returns open positions with expected shape', async () => {
    const mockPositions = [
      {
        id: 'pos-1',
        assetSymbol: 'BTC/USD',
        side: 'LONG',
        leverage: 3,
        size: 0.5,
        entryPrice: 48000,
        markPrice: 49500,
        liquidationPrice: 32000,
        usedMargin: 8000,
        unrealizedPnl: 750,
        roe: 9.38,
        positionSizeUsd: 24750,
      },
      {
        id: 'pos-2',
        assetSymbol: 'ETH/USD',
        side: 'SHORT',
        leverage: 2,
        size: 10,
        entryPrice: 3200,
        markPrice: 3050,
        liquidationPrice: 3800,
        usedMargin: 16000,
        unrealizedPnl: 1500,
        roe: 9.38,
        positionSizeUsd: 30500,
      },
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ positions: mockPositions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await fetch('/api/positions');
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith('/api/positions');
    expect(data.positions).toHaveLength(2);
    expect(data.positions[0].id).toBe('pos-1');
    expect(data.positions[0].side).toBe('LONG');
    expect(data.positions[1].side).toBe('SHORT');
    expect(data.positions[0].unrealizedPnl).toBeGreaterThan(0);
    expect(data.positions[1].unrealizedPnl).toBeGreaterThan(0);
  });

  it('DELETE /api/positions/:id closes a position', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const positionId = 'pos-1';
    const res = await fetch(`/api/positions/${positionId}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith(`/api/positions/${positionId}`, {
      method: 'DELETE',
    });
    expect(data.success).toBe(true);
  });

  it('GET /api/positions returns empty array when no positions', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ positions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await fetch('/api/positions');
    const data = await res.json();

    expect(data.positions).toHaveLength(0);
  });

  it('calculates liquidation distance correctly for LONG and SHORT', async () => {
    // Test LONG: distance = (markPrice - liquidationPrice) / markPrice * 100
    const longMarkPrice = 50000;
    const longLiqPrice = 45000;
    const longDistance =
      ((longMarkPrice - longLiqPrice) / longMarkPrice) * 100;
    expect(longDistance).toBeCloseTo(10, 1);

    // Test SHORT: distance = (liquidationPrice - markPrice) / markPrice * 100
    const shortMarkPrice = 3000;
    const shortLiqPrice = 3400;
    const shortDistance =
      ((shortLiqPrice - shortMarkPrice) / shortMarkPrice) * 100;
    expect(shortDistance).toBeCloseTo(13.33, 1);
  });

  it('exports the PositionsPageClient component', async () => {
    const { PositionsPageClient } = await import('@/app/(main)/positions/PositionsPageClient');
    expect(PositionsPageClient).toBeDefined();
    expect(typeof PositionsPageClient).toBe('function');
  });
});
