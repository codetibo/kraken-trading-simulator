import { getPriceFeed, getPriceFeedMode } from '@/lib/engine/priceFeed/PriceFeedFactory';

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD'];

/**
 * GET /api/prices/health
 *
 * Returns the current status of the price feed system:
 *   - mode: 'live' | 'simulated'
 *   - connected: whether the feed is operational
 *   - lastUpdateTimestamps: per-symbol last update time
 *   - rateLimitRemaining: for live Binance feed (via Binance response headers)
 *   - serverTime: current server time for latency calculation
 */
export async function GET() {
  const mode = getPriceFeedMode();

  try {
    const feed = getPriceFeed();

    // Fetch current prices to check connectivity and get timestamps
    const results = await Promise.allSettled(
      SYMBOLS.map(async (symbol) => {
        const price = await feed.getCurrentPrice(symbol);
        return { symbol, price, timestamp: Date.now() };
      }),
    );

    const lastUpdateTimestamps: Record<string, number> = {};
    let successCount = 0;
    let errorCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        lastUpdateTimestamps[result.value.symbol] = result.value.timestamp;
        successCount++;
      } else {
        errorCount++;
      }
    }

    const connected = successCount > 0;

    // For live mode, try to fetch rate limit info from Binance
    let rateLimitRemaining: number | null = null;
    if (mode === 'live') {
      try {
        const rateRes = await fetch(
          'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
          { method: 'GET' },
        );
        const remaining = rateRes.headers.get('x-mbx-used-weight-1m');
        if (remaining !== null) {
          rateLimitRemaining = 1200 - parseInt(remaining, 10); // Binance limit is 1200/min
        }
      } catch {
        // Rate limit check failed — ignore
      }
    }

    return Response.json({
      mode,
      connected,
      successCount,
      errorCount,
      lastUpdateTimestamps,
      rateLimitRemaining,
      serverTime: Date.now(),
    });
  } catch (error) {
    return Response.json(
      {
        mode,
        connected: false,
        successCount: 0,
        errorCount: SYMBOLS.length,
        lastUpdateTimestamps: {},
        rateLimitRemaining: null,
        serverTime: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
