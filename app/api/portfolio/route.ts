import { NextResponse } from 'next/server';
import { getPortfolioSummary } from '@/server/actions/portfolio';

export async function GET() {
  try {
    const summary = await getPortfolioSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
