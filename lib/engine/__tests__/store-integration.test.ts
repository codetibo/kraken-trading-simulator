import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock sonner toast before importing the store
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

describe('StoreProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Zustand stores between tests to avoid state leakage
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useNotificationStore } = require('@/store/notificationStore');
    useNotificationStore.setState({ history: [] });
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useNotificationStore } = require('@/store/notificationStore');
    useNotificationStore.setState({ history: [] });
  });

  it('creates the StoreProvider component without errors', async () => {
    // Just verify the module can be imported
    const mod = await import('@/components/StoreProvider');
    expect(mod.StoreProvider).toBeDefined();
  });

  it('creates the notificationStore and provides notify function', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');
    const state = useNotificationStore.getState();

    expect(state.notify).toBeDefined();
    expect(state.clearHistory).toBeDefined();
    expect(state.history).toEqual([]);
  });

  it('notify adds to history and calls sonner toast', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');

    useNotificationStore.getState().notify('info', 'Test Title', 'Test Description');

    const state = useNotificationStore.getState();
    expect(state.history).toHaveLength(1);
    expect(state.history[0].title).toBe('Test Title');
    expect(state.history[0].description).toBe('Test Description');
    expect(state.history[0].type).toBe('info');

    const { toast } = await import('sonner');
    expect(toast.info).toHaveBeenCalledWith('ℹ️ Test Title', { description: 'Test Description' });
  });

  it('notify with order_filled calls toast.success', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');
    useNotificationStore.getState().notify('order_filled', 'Order Filled', '1 BTC @ SPOT');

    const { toast } = await import('sonner');
    expect(toast.success).toHaveBeenCalledWith('✅ Order Filled', { description: '1 BTC @ SPOT' });
  });

  it('notify with error calls toast.error', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');
    useNotificationStore.getState().notify('error', 'Error', 'Something went wrong');

    const { toast } = await import('sonner');
    expect(toast.error).toHaveBeenCalledWith('🚨 Error', { description: 'Something went wrong' });
  });

  it('notify with margin_call calls toast.warning', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');
    useNotificationStore.getState().notify('margin_call', 'Margin Call', 'Add margin');

    const { toast } = await import('sonner');
    expect(toast.warning).toHaveBeenCalledWith('⚠️ Margin Call', { description: 'Add margin' });
  });

  it('notify with position_liquidated calls toast.error', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');
    useNotificationStore.getState().notify('position_liquidated', 'Liquidated', 'BTC position');

    const { toast } = await import('sonner');
    expect(toast.error).toHaveBeenCalledWith('💀 Liquidated', { description: 'BTC position' });
  });

  it('clearHistory empties the history array', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');

    useNotificationStore.getState().notify('info', 'Test');
    expect(useNotificationStore.getState().history).toHaveLength(1);

    useNotificationStore.getState().clearHistory();
    expect(useNotificationStore.getState().history).toHaveLength(0);
  });

  it('history is capped at 50 items', async () => {
    const { useNotificationStore } = await import('@/store/notificationStore');

    for (let i = 0; i < 60; i++) {
      useNotificationStore.getState().notify('info', `Notification ${i}`);
    }

    expect(useNotificationStore.getState().history).toHaveLength(50);
    // The last notification added should be at index 0 (newest first)
    expect(useNotificationStore.getState().history[0].title).toBe('Notification 59');
  });

  it('portfolioStore starts with null summary and loading false', async () => {
    const { usePortfolioStore } = await import('@/store/portfolioStore');
    const state = usePortfolioStore.getState();

    expect(state.summary).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastRefreshed).toBeNull();
    expect(state.refresh).toBeDefined();
    expect(state.setSummary).toBeDefined();
  });

  it('portfolioStore setSummary updates the summary', async () => {
    const { usePortfolioStore } = await import('@/store/portfolioStore');

    const testSummary = {
      cashBalance: 5000,
      cryptoValueUsd: 10000,
      totalEquity: 15000,
      usedMargin: 2000,
      freeMargin: 3000,
      marginLevel: 750,
      dailyPnl: 500,
      overallPnl: 2000,
    };

    usePortfolioStore.getState().setSummary(testSummary);

    const state = usePortfolioStore.getState();
    expect(state.summary).toEqual(testSummary);
    expect(state.lastRefreshed).toBeGreaterThan(0);
  });
});
