import { NextResponse } from 'next/server';
import { getHoldings } from '@/server/actions/portfolio';

export async function GET() {
  try {
    const holdings = await getHoldings();
    return NextResponse.json({ holdings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
