import { NextRequest, NextResponse } from 'next/server';
import { updateJournalEntry, deleteJournalEntry } from '@/server/actions/journal';

/**
 * PUT /api/journal/[id]
 *
 * Updates a journal entry.
 * Body: { notes?, tags?, emotionalState?, screenshot?, tradeId?, assetSymbol? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateJournalEntry({ id, ...body });
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

/**
 * DELETE /api/journal/[id]
 *
 * Deletes a journal entry.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await deleteJournalEntry(id);
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
