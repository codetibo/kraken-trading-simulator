import { NextResponse } from 'next/server';
import { listOpenOrders } from '@/server/actions/orders';

export async function GET() {
  try {
    const orders = await listOpenOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
