import { listOpenOrders, listOrderHistory } from '@/server/actions/orders';
import { OrdersPageClient } from './OrdersPageClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const [openOrders, orderHistory] = await Promise.all([
    listOpenOrders(),
    listOrderHistory(),
  ]);

  const rows = (orders: typeof openOrders) => orders.map(o => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return (
    <OrdersPageClient
      initialOpenOrders={rows(openOrders)}
      initialHistory={rows(orderHistory)}
    />
  );
}
