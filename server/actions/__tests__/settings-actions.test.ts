/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/app/generated/prisma/client', () => ({}), { virtual: true });
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
  user: { findFirst: jest.fn() },
  settings: { findUnique: jest.fn(), upsert: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockSetPriceFeedMode = jest.fn();
jest.mock('@/lib/engine/priceFeed/PriceFeedFactory', () => ({
  setPriceFeedMode: (...args: any[]) => mockSetPriceFeedMode(...args),
}));

import { getSettings, updateSettings } from '@/server/actions/settings';
import type { UserSettings } from '@/server/actions/settings';

/* eslint-enable @typescript-eslint/no-explicit-any */

const USER_ID = 'test-user-id';
const SETTINGS_ID = 'settings-1';

// ─── getSettings Tests ────────────────────────────────

describe('getSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('returns default settings when no settings record exists', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue(null);
    const result = await getSettings();
    expect(result!.darkMode).toBe(true);
    expect(result!.language).toBe('en');
    expect(result!.displayCurrency).toBe('USD');
    expect(result!.startingBalance).toBe(10000);
    expect(result!.priceFeedMode).toBe('simulated');
  });

  it('returns saved settings when record exists', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      id: SETTINGS_ID,
      userId: USER_ID,
      darkMode: false,
      language: 'hu',
      displayCurrency: 'EUR',
      startingBalance: 50000,
      priceFeedMode: 'live',
      updatedAt: new Date('2026-07-06T12:00:00Z'),
    });

    const result = await getSettings();
    expect(result!.darkMode).toBe(false);
    expect(result!.language).toBe('hu');
    expect(result!.displayCurrency).toBe('EUR');
    expect(result!.startingBalance).toBe(50000);
    expect(result!.priceFeedMode).toBe('live');
  });

  it('handles Decimal startingBalance conversion', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue({
      id: SETTINGS_ID,
      userId: USER_ID,
      darkMode: true,
      language: 'en',
      displayCurrency: 'USD',
      startingBalance: '25000',
      priceFeedMode: 'simulated',
      updatedAt: new Date(),
    });

    const result = await getSettings();
    expect(result!.startingBalance).toBe(25000);
  });
});

// ─── updateSettings Tests ─────────────────────────────

describe('updateSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
    mockPrisma.settings.upsert.mockResolvedValue({
      id: SETTINGS_ID,
      userId: USER_ID,
    });
  });

  it('updates darkMode', async () => {
    const result = await updateSettings({ darkMode: false });
    expect(result.success).toBe(true);
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ darkMode: false }),
      }),
    );
  });

  it('updates language', async () => {
    await updateSettings({ language: 'fr' });
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ language: 'fr' }),
      }),
    );
  });

  it('updates displayCurrency', async () => {
    await updateSettings({ displayCurrency: 'GBP' });
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ displayCurrency: 'GBP' }),
      }),
    );
  });

  it('updates startingBalance', async () => {
    await updateSettings({ startingBalance: 25000 });
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ startingBalance: 25000 }),
      }),
    );
  });

  it('updates priceFeedMode and calls setPriceFeedMode', async () => {
    const result = await updateSettings({ priceFeedMode: 'live' });
    expect(result.success).toBe(true);
    // Should have called setPriceFeedMode with 'live'
    expect(mockSetPriceFeedMode).toHaveBeenCalledWith('live');
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ priceFeedMode: 'live' }),
      }),
    );
  });

  it('does not call setPriceFeedMode when priceFeedMode not in input', async () => {
    await updateSettings({ darkMode: true });
    expect(mockSetPriceFeedMode).not.toHaveBeenCalled();
  });

  it('updates multiple fields at once', async () => {
    const updates: Partial<UserSettings> = {
      darkMode: false,
      language: 'de',
      displayCurrency: 'EUR',
      startingBalance: 50000,
      priceFeedMode: 'simulated',
    };
    await updateSettings(updates);
    expect(mockSetPriceFeedMode).toHaveBeenCalledWith('simulated');
    expect(mockPrisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          darkMode: false,
          language: 'de',
          displayCurrency: 'EUR',
          startingBalance: 50000,
          priceFeedMode: 'simulated',
        }),
      }),
    );
  });

  it('handles empty partial update gracefully', async () => {
    const result = await updateSettings({});
    expect(result.success).toBe(true);
    expect(mockPrisma.settings.upsert).toHaveBeenCalled();
    expect(mockSetPriceFeedMode).not.toHaveBeenCalled();
  });
});
