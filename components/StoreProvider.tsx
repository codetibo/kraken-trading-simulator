'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { startPortfolioPolling } from '@/store/portfolioStore';

const WELCOME_SEEN_KEY = 'kraken-welcome-seen';

interface StoreProviderProps {
  children: React.ReactNode;
  /** Set to false to skip portfolio polling (e.g. on pages that don't need it). */
  enablePortfolioPolling?: boolean;
  /** Interval in ms for portfolio polling. Defaults to 5000. */
  pollingIntervalMs?: number;
  /** Show a welcome notification on mount. */
  showWelcome?: boolean;
}

export function StoreProvider({
  children,
  enablePortfolioPolling = true,
  pollingIntervalMs = 5000,
  showWelcome = false,
}: StoreProviderProps) {
  useEffect(() => {
    // Start portfolio polling
    let cleanupPolling: (() => void) | undefined;
    if (enablePortfolioPolling) {
      cleanupPolling = startPortfolioPolling(pollingIntervalMs);
    }

    // Welcome notification (only once per session)
    if (showWelcome && typeof window !== 'undefined') {
      const seen = sessionStorage.getItem(WELCOME_SEEN_KEY);
      if (!seen) {
        sessionStorage.setItem(WELCOME_SEEN_KEY, 'true');
        useNotificationStore.getState().notify(
          'info',
          'Welcome to Kraken Trading Simulator',
          'Your portfolio updates live. Start trading on the Trade page.',
        );
      }
    }

    return () => {
      cleanupPolling?.();
    };
  }, [enablePortfolioPolling, pollingIntervalMs, showWelcome]);

  return <>{children}</>;
}
