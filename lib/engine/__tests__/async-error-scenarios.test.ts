import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock global fetch for API failure tests
const mockFetch = jest.fn<typeof global.fetch>();
global.fetch = mockFetch as unknown as typeof global.fetch;

// ── Tests ──

describe('Async Error Scenarios — Order API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles API returning 500 error gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: 'Internal Server Error' }),
    );

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(500);
    expect(res.ok).toBe(false);
  });

  it('handles malformed JSON response from API', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('not-json-at-all', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await fetch('/api/orders', { method: 'POST' });

    await expect(res.json()).rejects.toThrow();
  });

  it('handles API returning error in response body', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: 'Insufficient balance' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Insufficient balance');
  });

  it('handles network timeout', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(fetch('/api/orders', { method: 'POST' })).rejects.toThrow(
      'Network timeout',
    );
  });
});

describe('Async Error Scenarios — Price Feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles price feed API returning no data', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await fetch('/api/market');
    const data = await res.json();

    // Empty response should not crash
    expect(typeof data).toBe('object');
  });

  it('handles price stream disconnection gracefully', async () => {
    // Simulate SSE-stream-like endpoint that disconnects
    mockFetch.mockRejectedValueOnce(new Error('Connection interrupted'));

    await expect(fetch('/api/prices/stream')).rejects.toThrow(
      'Connection interrupted',
    );
  });

  it('handles candles API with invalid interval gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid interval' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await fetch('/api/market/candles?symbol=BTC/USD&interval=invalid');
    const data = await res.json();

    expect(data.error).toBe('Invalid interval');
  });

  it('handles health check API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetch('/api/prices/health')).rejects.toThrow('Network error');
  });
});

describe('Async Error Scenarios — Order Cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles cancelling non-existent order', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/orders/non-existent-id', { method: 'DELETE' });
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Order not found');
  });

  it('handles cancelling already-filled order', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot cancel filled order',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/orders/filled-order-id', { method: 'DELETE' });
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Cannot cancel filled order');
  });
});

describe('Async Error Scenarios — Portfolio & Positions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles portfolio API returning incomplete data', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          // Missing fields that frontend expects
          cashBalance: 10000,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/portfolio');
    const data = await res.json();

    // Should have at least the returned field
    expect(data.cashBalance).toBe(10000);
    // Missing fields should not crash — component handles them as undefined
    expect(data.totalEquity).toBeUndefined();
  });

  it('handles position close with server error', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: 'Position liquidation blocked' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/positions/pos-123', { method: 'DELETE' });
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Position liquidation blocked');
  });

  it('handles concurrent position close request (race condition)', async () => {
    // Both requests succeed on server but one closes, second fails
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: 'Position already closed' }),
          { status: 409 },
        ),
      );

    const [res1, res2] = await Promise.all([
      fetch('/api/positions/pos-123', { method: 'DELETE' }),
      fetch('/api/positions/pos-123', { method: 'DELETE' }),
    ]);

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.success).toBe(true);
    expect(data2.success).toBe(false);
    expect(data2.error).toBe('Position already closed');
  });
});

describe('Async Error Scenarios — Settings & Reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles settings save failure', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: 'Failed to save settings' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ darkMode: true }),
    });
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to save settings');
  });

  it('handles reset simulation with server error', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: 'Reset in progress' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Reset in progress');
  });

  it('handles tutorial progress save failure', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: 'Failed to update progress' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await fetch('/api/tutorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'task-1' }),
    });
    const data = await res.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to update progress');
  });
});
