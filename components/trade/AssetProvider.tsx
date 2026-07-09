'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { startPortfolioPolling } from '@/store/portfolioStore';

interface AssetContextType {
  selectedAsset: string;
  setSelectedAsset: (asset: string) => void;
}

const AssetContext = createContext<AssetContextType>({
  selectedAsset: 'BTC/USD',
  setSelectedAsset: () => {},
});

export function useSelectedAsset() {
  return useContext(AssetContext);
}

export function AssetProvider({ children }: { children: ReactNode }) {
  const [selectedAsset, setSelectedAsset] = useState('BTC/USD');

  // Start portfolio polling so portfolio data stays fresh
  // while the user is on the trade page
  useEffect(() => {
    const cleanup = startPortfolioPolling(5000);
    return () => cleanup();
  }, []);

  return (
    <AssetContext.Provider value={{ selectedAsset, setSelectedAsset }}>
      {children}
    </AssetContext.Provider>
  );
}
