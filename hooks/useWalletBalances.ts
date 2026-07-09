'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSelectedAsset } from '@/components/trade/AssetProvider';

export function useWalletBalances() {
  const { selectedAsset } = useSelectedAsset();
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [assetHolding, setAssetHolding] = useState<number | null>(null);

  const refreshBalances = useCallback(async () => {
    try {
      const [walletRes, holdingRes] = await Promise.all([
        fetch('/api/portfolio', { cache: 'no-store' }),
        fetch('/api/holdings', { cache: 'no-store' }),
      ]);
      const walletData = await walletRes.json();
      if (walletData?.summary?.cashBalance != null) {
        setCashBalance(walletData.summary.cashBalance);
      }
      const baseSymbol = selectedAsset.split('/')[0];
      if (holdingRes.ok) {
        const holdingData = await holdingRes.json();
        if (holdingData.holdings && Array.isArray(holdingData.holdings)) {
          const found = holdingData.holdings.find(
            (h: { baseSymbol: string; quantity: number }) => h.baseSymbol === baseSymbol,
          );
          setAssetHolding(found ? found.quantity : 0);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh balances:', err);
    }
  }, [selectedAsset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBalances();
  }, [refreshBalances]);

  return { cashBalance, assetHolding, refreshBalances };
}
