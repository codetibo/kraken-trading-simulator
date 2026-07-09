import type {
  Candle,
  CandleInterval,
  PriceFeedProvider,
  PriceListener,
  PriceUpdate,
} from './PriceFeedProvider';

/** Map our asset symbols (e.g., "BTC/USD") to Binance symbols (e.g., "BTCUSDT"). */
function toBinanceSymbol(symbol: string): string {
  return symbol.replace('/', '').replace('USD', 'USDT');
}

/** Map our intervals to Binance kline intervals. */
function toBinanceInterval(interval: CandleInterval): string {
  const map: Record<CandleInterval, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1D': '1d',
    '1W': '1w',
    '1M': '1M',
  };
  return map[interval];
}

/** Binance kline response row indices. */
const KLINE_OPEN_TIME = 0;
const KLINE_OPEN = 1;
const KLINE_HIGH = 2;
const KLINE_LOW = 3;
const KLINE_CLOSE = 4;
const KLINE_VOLUME = 5;

/** In-memory cache entry with TTL. */
interface CacheEntry {
  price: number;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 5_000; // 5 seconds

/**
 * Live price feed using Binance public REST + WebSocket APIs.
 *
 * No API key required — uses the free public endpoints.
 *
 * REST endpoints used:
 *   - GET /api/v3/ticker/price?symbol=BTCUSDT  (current price)
 *   - GET /api/v3/klines?symbol=BTCUSDT&interval=1h&limit=200 (candles)
 *
 * WebSocket:
 *   - wss://stream.binance.com:9443/stream?streams=btcusdt@trade/...
 */
export class BinancePriceFeed implements PriceFeedProvider {
  private priceCache = new Map<string, CacheEntry>();
  private listeners = new Map<string, Set<PriceListener>>();
  private ws: WebSocket | null = null;
  private wsConnected = false;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribedSymbols = new Set<string>();
  private readonly cacheTtlMs: number;

  /** Base URL for Binance REST API. */
  private readonly restBase = 'https://api.binance.com';

  /** Base URL for Binance combined WebSocket stream. */
  private readonly wsBase = 'wss://stream.binance.com:9443/stream';

  constructor(cacheTtlMs = DEFAULT_CACHE_TTL_MS) {
    this.cacheTtlMs = cacheTtlMs;
  }

  // --------------------------------------------------------------------------
  // Current Price
  // --------------------------------------------------------------------------

  async getCurrentPrice(assetSymbol: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(assetSymbol);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.price;
    }

    const binanceSymbol = toBinanceSymbol(assetSymbol);
    const url = `${this.restBase}/api/v3/ticker/price?symbol=${binanceSymbol}`;

    const res = await fetch(url, { next: { revalidate: 5 } } as RequestInit & { next?: { revalidate: number } });
    if (!res.ok) {
      throw new Error(
        `Binance API error (${res.status}) for ${binanceSymbol}`,
      );
    }

    const data = (await res.json()) as { symbol: string; price: string };
    const price = parseFloat(data.price);

    // Cache it
    this.priceCache.set(assetSymbol, {
      price,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return price;
  }

  // --------------------------------------------------------------------------
  // Historical Candles
  // --------------------------------------------------------------------------

  async getCandles(
    assetSymbol: string,
    interval: CandleInterval,
    limit: number,
  ): Promise<Candle[]> {
    const binanceSymbol = toBinanceSymbol(assetSymbol);
    const binanceInterval = toBinanceInterval(interval);
    const url = `${this.restBase}/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${Math.min(limit, 1000)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Binance kline API error (${res.status}) for ${binanceSymbol}`,
      );
    }

    const data = (await res.json()) as Array<Array<number | string>>;

    return data.map((row) => ({
      timestamp: row[KLINE_OPEN_TIME] as number,
      open: parseFloat(row[KLINE_OPEN] as string),
      high: parseFloat(row[KLINE_HIGH] as string),
      low: parseFloat(row[KLINE_LOW] as string),
      close: parseFloat(row[KLINE_CLOSE] as string),
      volume: parseFloat(row[KLINE_VOLUME] as string),
    }));
  }

  // --------------------------------------------------------------------------
  // WebSocket Subscription
  // --------------------------------------------------------------------------

  subscribe(assetSymbol: string, listener: PriceListener): () => void {
    if (!this.listeners.has(assetSymbol)) {
      this.listeners.set(assetSymbol, new Set());
    }
    this.listeners.get(assetSymbol)!.add(listener);
    this.subscribedSymbols.add(assetSymbol);

    // Connect WebSocket if not already connected
    this.ensureWebSocket();

    return () => {
      this.listeners.get(assetSymbol)?.delete(listener);
      if (this.listeners.get(assetSymbol)?.size === 0) {
        this.listeners.delete(assetSymbol);
        this.subscribedSymbols.delete(assetSymbol);
      }
      // If no more listeners, disconnect WS
      if (this.subscribedSymbols.size === 0) {
        this.disconnectWebSocket();
      }
    };
  }

  private ensureWebSocket(): void {
    if (this.wsConnected && this.ws) return;
    if (this.ws) {
      // Already connecting or in-flight
      return;
    }

    const streams = Array.from(this.subscribedSymbols)
      .map((s) => `${toBinanceSymbol(s).toLowerCase()}@trade`)
      .join('/');

    if (!streams) return;

    const url = `${this.wsBase}?streams=${streams}`;

    try {
      // Use global WebSocket (available in Node.js 18+ and Edge runtime)
      this.ws = new WebSocket(url);
    } catch {
      // WebSocket not supported in this environment (e.g., Edge Runtime)
      // Fall back to polling
      this.startPollingFallback();
      return;
    }

    this.ws.onopen = () => {
      this.wsConnected = true;
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          stream: string;
          data: {
            s: string; // symbol, e.g. "BTCUSDT"
            p: string; // price
            T: number; // trade time (ms)
          };
        };

        if (msg?.data?.s) {
          const binanceSymbol = msg.data.s;
          const price = parseFloat(msg.data.p);
          const timestamp = msg.data.T;

          // Convert back to our symbol format
          const ourSymbol = binanceSymbol.replace('USDT', '/USD');

          // Update cache
          this.priceCache.set(ourSymbol, {
            price,
            expiresAt: Date.now() + this.cacheTtlMs,
          });

          const update: PriceUpdate = {
            assetSymbol: ourSymbol,
            price,
            timestamp,
          };

          this.listeners.get(ourSymbol)?.forEach((listener) => listener(update));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.wsConnected = false;
      this.ws = null;
      // Attempt reconnect
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this, triggering reconnect
    };
  }

  private disconnectWebSocket(): void {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this.wsConnected = false;
  }

  private scheduleReconnect(): void {
    if (this.wsReconnectTimer) return;
    if (this.subscribedSymbols.size === 0) return;

    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      this.ensureWebSocket();
    }, 3000); // Reconnect after 3 seconds
  }

  // --------------------------------------------------------------------------
  // Polling Fallback (for environments without WebSocket)
  // --------------------------------------------------------------------------

  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  private startPollingFallback(): void {
    if (this.pollingTimer) return;

    this.pollingTimer = setInterval(async () => {
      for (const symbol of this.subscribedSymbols) {
        try {
          const price = await this.getCurrentPrice(symbol);
          const update: PriceUpdate = {
            assetSymbol: symbol,
            price,
            timestamp: Date.now(),
          };
          this.listeners.get(symbol)?.forEach((listener) => listener(update));
        } catch {
          // Skip failed polls
        }
      }
    }, 1000); // Poll every second as fallback
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  dispose(): void {
    this.disconnectWebSocket();
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    this.listeners.clear();
    this.priceCache.clear();
    this.subscribedSymbols.clear();
  }
}
