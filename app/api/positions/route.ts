import { NextResponse } from 'next/server';
import { listOpenPositions } from '@/server/actions/positions';

export async function GET() {
  try {
    const positions = await listOpenPositions();
    return NextResponse.json({ positions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
