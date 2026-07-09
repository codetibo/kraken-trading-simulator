'use client';

import { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '@/store/notificationStore';

export interface OrderRow {
  id: string;
  assetSymbol: string;
  side: string;
  type: string;
  status: string;
  quantity: number;
  filledQuantity: number;
  limitPrice?: number;
  triggerPrice?: number;
  marketType: string;
  positionSide?: string;
  leverage?: number;
  createdAt: string;
}

export interface PositionRow {
  id: string;
  assetSymbol: string;
  side: string;
  leverage: number;
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  roe: number;
  liquidationPrice: number;
  usedMargin: number;
}

export interface TradeRow {
  id: string;
  assetSymbol: string;
  side: string;
  orderType: string;
  price: number;
  quantity: number;
  fee: number;
  pnl: number;
  executedAt: string;
}

export function useBottomPanelData() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const notify = useNotificationStore((s) => s.notify);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, historyRes, positionsRes, tradesRes] = await Promise.all([
        fetch('/api/orders/open', { cache: 'no-store' }),
        fetch('/api/orders/history', { cache: 'no-store' }),
        fetch('/api/positions', { cache: 'no-store' }),
        fetch('/api/trades/recent', { cache: 'no-store' }),
      ]);

      const [ordersData, historyData, positionsData, tradesData] = await Promise.all([
        ordersRes.json(),
        historyRes.json(),
        positionsRes.json(),
        tradesRes.json(),
      ]);

      if (ordersData.orders) setOrders(ordersData.orders);
      if (historyData.orders) setHistoryOrders(historyData.orders);
      if (positionsData.positions) setPositions(positionsData.positions);
      if (tradesData.trades) setTrades(tradesData.trades);
    } catch (err) {
      console.warn('Failed to fetch bottom panel data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleCancelOrder = useCallback(async (orderId: string, assetSymbol: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        notify('order_cancelled', 'Order Cancelled', `${assetSymbol} order cancelled`);
      }
      fetchData();
    } catch {
      notify('error', 'Cancel Failed', `Failed to cancel ${assetSymbol} order`);
    }
  }, [notify, fetchData]);

  const handleClosePosition = useCallback(async (positionId: string, assetSymbol: string) => {
    try {
      const res = await fetch(`/api/positions/${positionId}`, { method: 'DELETE' });
      if (res.ok) {
        notify('position_closed', 'Position Closed', `${assetSymbol} position closed at market`);
      }
      fetchData();
    } catch {
      notify('error', 'Close Failed', `Failed to close ${assetSymbol} position`);
    }
  }, [notify, fetchData]);

  return {
    orders,
    positions,
    trades,
    historyOrders,
    loading,
    fetchData,
    handleCancelOrder,
    handleClosePosition,
  };
}
