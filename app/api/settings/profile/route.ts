import { NextResponse } from 'next/server';
import { getProfile, updateProfile, updatePassword } from '@/server/actions/settings';

export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    if (name !== undefined) {
      const result = await updateProfile({ name });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    if (currentPassword && newPassword) {
      const result = await updatePassword({ currentPassword, newPassword });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 },
    );
  }
}
