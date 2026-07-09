import { NextResponse } from 'next/server';
import { getRecentTrades } from '@/server/actions/portfolio';

export async function GET() {
  try {
    const trades = await getRecentTrades(30);
    return NextResponse.json({ trades });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
