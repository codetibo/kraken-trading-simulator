'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from './orders';
import { Prisma } from '@/app/generated/prisma/client';
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
} from '@/lib/validation/journalSchemas';

// ─── Types ───────────────────────────────────────────

/** View model for a journal entry as returned to the frontend. */
export interface JournalEntryView {
  id: string;
  /** Associated trade ID, if linked to a specific trade. */
  tradeId: string | null;
  /** Trading pair symbol this entry relates to. */
  assetSymbol: string | null;
  /** Free-form journal text. */
  notes: string;
  /** Categorization tags. */
  tags: string[];
  /** Emotional state at the time of writing (e.g. "calm", "stressed"). */
  emotionalState: string | null;
  /** Optional screenshot URL or base64 data. */
  screenshot: string | null;
  /** ISO date string. */
  createdAt: string;
  /** ISO date string of last update. */
  updatedAt: string;
}

/** Filters for querying journal entries. */
export interface JournalFilters {
  /** Full-text search in notes. */
  search?: string;
  /** Filter by exact tag match. */
  tag?: string;
  /** Filter by emotional state. */
  emotionalState?: string;
  /** Filter by asset symbol (partial match, case-insensitive). */
  assetSymbol?: string;
  /** Earliest date (ISO string). */
  dateFrom?: string;
  /** Latest date (ISO string). */
  dateTo?: string;
}

// ─── Helpers ─────────────────────────────────────────

/**
 * Build a Prisma where clause from journal filters.
 */
function buildJournalWhereClause(
  userId: string,
  filters?: JournalFilters,
): Prisma.JournalEntryWhereInput {
  const where: Prisma.JournalEntryWhereInput = { userId };

  if (filters?.search) {
    where.notes = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters?.tag) {
    where.tags = { has: filters.tag };
  }
  if (filters?.emotionalState) {
    where.emotionalState = filters.emotionalState;
  }
  if (filters?.assetSymbol) {
    where.assetSymbol = { contains: filters.assetSymbol.toUpperCase() };
  }
  if (filters?.dateFrom || filters?.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) {
      createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      createdAt.lte = new Date(filters.dateTo);
    }
    where.createdAt = createdAt;
  }

  return where;
}

// ─── Server Actions ──────────────────────────────────

/**
 * List journal entries with optional filtering.
 * Always returns newest-first, capped at 100 records.
 */
export async function listJournalEntries(
  filters?: JournalFilters,
): Promise<JournalEntryView[]> {
  const userId = await getCurrentUserId();
  const where = buildJournalWhereClause(userId, filters);

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return entries.map((e) => ({
    id: e.id,
    tradeId: e.tradeId,
    assetSymbol: e.assetSymbol,
    notes: e.notes,
    tags: e.tags,
    emotionalState: e.emotionalState,
    screenshot: e.screenshot,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));
}

/**
 * Create a new journal entry.
 */
export async function createJournalEntry(
  input: Record<string, unknown>,
): Promise<{ success: boolean; data?: JournalEntryView; error?: string }> {
  const parsed = createJournalEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const userId = await getCurrentUserId();

  const entry = await prisma.journalEntry.create({
    data: {
      userId,
      tradeId: parsed.data.tradeId ?? null,
      assetSymbol: parsed.data.assetSymbol ?? null,
      notes: parsed.data.notes,
      tags: parsed.data.tags,
      emotionalState: parsed.data.emotionalState ?? null,
      screenshot: parsed.data.screenshot ?? null,
    },
  });

  revalidatePath('/journal');

  return {
    success: true,
    data: {
      id: entry.id,
      tradeId: entry.tradeId,
      assetSymbol: entry.assetSymbol,
      notes: entry.notes,
      tags: entry.tags,
      emotionalState: entry.emotionalState,
      screenshot: entry.screenshot,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    },
  };
}

/**
 * Update an existing journal entry.
 */
export async function updateJournalEntry(
  input: Record<string, unknown>,
): Promise<{ success: boolean; data?: JournalEntryView; error?: string }> {
  const parsed = updateJournalEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const userId = await getCurrentUserId();

  // Verify ownership
  const existing = await prisma.journalEntry.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing || existing.userId !== userId) {
    return { success: false, error: 'Journal entry not found' };
  }

  const updateData: Prisma.JournalEntryUpdateInput = {};
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
  if (parsed.data.emotionalState !== undefined)
    updateData.emotionalState = parsed.data.emotionalState;
  if (parsed.data.screenshot !== undefined)
    updateData.screenshot = parsed.data.screenshot;
  if (parsed.data.tradeId !== undefined) updateData.tradeId = parsed.data.tradeId;
  if (parsed.data.assetSymbol !== undefined)
    updateData.assetSymbol = parsed.data.assetSymbol;

  const entry = await prisma.journalEntry.update({
    where: { id: parsed.data.id },
    data: updateData,
  });

  revalidatePath('/journal');

  return {
    success: true,
    data: {
      id: entry.id,
      tradeId: entry.tradeId,
      assetSymbol: entry.assetSymbol,
      notes: entry.notes,
      tags: entry.tags,
      emotionalState: entry.emotionalState,
      screenshot: entry.screenshot,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    },
  };
}

/**
 * Delete a journal entry.
 */
export async function deleteJournalEntry(id: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();

  const existing = await prisma.journalEntry.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== userId) {
    return { success: false, error: 'Journal entry not found' };
  }

  await prisma.journalEntry.delete({ where: { id } });

  revalidatePath('/journal');

  return { success: true };
}

/**
 * Export journal entries as CSV.
 */
export async function exportJournalCsv(
  filters?: JournalFilters,
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const entries = await listJournalEntries(filters);

    const header = 'Date,Asset,Tags,Emotional State,Notes,Screenshot';
    const rows = entries.map((e) => {
      const date = new Date(e.createdAt).toISOString().split('T')[0];
      const asset = e.assetSymbol ?? '';
      const tags = e.tags.join('; ');
      const state = e.emotionalState ?? '';
      const notes = `"${e.notes.replace(/"/g, '""')}"`;
      const screenshot = e.screenshot ? 'Yes' : '';
      return [date, asset, tags, state, notes, screenshot].join(',');
    });

    return { success: true, data: [header, ...rows].join('\n') };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Export journal entries as plain-text formatted report.
 * Generates a printable report that can be saved as a text file.
 */
export async function exportJournalText(
  filters?: JournalFilters,
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const entries = await listJournalEntries(filters);

    const lines: string[] = [
      '═══════════════════════════════════════════════════════',
      '           TRADING JOURNAL REPORT',
      '═══════════════════════════════════════════════════════',
      `Generated: ${new Date().toLocaleString()}`,
      `Entries: ${entries.length}`,
      '',
      '───────────────────────────────────────────────────────',
      '',
    ];

    for (const entry of entries) {
      const date = new Date(entry.createdAt).toLocaleString();
      lines.push(`Date:        ${date}`);
      lines.push(`Asset:       ${entry.assetSymbol ?? 'N/A'}`);
      lines.push(`Tags:        ${entry.tags.length > 0 ? entry.tags.join(', ') : 'None'}`);
      lines.push(`State:       ${entry.emotionalState ?? 'N/A'}`);
      lines.push('');
      lines.push('Notes:');
      lines.push(entry.notes);
      lines.push('');
      if (entry.screenshot) {
        lines.push('[Screenshot attached]');
        lines.push('');
      }
      lines.push('───────────────────────────────────────────────────────');
      lines.push('');
    }

    return { success: true, data: lines.join('\n') };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}
