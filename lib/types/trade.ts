/** A row in the simulated order book, used by both OrderBook and DepthChart components. */
export interface OrderBookRow {
  /** Price level in quote currency. */
  price: number;
  /** Available size at this price level (in base asset). */
  size: number;
  /** Cumulative size from the best price to this level. */
  total: number;
  /** Visual depth ratio (0-1) for bar width rendering. */
  depth: number;
}
