/**
 * Price feed abstraction.
 *
 * The spec explicitly requires: "The price feed should work through a
 * separate interface so the simulated and real market data sources can
 * be easily swapped." The engine layer (matching, margin) accesses
 * prices EXCLUSIVELY through this interface — never directly to the
 * simulator or a future real API client.
 */

export interface Candle {
  timestamp: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1D" | "1W" | "1M";

export interface PriceUpdate {
  assetSymbol: string;
  price: number;
  timestamp: number;
}

export type PriceListener = (update: PriceUpdate) => void;

export interface PriceFeedProvider {
  /** The asset's current (last traded / mark) price. */
  getCurrentPrice(assetSymbol: string): Promise<number>;

  /** Historical candles for a given interval. */
  getCandles(
    assetSymbol: string,
    interval: CandleInterval,
    limit: number
  ): Promise<Candle[]>;

  /** Subscribe to real-time price updates (e.g. WebSocket or simulated tick). */
  subscribe(assetSymbol: string, listener: PriceListener): () => void;

  /** Release resources (e.g. stop intervals, close sockets). */
  dispose(): void;
}
