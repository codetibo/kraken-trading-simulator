import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock Prisma generated client before any other import to prevent import.meta errors
jest.mock('@/app/generated/prisma/client', () => ({} as any), { virtual: true });
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

jest.mock('@prisma/adapter-pg', () => ({} as any), { virtual: true });

// Mock Prisma — wrap entire mock in `as any` to avoid complex Prisma type issues
jest.mock('@/lib/prisma', () => {
  const mockFindMany = jest.fn<any>();
  mockFindMany.mockResolvedValue([]);
  const tx: Record<string, any> = {
    wallet: { findUniqueOrThrow: jest.fn<any>().mockResolvedValue({ id: 'wallet-id', cashBalance: 10000 }), update: jest.fn<any>() },
    order: { update: jest.fn<any>(), create: jest.fn<any>() },
    position: { update: jest.fn<any>(), create: jest.fn<any>(), findFirst: jest.fn<any>() },
    trade: { create: jest.fn<any>() },
    transaction: { create: jest.fn<any>() },
    assetHolding: { upsert: jest.fn<any>(), update: jest.fn<any>() },
  };
  return {
    __esModule: true,
    default: {
      user: { findFirst: jest.fn<any>().mockResolvedValue({ id: 'test-user-id' }), upsert: jest.fn<any>() },
      order: { findMany: mockFindMany, findUnique: jest.fn<any>(), update: jest.fn<any>(), create: jest.fn<any>() },
      position: { findMany: jest.fn<any>().mockResolvedValue([]), findUnique: jest.fn<any>(), update: jest.fn<any>(), create: jest.fn<any>(), findFirst: jest.fn<any>() },
      trade: { findMany: mockFindMany, create: jest.fn<any>() },
      transaction: { findMany: mockFindMany, create: jest.fn<any>() },
      candle: { findMany: jest.fn<any>().mockResolvedValue([]) },
      wallet: {
        findUnique: jest.fn<any>(),
        findUniqueOrThrow: jest.fn<any>().mockResolvedValue({ id: 'test-wallet-id', userId: 'test-user-id', cashBalance: 10000, startingBalance: 10000, reservedMargin: 0, holdings: [] }),
        update: jest.fn<any>(),
      },
      assetHolding: { findUnique: jest.fn<any>().mockResolvedValue(null), upsert: jest.fn<any>(), update: jest.fn<any>() },
      asset: { findUnique: jest.fn<any>() },
      settings: { findUnique: jest.fn<any>().mockResolvedValue({ darkMode: false, language: 'en', currency: 'USD' }) },
      tutorialProgress: { findMany: jest.fn<any>().mockResolvedValue([]) },
      $transaction: jest.fn<any>().mockImplementation((cb: any) => cb ? Promise.resolve(cb(tx)) : Promise.resolve([])),
    } as any,
  } as any;
});
/* eslint-enable @typescript-eslint/no-explicit-any */

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/engine/priceFeed/PriceFeedFactory', () => ({
  getPriceFeed: jest.fn(() => ({
    getCurrentPrice: jest.fn(() => 50000),
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Worker Tick - Route Handler', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('exports GET function from worker tick route', async () => {
    const mod = await import('@/app/api/worker/tick/route');
    expect(mod.GET).toBeDefined();
  });

  it('returns valid response structure on success (no orders)', async () => {
    const mod = await import('@/app/api/worker/tick/route');
    const response = await mod.GET() as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('tickTimeMs');
    expect(body).toHaveProperty('ordersEvaluated', 0);
    expect(body).toHaveProperty('triggers');
    expect(body).toHaveProperty('fills');
    expect(body).toHaveProperty('liquidations');
    expect(body).toHaveProperty('errors');
  });
});

describe('GET /api/orders', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('exports GET function from orders route', async () => {
    const mod = await import('@/app/api/orders/route');
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
  });

  it('returns open orders with status=open', async () => {
    const mod = await import('@/app/api/orders/route');
    const { NextRequest } = await import('next/server');
    const request = new NextRequest(new URL('http://localhost/api/orders?status=open'));
    const response = await mod.GET(request) as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('orders');
    expect(body).toHaveProperty('total');
  });

  it('returns history orders with status=history', async () => {
    const mod = await import('@/app/api/orders/route');
    const { NextRequest } = await import('next/server');
    const request = new NextRequest(new URL('http://localhost/api/orders?status=history'));
    const response = await mod.GET(request) as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('orders');
    expect(body).toHaveProperty('total');
  });

  it('returns combined (open + history) with status=all', async () => {
    const mod = await import('@/app/api/orders/route');
    const { NextRequest } = await import('next/server');
    const request = new NextRequest(new URL('http://localhost/api/orders?status=all'));
    const response = await mod.GET(request) as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('openOrders');
    expect(body).toHaveProperty('historyOrders');
    expect(body).toHaveProperty('openTotal');
    expect(body).toHaveProperty('historyTotal');
  });
});

describe('GET /api/history', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('exports GET function from history route', async () => {
    const mod = await import('@/app/api/history/route');
    expect(mod.GET).toBeDefined();
  });

  it('returns trades with type=trades', async () => {
    const mod = await import('@/app/api/history/route');
    const { NextRequest } = await import('next/server');
    const request = new NextRequest(new URL('http://localhost/api/history?type=trades'));
    const response = await mod.GET(request) as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('trades');
    expect(body).toHaveProperty('total');
  });

  it('returns transactions with type=transactions', async () => {
    const mod = await import('@/app/api/history/route');
    const { NextRequest } = await import('next/server');
    const request = new NextRequest(new URL('http://localhost/api/history?type=transactions'));
    const response = await mod.GET(request) as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('transactions');
    expect(body).toHaveProperty('total');
  });

  it('returns both with type=all (default)', async () => {
    const mod = await import('@/app/api/history/route');
    const { NextRequest } = await import('next/server');
    const request = new NextRequest(new URL('http://localhost/api/history?type=all'));
    const response = await mod.GET(request) as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('trades');
    expect(body).toHaveProperty('transactions');
    expect(body).toHaveProperty('tradesTotal');
    expect(body).toHaveProperty('transactionsTotal');
  });
});

describe('WorkerTick Component', () => {
  it('exports WorkerTick component', async () => {
    const mod = await import('@/components/WorkerTick');
    expect(mod.WorkerTick).toBeDefined();
  });
});

describe('toOrderRecord utility', () => {
  it('exports toOrderRecord from orderUtils', async () => {
    const mod = await import('@/lib/engine/orderUtils');
    expect(mod.toOrderRecord).toBeDefined();
  });
});
