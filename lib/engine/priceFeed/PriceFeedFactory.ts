import type { PriceFeedProvider } from './PriceFeedProvider';
import { getSharedPriceFeed } from './SimulatedPriceFeed';
import { BinancePriceFeed } from './BinancePriceFeed';

export type PriceFeedMode = 'simulated' | 'live';

/**
 * Create or retrieve the shared price feed based on the configured mode.
 *
 * Priority:
 * 1. Environment variable `PRICE_FEED_MODE=live|simulated`
 * 2. If not set, defaults to 'simulated' (safe default)
 *
 * The mode can also be overridden at runtime via `overrideMode()` for
 * use cases like settings page toggles without restarting the server.
 */

let currentMode: PriceFeedMode = getEnvMode();
let liveFeed: BinancePriceFeed | null = null;

function getEnvMode(): PriceFeedMode {
  if (typeof process !== 'undefined' && process.env?.PRICE_FEED_MODE === 'simulated') {
    return 'simulated';
  }
  return 'live';
}

/**
 * Return the shared PriceFeedProvider based on the current mode.
 */
export function getPriceFeed(): PriceFeedProvider {
  if (currentMode === 'live') {
    if (!liveFeed) {
      liveFeed = new BinancePriceFeed();
    }
    return liveFeed;
  }
  return getSharedPriceFeed();
}

/**
 * Override the price feed mode at runtime (e.g. from a settings toggle).
 * Call this when the user changes their preference in the settings page.
 *
 * Note: Switching modes disposes of the previous live feed instance
 * and creates a new one on the next `getPriceFeed()` call.
 */
export function setPriceFeedMode(mode: PriceFeedMode): void {
  if (mode === currentMode) return;

  // Dispose live feed when switching away
  if (currentMode === 'live' && liveFeed) {
    liveFeed.dispose();
    liveFeed = null;
  }

  currentMode = mode;
}

/**
 * Get the current price feed mode.
 */
export function getPriceFeedMode(): PriceFeedMode {
  return currentMode;
}

/**
 * Reset the factory (useful for testing).
 */
export function resetPriceFeedFactory(): void {
  if (liveFeed) {
    liveFeed.dispose();
    liveFeed = null;
  }
  currentMode = getEnvMode();
}
