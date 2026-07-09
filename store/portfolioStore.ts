import { create } from 'zustand';

export interface PortfolioSummary {
  cashBalance: number;
  cryptoValueUsd: number;
  totalEquity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
  dailyPnl: number;
  overallPnl: number;
}

interface PortfolioState {
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  lastRefreshed: number | null;

  // Actions
  refresh: () => Promise<void>;
  setSummary: (summary: PortfolioSummary) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  summary: null,
  loading: false,
  error: null,
  lastRefreshed: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      const data = await res.json();
      if (data.summary) {
        set({
          summary: data.summary,
          loading: false,
          lastRefreshed: Date.now(),
        });
      }
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  setSummary: (summary) => set({ summary, lastRefreshed: Date.now() }),
}));

/**
 * Hook that periodically refreshes the portfolio store.
 * Call this once at the app-level or in layout components that need live portfolio data.
 */
export function startPortfolioPolling(intervalMs = 5000): () => void {
  usePortfolioStore.getState().refresh();
  const id = setInterval(() => {
    usePortfolioStore.getState().refresh();
  }, intervalMs);
  return () => clearInterval(id);
}
