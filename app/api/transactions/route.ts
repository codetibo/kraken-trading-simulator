import { NextRequest, NextResponse } from 'next/server';
import { listTransactions } from '@/server/actions/history';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      type: searchParams.get('type') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
      search: searchParams.get('search') || undefined,
    };
    const transactions = await listTransactions(
      filters.type || filters.dateRange || filters.search
        ? filters
        : undefined,
    );
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
