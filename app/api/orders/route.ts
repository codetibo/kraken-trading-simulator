import { NextRequest, NextResponse } from 'next/server';
import { createOrder, listOpenOrders, listOrderHistory } from '@/server/actions/orders';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createOrder(body);

    // If order was created successfully, fetch its current status
    // (it may have been immediately filled/settled)
    let orderStatus: string | undefined;
    if (result.success && result.data?.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: result.data.orderId },
        select: { status: true },
      });
      orderStatus = order?.status;
    }

    return NextResponse.json({ ...result, orderStatus });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/orders?status=open|history|all
 *
 * Unified order listing endpoint.
 * - status=open → open orders (default)
 * - status=history → order history
 * - status=all → both open and history combined
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';

    if (status === 'open') {
      const orders = await listOpenOrders();
      return NextResponse.json({ orders, total: orders.length });
    }

    if (status === 'history') {
      const orders = await listOrderHistory();
      return NextResponse.json({ orders, total: orders.length });
    }

    // status=all
    const [openOrders, historyOrders] = await Promise.all([
      listOpenOrders(),
      listOrderHistory(),
    ]);

    return NextResponse.json({
      openOrders,
      historyOrders,
      openTotal: openOrders.length,
      historyTotal: historyOrders.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
