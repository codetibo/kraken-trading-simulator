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
  tutorialProgress: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { getTutorialProgress, completeTask, resetTutorialProgress } from '@/server/actions/tutorial';

/* eslint-enable @typescript-eslint/no-explicit-any */

const USER_ID = 'test-user-id';

// ─── getTutorialProgress Tests ────────────────────────

describe('getTutorialProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('returns all tutorial tasks with isCompleted=false when no progress saved', async () => {
    mockPrisma.tutorialProgress.findMany.mockResolvedValue([]);
    const result = await getTutorialProgress();
    expect(result.length).toBeGreaterThanOrEqual(6); // At least 6 tasks
    result.forEach(task => {
      expect(task).toHaveProperty('taskKey');
      expect(task).toHaveProperty('label');
      expect(task).toHaveProperty('description');
      expect(task.isCompleted).toBe(false);
      expect(task.completedAt).toBeNull();
    });
  });

  it('marks tasks as completed when progress records exist', async () => {
    mockPrisma.tutorialProgress.findMany.mockResolvedValue([
      {
        id: 'p1',
        userId: USER_ID,
        taskKey: 'market-buy-btc',
        isCompleted: true,
        completedAt: new Date('2026-07-06T12:00:00Z'),
      },
    ]);

    const result = await getTutorialProgress();
    const marketBuyTask = result.find(t => t.taskKey === 'market-buy-btc');
    expect(marketBuyTask?.isCompleted).toBe(true);
    expect(marketBuyTask?.completedAt).toBe('2026-07-06T12:00:00.000Z');

    // Other tasks should still be incomplete
    const otherTasks = result.filter(t => t.taskKey !== 'market-buy-btc');
    otherTasks.forEach(task => {
      expect(task.isCompleted).toBe(false);
    });
  });

  it('returns all expected tutorial task keys', async () => {
    mockPrisma.tutorialProgress.findMany.mockResolvedValue([]);
    const result = await getTutorialProgress();
    const taskKeys = result.map(t => t.taskKey);
    expect(taskKeys).toContain('market-buy-btc');
    expect(taskKeys).toContain('limit-buy');
    expect(taskKeys).toContain('stop-loss');
    expect(taskKeys).toContain('take-profit');
    expect(taskKeys).toContain('open-long');
    expect(taskKeys).toContain('open-short');
  });
});

// ─── completeTask Tests ───────────────────────────────

describe('completeTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('creates a new progress record when task has never been completed', async () => {
    mockPrisma.tutorialProgress.findUnique.mockResolvedValue(null);
    mockPrisma.tutorialProgress.create.mockResolvedValue({
      id: 'p1',
      userId: USER_ID,
      taskKey: 'market-buy-btc',
      isCompleted: true,
      completedAt: new Date(),
    });

    const result = await completeTask('market-buy-btc');
    expect(result.success).toBe(true);
    expect(mockPrisma.tutorialProgress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskKey: 'market-buy-btc',
          isCompleted: true,
          completedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('updates existing incomplete record to completed', async () => {
    mockPrisma.tutorialProgress.findUnique.mockResolvedValue({
      id: 'p1',
      userId: USER_ID,
      taskKey: 'market-buy-btc',
      isCompleted: false,
      completedAt: null,
    });
    mockPrisma.tutorialProgress.update.mockResolvedValue({
      id: 'p1',
      userId: USER_ID,
      taskKey: 'market-buy-btc',
      isCompleted: true,
      completedAt: new Date(),
    });

    const result = await completeTask('market-buy-btc');
    expect(result.success).toBe(true);
    expect(mockPrisma.tutorialProgress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { isCompleted: true, completedAt: expect.any(Date) },
      }),
    );
  });

  it('does nothing if task is already completed (idempotent)', async () => {
    mockPrisma.tutorialProgress.findUnique.mockResolvedValue({
      id: 'p1',
      userId: USER_ID,
      taskKey: 'market-buy-btc',
      isCompleted: true,
      completedAt: new Date(),
    });

    const result = await completeTask('market-buy-btc');
    expect(result.success).toBe(true);
    // Should not create or update (already completed)
    expect(mockPrisma.tutorialProgress.create).not.toHaveBeenCalled();
    expect(mockPrisma.tutorialProgress.update).not.toHaveBeenCalled();
  });

  it('handles multiple task completions independently', async () => {
    // First task: new
    mockPrisma.tutorialProgress.findUnique
      .mockResolvedValueOnce(null) // First call: not found
      .mockResolvedValueOnce({  // Second call: already exists but incomplete
        id: 'p2',
        userId: USER_ID,
        taskKey: 'limit-buy',
        isCompleted: false,
        completedAt: null,
      });
    mockPrisma.tutorialProgress.create.mockResolvedValue({ id: 'p1' });
    mockPrisma.tutorialProgress.update.mockResolvedValue({ id: 'p2' });

    const result1 = await completeTask('market-buy-btc');
    expect(result1.success).toBe(true);
    expect(mockPrisma.tutorialProgress.create).toHaveBeenCalled();

    const result2 = await completeTask('limit-buy');
    expect(result2.success).toBe(true);
    expect(mockPrisma.tutorialProgress.update).toHaveBeenCalled();
  });
});

// ─── resetTutorialProgress Tests ──────────────────────

describe('resetTutorialProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: USER_ID });
  });

  it('deletes all tutorial progress for the user', async () => {
    mockPrisma.tutorialProgress.deleteMany.mockResolvedValue({ count: 6 });
    const result = await resetTutorialProgress();
    expect(result.success).toBe(true);
    expect(mockPrisma.tutorialProgress.deleteMany).toHaveBeenCalledWith(
      { where: { userId: USER_ID } },
    );
  });

  it('succeeds even when no progress exists to delete', async () => {
    mockPrisma.tutorialProgress.deleteMany.mockResolvedValue({ count: 0 });
    const result = await resetTutorialProgress();
    expect(result.success).toBe(true);
  });
});
