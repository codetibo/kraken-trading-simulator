import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Zustand Stores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useTradeStore', () => {
    it('has correct default values', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      const state = useTradeStore.getState();

      expect(state.selectedPair).toBe('BTC/USD');
      expect(state.chartInterval).toBe('1h');
      expect(state.orderType).toBe('MARKET');
      expect(state.marketType).toBe('SPOT');
      expect(state.side).toBe('BUY');
      expect(state.positionSide).toBe('LONG');
      expect(state.leverage).toBe(2);
      expect(state.activeBottomTab).toBe('open');
    });

    it('updates selectedPair', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setSelectedPair('ETH/USD');
      expect(useTradeStore.getState().selectedPair).toBe('ETH/USD');
    });

    it('updates chartInterval', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setChartInterval('5m');
      expect(useTradeStore.getState().chartInterval).toBe('5m');
    });

    it('updates orderType', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setOrderType('LIMIT');
      expect(useTradeStore.getState().orderType).toBe('LIMIT');
    });

    it('toggles market type', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setMarketType('MARGIN');
      expect(useTradeStore.getState().marketType).toBe('MARGIN');
    });

    it('updates side', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setSide('SELL');
      expect(useTradeStore.getState().side).toBe('SELL');
    });

    it('updates positionSide', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setPositionSide('SHORT');
      expect(useTradeStore.getState().positionSide).toBe('SHORT');
    });

    it('updates leverage', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setLeverage(5);
      expect(useTradeStore.getState().leverage).toBe(5);
    });

    it('updates activeBottomTab', async () => {
      const { useTradeStore } = await import('@/store/tradeStore');
      useTradeStore.getState().setActiveBottomTab('positions');
      expect(useTradeStore.getState().activeBottomTab).toBe('positions');
    });
  });

  describe('useNotificationStore', () => {
    it('has empty history by default', async () => {
      const { useNotificationStore } = await import(
        '@/store/notificationStore'
      );
      expect(useNotificationStore.getState().history).toEqual([]);
    });

    it('adds notification to history and calls sonner', async () => {
      const { useNotificationStore } = await import(
        '@/store/notificationStore'
      );
      const { toast } = await import('sonner');

      useNotificationStore.getState().notify(
        'order_filled',
        'Order filled',
        '0.5 BTC bought at $50,000',
      );

      const history = useNotificationStore.getState().history;
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('order_filled');
      expect(history[0].title).toBe('Order filled');
      expect(toast.success).toHaveBeenCalledWith(
        '✅ Order filled',
        { description: '0.5 BTC bought at $50,000' },
      );
    });

    it('keeps last 50 notifications', async () => {
      const { useNotificationStore } = await import(
        '@/store/notificationStore'
      );

      for (let i = 0; i < 60; i++) {
        useNotificationStore.getState().notify('info', `Notification ${i}`);
      }

      expect(useNotificationStore.getState().history).toHaveLength(50);
      expect(
        useNotificationStore.getState().history[0].title,
      ).toBe('Notification 59');
    });

    it('clearHistory empties the history', async () => {
      const { useNotificationStore } = await import(
        '@/store/notificationStore'
      );
      useNotificationStore.getState().notify('info', 'Test');
      useNotificationStore.getState().clearHistory();
      expect(useNotificationStore.getState().history).toEqual([]);
    });
  });

  describe('usePortfolioStore', () => {
    it('has null summary by default', async () => {
      const { usePortfolioStore } = await import(
        '@/store/portfolioStore'
      );
      expect(usePortfolioStore.getState().summary).toBeNull();
      expect(usePortfolioStore.getState().loading).toBe(false);
    });

    it('setSummary updates the state', async () => {
      const { usePortfolioStore } = await import(
        '@/store/portfolioStore'
      );
      const mockSummary = {
        cashBalance: 5000,
        cryptoValueUsd: 3000,
        totalEquity: 8000,
        usedMargin: 0,
        freeMargin: 5000,
        marginLevel: Infinity,
        dailyPnl: 100,
        overallPnl: -2000,
      };

      usePortfolioStore.getState().setSummary(mockSummary);
      expect(usePortfolioStore.getState().summary).toEqual(mockSummary);
      expect(usePortfolioStore.getState().lastRefreshed).toBeDefined();
    });
  });
});
