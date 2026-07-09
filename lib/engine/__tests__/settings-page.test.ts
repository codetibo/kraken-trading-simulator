import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the Prisma client
/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFindUnique = jest.fn<any>();
const mockUpsert = jest.fn<any>();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    settings: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      upsert: (...args: any[]) => mockUpsert(...args),
    },
  },
}));

// Mock getCurrentUserId
jest.mock('@/server/actions/orders', () => ({
  getCurrentUserId: jest.fn<any>().mockResolvedValue('test-user-id'),
}));

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
/* eslint-enable @typescript-eslint/no-explicit-any */

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Settings Page - Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('returns default settings when none saved', async () => {
      mockFindUnique.mockResolvedValue(null);

      const { getSettings } = await import('@/server/actions/settings');
      const result = await getSettings();

      expect(result!.darkMode).toBe(true);
      expect(result!.language).toBe('en');
      expect(result!.displayCurrency).toBe('USD');
      expect(result!.startingBalance).toBe(10000);
    });

    it('returns saved settings when they exist', async () => {
      mockFindUnique.mockResolvedValue({
        darkMode: false,
        language: 'hu',
        displayCurrency: 'EUR',
        startingBalance: 50000,
      });

      const { getSettings } = await import('@/server/actions/settings');
      const result = await getSettings();

      expect(result!.darkMode).toBe(false);
      expect(result!.language).toBe('hu');
      expect(result!.displayCurrency).toBe('EUR');
      expect(result!.startingBalance).toBe(50000);
    });
  });

  describe('updateSettings', () => {
    it('upserts settings with partial data', async () => {
      mockUpsert.mockResolvedValue({ id: 's-1' });

      const { updateSettings } = await import('@/server/actions/settings');
      const result = await updateSettings({ language: 'de' });

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
          create: expect.objectContaining({
            userId: 'test-user-id',
            language: 'de',
          }),
          update: { language: 'de' },
        }),
      );
    });

    it('updates multiple fields at once', async () => {
      mockUpsert.mockResolvedValue({ id: 's-1' });

      const { updateSettings } = await import('@/server/actions/settings');
      const result = await updateSettings({
        darkMode: false,
        displayCurrency: 'GBP',
      });

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            darkMode: false,
            displayCurrency: 'GBP',
          },
        }),
      );
    });
  });
});
