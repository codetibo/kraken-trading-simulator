import { create } from 'zustand';

export type TabType = 'open' | 'history' | 'positions' | 'trades';

export interface TradeState {
  // Selected pair
  selectedPair: string;
  chartInterval: string;

  // Order form
  orderType: string;
  marketType: 'SPOT' | 'MARGIN';
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  leverage: number;

  // Bottom panel tab
  activeBottomTab: TabType;

  // Actions
  setSelectedPair: (pair: string) => void;
  setChartInterval: (interval: string) => void;
  setOrderType: (type: string) => void;
  setMarketType: (type: 'SPOT' | 'MARGIN') => void;
  setSide: (side: 'BUY' | 'SELL') => void;
  setPositionSide: (side: 'LONG' | 'SHORT') => void;
  setLeverage: (leverage: number) => void;
  setActiveBottomTab: (tab: TabType) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedPair: 'BTC/USD',
  chartInterval: '1h',
  orderType: 'MARKET',
  marketType: 'SPOT',
  side: 'BUY',
  positionSide: 'LONG',
  leverage: 2,
  activeBottomTab: 'open',

  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setChartInterval: (interval) => set({ chartInterval: interval }),
  setOrderType: (type) => set({ orderType: type }),
  setMarketType: (type) => set({ marketType: type }),
  setSide: (side) => set({ side }),
  setPositionSide: (side) => set({ positionSide: side }),
  setLeverage: (leverage) => set({ leverage }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
}));
