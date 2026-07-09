import { NextRequest, NextResponse } from 'next/server';
import { resetSimulation } from '@/server/actions/portfolio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await resetSimulation(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
