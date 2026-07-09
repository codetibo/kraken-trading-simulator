import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mocks ──────────────────────────────────────────────

jest.mock('@/app/generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/adapter-pg', () => ({}), { virtual: true });

const mockGetSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
    order: {
      findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    },
  },
}));

jest.mock('@/lib/engine/priceFeed/PriceFeedFactory', () => ({
  getPriceFeed: jest.fn(() => ({
    getCurrentPrice: jest.fn(() => 50000),
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { getCurrentUserId, listOpenOrders } from '@/server/actions/orders';

// ─── Tests ──────────────────────────────────────────────

describe('getCurrentUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns userId when session exists', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    const userId = await getCurrentUserId();
    expect(userId).toBe('user-123');
  });

  it('passes headers to getSession call', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    await getCurrentUserId();
    const callArgs = mockGetSession.mock.calls[0][0];
    expect(callArgs).toHaveProperty('headers');
  });

  it('throws "Not authenticated" when session is null', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(getCurrentUserId()).rejects.toThrow('Not authenticated');
  });

  it('throws "Not authenticated" when session has no user', async () => {
    mockGetSession.mockResolvedValue({});
    await expect(getCurrentUserId()).rejects.toThrow('Not authenticated');
  });

  it('throws "Not authenticated" when session user has no id', async () => {
    mockGetSession.mockResolvedValue({ user: { name: 'Test' } });
    await expect(getCurrentUserId()).rejects.toThrow('Not authenticated');
  });
});

describe('Protected server actions (auth dependency)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listOpenOrders succeeds when authenticated', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    const result = await listOpenOrders();
    expect(Array.isArray(result)).toBe(true);
  });

  it('listOpenOrders throws when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(listOpenOrders()).rejects.toThrow('Not authenticated');
  });
});
