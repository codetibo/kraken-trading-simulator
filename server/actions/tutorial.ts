'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from './orders';
import { TUTORIAL_TASKS } from '@/lib/engine/tutorialTasks';
import type { TutorialTaskDef } from '@/lib/engine/tutorialTasks';

/** A tutorial task with the current user's completion status merged in. */
export interface TutorialTask extends TutorialTaskDef {
  isCompleted: boolean;
  completedAt: string | null;
}

/**
 * Get the current user's tutorial progress. Returns all tasks with
 * completion status merged with the static task definitions.
 */
export async function getTutorialProgress(): Promise<TutorialTask[]> {
  const userId = await getCurrentUserId();
  const progressRecords = await prisma.tutorialProgress.findMany({
    where: { userId },
  });

  const completedMap = new Map(
    progressRecords.map(r => [r.taskKey, r]),
  );

  return TUTORIAL_TASKS.map(task => {
    const record = completedMap.get(task.taskKey);
    return {
      ...task,
      isCompleted: record?.isCompleted ?? false,
      completedAt: record?.completedAt?.toISOString() ?? null,
    };
  });
}

/**
 * Mark a tutorial task as completed. Idempotent — calling again with
 * the same taskKey does nothing.
 */
export async function completeTask(
  taskKey: string,
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();

  const existing = await prisma.tutorialProgress.findUnique({
    where: { userId_taskKey: { userId, taskKey } },
  });

  if (!existing) {
    await prisma.tutorialProgress.create({
      data: { userId, taskKey, isCompleted: true, completedAt: new Date() },
    });
  } else if (!existing.isCompleted) {
    await prisma.tutorialProgress.update({
      where: { id: existing.id },
      data: { isCompleted: true, completedAt: new Date() },
    });
  }

  revalidatePath('/education');
  return { success: true };
}

/**
 * Reset all tutorial progress for the current user.
 */
export async function resetTutorialProgress(): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await prisma.tutorialProgress.deleteMany({ where: { userId } });
  revalidatePath('/education');
  return { success: true };
}
