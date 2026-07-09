import { getPriceFeed, getPriceFeedMode } from '@/lib/engine/priceFeed/PriceFeedFactory';

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD'];

/**
 * SSE (Server-Sent Events) endpoint for live price streaming.
 *
 * The browser connects to GET /api/prices/stream and receives:
 *   1. An initial `connected` event with the price feed mode
 *   2. An initial batch of `price` events fetched via REST (immediate)
 *   3. Ongoing `price` events pushed from the price feed as they tick
 *
 * Data format:
 *   event: connected
 *   data: {"mode":"live"}
 *
 *   event: price
 *   data: {"assetSymbol":"BTC/USD","price":62345.12,"timestamp":1234567890}
 */
export async function GET() {
  const encoder = new TextEncoder();
  const feed = getPriceFeed();
  const mode = getPriceFeedMode();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connection confirmation with price feed mode
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ mode })}\n\n`),
      );

      // 2. Fetch current prices via REST (immediate, no WebSocket delay)
      Promise.allSettled(
        SYMBOLS.map(async (symbol) => {
          try {
            const price = await feed.getCurrentPrice(symbol);
            const data = JSON.stringify({
              assetSymbol: symbol,
              price,
              timestamp: Date.now(),
            });
            controller.enqueue(
              encoder.encode(`event: price\ndata: ${data}\n\n`),
            );
          } catch {
            // Skip symbols that fail to fetch
          }
        }),
      );

      // 3. Subscribe to live updates via WebSocket / polling
      const unsubs = SYMBOLS.map((symbol) =>
        feed.subscribe(symbol, (update) => {
          try {
            const data = JSON.stringify({
              assetSymbol: update.assetSymbol,
              price: update.price,
              timestamp: update.timestamp,
            });
            controller.enqueue(
              encoder.encode(`event: price\ndata: ${data}\n\n`),
            );
          } catch {
            // If the stream is closed, clean up
          }
        }),
      );

      // 4. Keep-alive heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on stream close
      const cleanup = () => {
        unsubs.forEach((unsub) => unsub());
        clearInterval(heartbeat);
      };

      // Handle client disconnection
      (
        controller as ReadableStreamDefaultController & {
          signal?: AbortSignal;
        }
      ).signal?.addEventListener?.('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
