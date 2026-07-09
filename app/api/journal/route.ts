import { NextRequest, NextResponse } from 'next/server';
import {
  listJournalEntries,
  createJournalEntry,
  exportJournalCsv,
  exportJournalText,
} from '@/server/actions/journal';

/**
 * GET /api/journal?search=&tag=&emotionalState=&assetSymbol=&dateFrom=&dateTo=&export=csv|text
 *
 * Lists journal entries with optional filtering.
 * If export=csv, returns CSV file download.
 * If export=text, returns plain-text report download.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      search: searchParams.get('search') || undefined,
      tag: searchParams.get('tag') || undefined,
      emotionalState: searchParams.get('emotionalState') || undefined,
      assetSymbol: searchParams.get('assetSymbol') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const exportFormat = searchParams.get('export');

    if (exportFormat === 'csv') {
      const result = await exportJournalCsv(filters);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error || 'Export failed' },
          { status: 500 },
        );
      }
      return new NextResponse(result.data, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="journal-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (exportFormat === 'text' || exportFormat === 'pdf') {
      const result = await exportJournalText(filters);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error || 'Export failed' },
          { status: 500 },
        );
      }
      return new NextResponse(result.data, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="journal-${new Date().toISOString().split('T')[0]}.txt"`,
        },
      });
    }

    const entries = await listJournalEntries(filters);
    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/journal
 *
 * Creates a new journal entry.
 * Body: { tradeId?, assetSymbol?, notes, tags, emotionalState?, screenshot? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createJournalEntry(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
