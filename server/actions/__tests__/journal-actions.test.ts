/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mocks ──────────────────────────────────────────────

class MockDecimal {
  value: number;
  constructor(n: number) {
    this.value = n;
  }
}

// Mock the generated Prisma client (ESM module with import.meta)
jest.mock(
  '@/app/generated/prisma/client',
  () => ({
    Prisma: { Decimal: MockDecimal },
  }),
  { virtual: true },
);

// Mock better-auth (ESM module) — returns a valid session by default
const mockGetSession = jest.fn<any>().mockResolvedValue({ user: { id: 'test-user-id' } });
jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  headers: jest.fn<any>(),
}));

// Mock @prisma/adapter-pg (native module)
jest.mock('@prisma/adapter-pg', () => ({}), { virtual: true });

// Mock prisma for journal entry operations
const mockJournalEntry = {
  findMany: jest.fn<any>(),
  findUnique: jest.fn<any>(),
  create: jest.fn<any>(),
  update: jest.fn<any>(),
  delete: jest.fn<any>(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    journalEntry: mockJournalEntry,
  },
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn<any>(),
}));

import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
} from '@/lib/validation/journalSchemas';
import {
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  exportJournalCsv,
  exportJournalText,
} from '@/server/actions/journal';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Schema Validation Tests ────────────────────────────

describe('Journal Entry Schemas', () => {
  describe('createJournalEntrySchema', () => {
    it('accepts valid minimal input', () => {
      const result = createJournalEntrySchema.safeParse({ notes: 'Great trade' });
      expect(result.success).toBe(true);
      expect(result.data?.notes).toBe('Great trade');
      expect(result.data?.tags).toEqual([]);
    });

    it('accepts full input with all fields', () => {
      const result = createJournalEntrySchema.safeParse({
        tradeId: 'trade-1',
        assetSymbol: 'BTC/USD',
        notes: 'Good scalp trade',
        tags: ['scalp', 'momentum'],
        emotionalState: 'calm',
        screenshot: 'data:image/png;base64,...',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty notes', () => {
      const result = createJournalEntrySchema.safeParse({ notes: '' });
      expect(result.success).toBe(false);
    });

    it('rejects notes exceeding 5000 characters', () => {
      const result = createJournalEntrySchema.safeParse({
        notes: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 10 tags', () => {
      const result = createJournalEntrySchema.safeParse({
        notes: 'Test',
        tags: Array(11).fill('tag'),
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid emotional state', () => {
      const result = createJournalEntrySchema.safeParse({
        notes: 'Test',
        emotionalState: 'invalid_state',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid emotional states', () => {
      const validStates = [
        'calm', 'confident', 'excited', 'cautious',
        'stressed', 'frustrated', 'fearful', 'greedy', 'neutral',
      ];
      for (const state of validStates) {
        const result = createJournalEntrySchema.safeParse({
          notes: 'Test',
          emotionalState: state,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('updateJournalEntrySchema', () => {
    it('requires id', () => {
      const result = updateJournalEntrySchema.safeParse({ notes: 'Test' });
      expect(result.success).toBe(false);
    });

    it('accepts partial updates', () => {
      const result = updateJournalEntrySchema.safeParse({
        id: 'entry-1',
        notes: 'Updated notes',
      });
      expect(result.success).toBe(true);
    });

    it('allows nullable fields for clearing', () => {
      const result = updateJournalEntrySchema.safeParse({
        id: 'entry-1',
        emotionalState: null,
        screenshot: null,
      });
      expect(result.success).toBe(true);
    });
  });
});

// ─── Server Action Tests ─────────────────────────────────

describe('Journal Server Actions', () => {
  describe('createJournalEntry', () => {
    it('creates a journal entry successfully', async () => {
      const mockCreated = {
        id: 'entry-1',
        userId: 'test-user-id',
        tradeId: null,
        assetSymbol: 'BTC/USD',
        notes: 'Great trade',
        tags: ['scalp'],
        emotionalState: 'calm',
        screenshot: null,
        createdAt: new Date('2026-07-07'),
        updatedAt: new Date('2026-07-07'),
      };
      mockJournalEntry.create.mockResolvedValue(mockCreated);

      const result = await createJournalEntry({
        notes: 'Great trade',
        tags: ['scalp'],
        emotionalState: 'calm',
        assetSymbol: 'BTC/USD',
      });

      expect(result.success).toBe(true);
      expect(result.data?.notes).toBe('Great trade');
      expect(result.data?.tags).toEqual(['scalp']);
      expect(result.data?.emotionalState).toBe('calm');
    });

    it('returns error on validation failure', async () => {
      const result = await createJournalEntry({ notes: '', tags: [] });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('throws if not authenticated', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      await expect(
        createJournalEntry({ notes: 'Test', tags: [] }),
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateJournalEntry', () => {
    it('updates an entry successfully', async () => {
      mockJournalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        userId: 'test-user-id',
      });
      mockJournalEntry.update.mockResolvedValue({
        id: 'entry-1',
        userId: 'test-user-id',
        tradeId: null,
        assetSymbol: 'ETH/USD',
        notes: 'Updated notes',
        tags: ['swing'],
        emotionalState: 'confident',
        screenshot: null,
        createdAt: new Date('2026-07-07'),
        updatedAt: new Date('2026-07-07'),
      });

      const result = await updateJournalEntry({
        id: 'entry-1',
        notes: 'Updated notes',
        tags: ['swing'],
        emotionalState: 'confident',
      });

      expect(result.success).toBe(true);
      expect(result.data?.notes).toBe('Updated notes');
    });

    it('returns error if entry not found', async () => {
      mockJournalEntry.findUnique.mockResolvedValue(null);

      const result = await updateJournalEntry({
        id: 'nonexistent',
        notes: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error if not owner', async () => {
      mockJournalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        userId: 'other-user',
      });

      const result = await updateJournalEntry({
        id: 'entry-1',
        notes: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deleteJournalEntry', () => {
    it('deletes an entry successfully', async () => {
      mockJournalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        userId: 'test-user-id',
      });
      mockJournalEntry.delete.mockResolvedValue({ id: 'entry-1' });

      const result = await deleteJournalEntry('entry-1');
      expect(result.success).toBe(true);
    });

    it('returns error if not owner', async () => {
      mockJournalEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        userId: 'other-user',
      });

      const result = await deleteJournalEntry('entry-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('listJournalEntries', () => {
    it('returns empty array when no entries', async () => {
      mockJournalEntry.findMany.mockResolvedValue([]);

      const result = await listJournalEntries();
      expect(result).toEqual([]);
    });

    it('returns formatted entries', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          userId: 'test-user-id',
          tradeId: null,
          assetSymbol: 'BTC/USD',
          notes: 'Test',
          tags: ['scalp'],
          emotionalState: 'calm',
          screenshot: null,
          createdAt: new Date('2026-07-07T10:00:00Z'),
          updatedAt: new Date('2026-07-07T10:00:00Z'),
        },
      ];
      mockJournalEntry.findMany.mockResolvedValue(mockEntries);

      const result = await listJournalEntries();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entry-1');
      expect(result[0].notes).toBe('Test');
      expect(result[0].createdAt).toBe('2026-07-07T10:00:00.000Z');
    });
  });

  describe('exportJournalCsv', () => {
    it('generates valid CSV', async () => {
      mockJournalEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId: 'test-user-id',
          tradeId: null,
          assetSymbol: 'BTC/USD',
          notes: 'Good trade with "quotes"',
          tags: ['scalp'],
          emotionalState: 'calm',
          screenshot: null,
          createdAt: new Date('2026-07-07'),
          updatedAt: new Date('2026-07-07'),
        },
      ]);

      const result = await exportJournalCsv();
      expect(result.success).toBe(true);
      expect(result.data).toContain('Date,Asset,Tags,Emotional State,Notes,Screenshot');
      expect(result.data).toContain('BTC/USD');
      expect(result.data).toContain('"Good trade with ""quotes"""');
    });
  });

  describe('exportJournalText', () => {
    it('generates formatted text report', async () => {
      mockJournalEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId: 'test-user-id',
          tradeId: null,
          assetSymbol: 'BTC/USD',
          notes: 'Great scalp trade',
          tags: ['scalp'],
          emotionalState: 'calm',
          screenshot: null,
          createdAt: new Date('2026-07-07'),
          updatedAt: new Date('2026-07-07'),
        },
      ]);

      const result = await exportJournalText();
      expect(result.success).toBe(true);
      expect(result.data).toContain('TRADING JOURNAL REPORT');
      expect(result.data).toContain('BTC/USD');
      expect(result.data).toContain('Great scalp trade');
    });
  });
});
