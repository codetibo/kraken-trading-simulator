import type {
  Candle,
  CandleInterval,
  PriceFeedProvider,
  PriceListener,
  PriceUpdate,
} from "./PriceFeedProvider";

interface AssetSeed {
  symbol: string;
  startPrice: number;
  /** Annualized volatility, e.g. 0.6 = 60%. */
  volatility: number;
  /** Slight drift/trend factor (expected daily movement ratio). */
  drift: number;
}

const DEFAULT_SEEDS: AssetSeed[] = [
  { symbol: "BTC/USD", startPrice: 62000, volatility: 0.55, drift: 0.0002 },
  { symbol: "ETH/USD", startPrice: 3400, volatility: 0.65, drift: 0.0002 },
  { symbol: "SOL/USD", startPrice: 140, volatility: 0.85, drift: 0.0003 },
  { symbol: "XRP/USD", startPrice: 0.55, volatility: 0.75, drift: 0.0001 },
  { symbol: "DOGE/USD", startPrice: 0.14, volatility: 0.9, drift: 0.0001 },
];

const INTERVAL_MS: Record<CandleInterval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1D": 24 * 60 * 60_000,
  "1W": 7 * 24 * 60 * 60_000,
  "1M": 30 * 24 * 60 * 60_000,
};

/**
 * Simulated price feed based on Geometric Brownian Motion (GBM).
 *
 * dS = S * (mu * dt + sigma * sqrt(dt) * Z)
 *
 * This first version is sufficient for simulation (spec: "random
 * price movement, trends, volatility"). It can be replaced at any
 * time with a real REST/WebSocket-based PriceFeedProvider, since
 * callers only depend on the interface.
 */
export class SimulatedPriceFeed implements PriceFeedProvider {
  private prices = new Map<string, number>();
  private listeners = new Map<string, Set<PriceListener>>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private readonly tickIntervalMs: number;

  constructor(
    seeds: AssetSeed[] = DEFAULT_SEEDS,
    tickIntervalMs = 1000
  ) {
    this.tickIntervalMs = tickIntervalMs;
    for (const seed of seeds) {
      this.prices.set(seed.symbol, seed.startPrice);
    }
    this.seeds = new Map(seeds.map((s) => [s.symbol, s]));
    this.startTicking();
  }

  private seeds: Map<string, AssetSeed>;

  private startTicking() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      const dt = this.tickIntervalMs / (365 * 24 * 60 * 60 * 1000);
      for (const [symbol, seed] of this.seeds) {
        const current = this.prices.get(symbol) ?? seed.startPrice;
        const z = gaussianRandom();
        const next =
          current *
          (1 + seed.drift * dt + seed.volatility * Math.sqrt(dt) * z);
        const clamped = Math.max(next, current * 0.5); // safety net against random crashes
        this.prices.set(symbol, clamped);

        const update: PriceUpdate = {
          assetSymbol: symbol,
          price: clamped,
          timestamp: Date.now(),
        };
        this.listeners.get(symbol)?.forEach((listener) => listener(update));
      }
    }, this.tickIntervalMs);
  }

  async getCurrentPrice(assetSymbol: string): Promise<number> {
    const price = this.prices.get(assetSymbol);
    if (price === undefined) {
      throw new Error(`Unknown asset: ${assetSymbol}`);
    }
    return price;
  }

  async getCandles(
    assetSymbol: string,
    interval: CandleInterval,
    limit: number
  ): Promise<Candle[]> {
    const seed = this.seeds.get(assetSymbol);
    if (!seed) throw new Error(`Unknown asset: ${assetSymbol}`);

    // Deterministic but "random-looking" historical candles generated
    // backwards from the current price, so the chart has data on load.
    const bucketMs = INTERVAL_MS[interval];
    const now = Date.now();
    const candles: Candle[] = [];
    let price = this.prices.get(assetSymbol) ?? seed.startPrice;

    for (let i = 0; i < limit; i++) {
      const timestamp = now - (limit - i) * bucketMs;
      const dt = bucketMs / (365 * 24 * 60 * 60 * 1000);
      const open = price;
      const steps = 4;
      let intraPrice = open;
      let high = open;
      let low = open;
      for (let s = 0; s < steps; s++) {
        const z = gaussianRandom();
        intraPrice *=
          1 + seed.drift * (dt / steps) + seed.volatility * Math.sqrt(dt / steps) * z;
        high = Math.max(high, intraPrice);
        low = Math.min(low, intraPrice);
      }
      const close = intraPrice;
      const volume = Math.abs(gaussianRandom()) * (open * 10);

      candles.push({ timestamp, open, high, low, close, volume });
      price = close;
    }

    return candles;
  }

  subscribe(assetSymbol: string, listener: PriceListener): () => void {
    if (!this.listeners.has(assetSymbol)) {
      this.listeners.set(assetSymbol, new Set());
    }
    this.listeners.get(assetSymbol)!.add(listener);
    return () => {
      this.listeners.get(assetSymbol)?.delete(listener);
    };
  }

  dispose(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.listeners.clear();
  }
}

/** Standard normal random number (Box–Muller transform). */
function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Singleton instance for server-side use (e.g. server actions, route handlers). */
let sharedFeed: SimulatedPriceFeed | null = null;
export function getSharedPriceFeed(): SimulatedPriceFeed {
  if (!sharedFeed) {
    sharedFeed = new SimulatedPriceFeed();
  }
  return sharedFeed;
}
