import { z } from 'zod';

export const EMOTIONAL_STATES = [
  'calm',
  'confident',
  'excited',
  'cautious',
  'stressed',
  'frustrated',
  'fearful',
  'greedy',
  'neutral',
] as const;

export const createJournalEntrySchema = z.object({
  tradeId: z.string().optional(),
  assetSymbol: z.string().optional(),
  notes: z.string().min(1, 'Notes are required').max(5000),
  tags: z.array(z.string().max(30)).max(10).default([]),
  emotionalState: z.enum(EMOTIONAL_STATES).optional(),
  screenshot: z.string().max(50000).optional(),
});

export const updateJournalEntrySchema = z.object({
  id: z.string(),
  tradeId: z.string().optional().nullable(),
  assetSymbol: z.string().optional().nullable(),
  notes: z.string().min(1, 'Notes are required').max(5000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  emotionalState: z.enum(EMOTIONAL_STATES).optional().nullable(),
  screenshot: z.string().max(50000).optional().nullable(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
