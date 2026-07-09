import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the Prisma client
/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFindMany = jest.fn<any>();
const mockFindUnique = jest.fn<any>();
const mockCreate = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockDeleteMany = jest.fn<any>();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    tutorialProgress: {
      findMany: (...args: any[]) => mockFindMany(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
      create: (...args: any[]) => mockCreate(...args),
      update: (...args: any[]) => mockUpdate(...args),
      deleteMany: (...args: any[]) => mockDeleteMany(...args),
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

// Mock revalidatePath from next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Education Page - Tutorial Progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTutorialProgress', () => {
    it('returns all tasks with incomplete status when no progress saved', async () => {
      mockFindMany.mockResolvedValue([]);

      const { getTutorialProgress } = await import(
        '@/server/actions/tutorial'
      );
      const { TUTORIAL_TASKS } = await import(
        '@/lib/engine/tutorialTasks'
      );
      const result = await getTutorialProgress();

      expect(result).toHaveLength(TUTORIAL_TASKS.length);
      result.forEach(task => {
        expect(task.isCompleted).toBe(false);
        expect(task.taskKey).toBeDefined();
        expect(task.label).toBeDefined();
      });
    });

    it('shows completed status for saved progress', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'p-1',
          userId: 'test-user-id',
          taskKey: 'market-buy-btc',
          isCompleted: true,
          completedAt: new Date('2026-07-06T10:00:00Z'),
        },
      ]);

      const { getTutorialProgress } = await import(
        '@/server/actions/tutorial'
      );
      const result = await getTutorialProgress();

      const marketBuy = result.find(t => t.taskKey === 'market-buy-btc');
      expect(marketBuy).toBeDefined();
      expect(marketBuy!.isCompleted).toBe(true);
      expect(marketBuy!.completedAt).toBe('2026-07-06T10:00:00.000Z');

      const otherTasks = result.filter(t => t.taskKey !== 'market-buy-btc');
      otherTasks.forEach(t => expect(t.isCompleted).toBe(false));
    });
  });

  describe('completeTask', () => {
    it('creates a new progress record when none exists', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'new-p' });

      const { completeTask } = await import(
        '@/server/actions/tutorial'
      );
      const result = await completeTask('limit-buy');

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskKey: 'limit-buy',
            isCompleted: true,
          }),
        }),
      );
    });

    it('updates existing record if not yet completed', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'p-1',
        taskKey: 'market-buy-btc',
        isCompleted: false,
      });
      mockUpdate.mockResolvedValue({ id: 'p-1' });

      const { completeTask } = await import(
        '@/server/actions/tutorial'
      );
      const result = await completeTask('market-buy-btc');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: expect.objectContaining({
            isCompleted: true,
          }),
        }),
      );
    });

    it('does nothing if already completed', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'p-1',
        taskKey: 'market-buy-btc',
        isCompleted: true,
      });

      const { completeTask } = await import(
        '@/server/actions/tutorial'
      );
      const result = await completeTask('market-buy-btc');

      expect(result.success).toBe(true);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('resetTutorialProgress', () => {
    it('deletes all progress records', async () => {
      mockDeleteMany.mockResolvedValue({ count: 3 });

      const { resetTutorialProgress } = await import(
        '@/server/actions/tutorial'
      );
      const result = await resetTutorialProgress();

      expect(result.success).toBe(true);
      expect(mockDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        }),
      );
    });
  });
});
