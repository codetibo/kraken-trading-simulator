import { NextRequest, NextResponse } from 'next/server';
import {
  getTutorialProgress,
  completeTask,
  resetTutorialProgress,
} from '@/server/actions/tutorial';

export async function GET() {
  try {
    const progress = await getTutorialProgress();
    return NextResponse.json({ progress });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await completeTask(body.taskKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const result = await resetTutorialProgress();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
