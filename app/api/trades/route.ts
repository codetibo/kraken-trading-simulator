import { NextRequest, NextResponse } from 'next/server';
import { listTradeHistory } from '@/server/actions/history';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      pair: searchParams.get('pair') || undefined,
      type: searchParams.get('type') || undefined,
      side: searchParams.get('side') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
    };
    const trades = await listTradeHistory(
      filters.pair || filters.type || filters.side || filters.dateRange
        ? filters
        : undefined,
    );
    return NextResponse.json({ trades });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
