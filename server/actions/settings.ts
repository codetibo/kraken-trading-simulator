'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from './orders';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { setPriceFeedMode } from '@/lib/engine/priceFeed/PriceFeedFactory';
import type { PriceFeedMode } from '@/lib/engine/priceFeed/PriceFeedFactory';

// ─── Settings Types ────────────────────────────────────────────────────────

export interface UserSettings {
  id: string;
  darkMode: boolean;
  language: string;
  displayCurrency: string;
  startingBalance: number;
  priceFeedMode: string;
  orderConfirmation: boolean;
}

export interface UserProfile {
  name: string | null;
  email: string;
}

// ─── Settings CRUD ─────────────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings | null> {
  const userId = await getCurrentUserId();

  const settings = await prisma.settings.findUnique({
    where: { userId },
  });

  if (!settings) {
    // Return defaults when no settings record exists yet
    return {
      id: '',
      darkMode: true,
      language: 'en',
      displayCurrency: 'USD',
      startingBalance: 10000,
      priceFeedMode: 'simulated',
      orderConfirmation: false,
    };
  }

  return {
    id: settings.id,
    darkMode: settings.darkMode,
    language: settings.language,
    displayCurrency: settings.displayCurrency,
    startingBalance: Number(settings.startingBalance),
    priceFeedMode: settings.priceFeedMode,
    orderConfirmation: settings.orderConfirmation,
  };
}

export async function updateSettings(
  updates: Partial<Omit<UserSettings, 'id'>>,
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();

  // If priceFeedMode is being changed, apply it immediately
  if (updates.priceFeedMode) {
    setPriceFeedMode(updates.priceFeedMode as PriceFeedMode);
  }

  await prisma.settings.upsert({
    where: { userId },
    create: {
      userId,
      ...updates,
      startingBalance: updates.startingBalance ?? 10000,
    },
    update: updates,
  });

  revalidatePath('/settings');
  return { success: true };
}

// ─── Profile ───────────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return {
    name: user?.name ?? session?.user?.name ?? null,
    email: session?.user?.email ?? user?.email ?? '',
  };
}

export async function updateProfile(input: {
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();

  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: 'Name is required' };
  }
  if (input.name.length > 50) {
    return { success: false, error: 'Name must be 50 characters or less' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: input.name.trim() },
  });

  revalidatePath('/settings');
  revalidatePath('/');
  return { success: true };
}

export async function updatePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  await getCurrentUserId();

  if (!input.newPassword || input.newPassword.length < 6) {
    return {
      success: false,
      error: 'New password must be at least 6 characters',
    };
  }

  if (input.currentPassword === input.newPassword) {
    return {
      success: false,
      error: 'New password must be different from current password',
    };
  }

  try {
    // Use Better Auth's changePassword API
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update password';
    if (
      message.includes('incorrect') ||
      message.includes('Invalid') ||
      message.includes('wrong')
    ) {
      return { success: false, error: 'Current password is incorrect' };
    }
    return { success: false, error: message };
  }
}
