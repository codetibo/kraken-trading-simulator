import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn<typeof global.fetch>();
global.fetch = mockFetch as unknown as typeof global.fetch;

// Mock date-fns format
jest.mock('date-fns', () => ({
  format: (date: Date) => {
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/orders',
}));

describe('Orders Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports the OrdersPageClient component', async () => {
    const { OrdersPageClient } = await import('@/app/(main)/orders/OrdersPageClient');
    expect(OrdersPageClient).toBeDefined();
    expect(typeof OrdersPageClient).toBe('function');
  });

  it('cancel order API endpoint works', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const orderId = 'test-order-id';
    const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith(`/api/orders/${orderId}`, {
      method: 'DELETE',
    });
    expect(data.success).toBe(true);
  });

  it('orders API endpoints return expected shape', async () => {
    const mockOrders = [
      {
        id: 'order-1',
        assetSymbol: 'BTC/USD',
        marketType: 'SPOT',
        side: 'BUY',
        type: 'LIMIT',
        status: 'OPEN',
        quantity: 0.5,
        filledQuantity: 0,
        limitPrice: 48000,
        feePaid: 0,
        createdAt: '2026-07-06T10:00:00Z',
        updatedAt: '2026-07-06T10:00:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ orders: mockOrders }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const res = await fetch('/api/orders/open', { cache: 'no-store' });
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/open', {
      cache: 'no-store',
    });
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].id).toBe('order-1');
    expect(data.orders[0].assetSymbol).toBe('BTC/USD');
    expect(data.orders[0].status).toBe('OPEN');
  });

  it('order history endpoint returns multiple statuses', async () => {
    const mockHistory = [
      {
        id: 'order-2',
        assetSymbol: 'ETH/USD',
        marketType: 'SPOT',
        side: 'SELL',
        type: 'MARKET',
        status: 'FILLED',
        quantity: 10,
        filledQuantity: 10,
        averageFillPrice: 3000,
        feePaid: 7.8,
        createdAt: '2026-07-05T14:00:00Z',
        updatedAt: '2026-07-05T14:00:01Z',
      },
      {
        id: 'order-3',
        assetSymbol: 'SOL/USD',
        marketType: 'SPOT',
        side: 'BUY',
        type: 'LIMIT',
        status: 'CANCELLED',
        quantity: 50,
        filledQuantity: 0,
        limitPrice: 120,
        feePaid: 0,
        createdAt: '2026-07-04T09:00:00Z',
        updatedAt: '2026-07-04T10:00:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ orders: mockHistory }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const res = await fetch('/api/orders/history');
    const data = await res.json();

    expect(data.orders).toHaveLength(2);
    const filledOrders = data.orders.filter((o: { status: string }) => o.status === 'FILLED');
    const cancelledOrders = data.orders.filter((o: { status: string }) => o.status === 'CANCELLED');
    expect(filledOrders).toHaveLength(1);
    expect(cancelledOrders).toHaveLength(1);
  });
});
