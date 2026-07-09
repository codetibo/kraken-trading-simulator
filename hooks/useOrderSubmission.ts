'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useNotificationStore } from '@/store/notificationStore';
import { MarketType, OrderSide, OrderType, PositionSide } from '@/lib/engine/types';
import { convertSimpleTriggerToPrice, convertAdvancedToOrderParams } from '@/lib/engine/triggerConversion';

export interface OrderSubmissionDeps {
  selectedAsset: string;
  marketType: MarketType;
  orderType: OrderType;
  side: OrderSide;
  positionSide: PositionSide;
  leverage: number;
  quantity: string;
  limitPrice: string;
  triggerPrice: string;
  trailingOffsetType: 'PERCENT' | 'FIXED';
  trailingOffsetValue: string;
  trailingLimitOffset: string;
  visibleQuantity: string;
  twapDuration: string;
  twapSlices: string;
  secondTriggerPrice: string;
  secondLimitPrice: string;
  conditionalStopLoss: string;
  conditionalTakeProfit: string;
  conditionalTrailingStopEnabled: boolean;
  conditionalTrailingOffsetType: 'PERCENT' | 'FIXED';
  conditionalTrailingOffsetValue: string;
  conditionalTrailingLimitOffset: string;
  tpSlMode: 'PRICE' | 'SIMPLE' | 'ADVANCED';
  simpleTpType: 'PERCENT' | 'PNL_USD' | 'PRICE';
  simpleTpValue: string;
  simpleSlType: 'PERCENT' | 'PNL_USD' | 'PRICE';
  simpleSlValue: string;
  advField1: 'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT';
  advField2Type: 'DISTANCE' | 'PNL';
  advField2Value: string;
  advField3: 'STOP_LOSS_DISTANCE' | 'STOP_LOSS_PNL' | 'STOP_LOSS_LIMIT_DISTANCE' | 'STOP_LOSS_LIMIT_PNL' | 'TRAILING_STOP' | 'TRAILING_STOP_LIMIT';
  advField3Value: string;
  advField3Extra: string;
  postOnly: boolean;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'GTD';
  triggerType: 'LAST_PRICE' | 'INDEX_PRICE' | 'MARK_PRICE';
  selectedPositionId: string;
  refreshBalances: () => Promise<void>;
  clearTransientFields: () => void;
  onSideChange: (side: OrderSide) => void;
  onOrderTypeChange: (type: OrderType) => void;
}

export function useOrderSubmission(deps: OrderSubmissionDeps) {
  const {
    selectedAsset, marketType, orderType, side, positionSide, leverage,
    quantity, limitPrice, triggerPrice, trailingOffsetType, trailingOffsetValue,
    trailingLimitOffset, visibleQuantity, twapDuration, twapSlices,
    secondTriggerPrice, secondLimitPrice, conditionalStopLoss, conditionalTakeProfit,
    conditionalTrailingStopEnabled, conditionalTrailingOffsetType,
    conditionalTrailingOffsetValue, conditionalTrailingLimitOffset,
    tpSlMode, simpleTpType, simpleTpValue, simpleSlType, simpleSlValue,
    advField1, advField2Type, advField2Value, advField3, advField3Value, advField3Extra,
    postOnly, timeInForce, triggerType,
    selectedPositionId, refreshBalances, clearTransientFields,
    onSideChange, onOrderTypeChange,
  } = deps;

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingSubmitRef = useRef<(() => Promise<void>) | null>(null);

  const notify = useNotificationStore(s => s.notify);

  // Fetch order confirmation setting on mount
  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.settings?.orderConfirmation !== undefined) {
          setOrderConfirmation(d.settings.orderConfirmation);
        }
      })
      .catch((err) => { console.warn('Failed to fetch order confirmation setting:', err); });
  }, []);

  // Build the order request body
  const buildRequestBody = useCallback((): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      assetSymbol: selectedAsset,
      marketType,
      side,
      type: orderType,
      quantity: parseFloat(quantity),
    };

    if (marketType === 'MARGIN') {
      body.positionSide = positionSide;
      body.leverage = leverage;
    }

    if (postOnly && orderType === 'LIMIT') {
      body.type = 'POST_ONLY_LIMIT';
    }

    const hasConditionalOrLimit =
      orderType === 'LIMIT' ||
      orderType === 'STOP_LOSS' ||
      orderType === 'TAKE_PROFIT' ||
      orderType === 'STOP_LOSS_LIMIT' ||
      orderType === 'TAKE_PROFIT_LIMIT' ||
      orderType === 'OCO';
    if (hasConditionalOrLimit) {
      body.timeInForce = timeInForce;
      body.triggerType = triggerType;
    }

    if (
      orderType === 'LIMIT' ||
      orderType === 'STOP_LOSS_LIMIT' ||
      orderType === 'TAKE_PROFIT_LIMIT' ||
      orderType === 'ICEBERG'
    ) {
      body.limitPrice = parseFloat(limitPrice);
    }
    if (
      orderType === 'STOP_LOSS' ||
      orderType === 'STOP_LOSS_LIMIT' ||
      orderType === 'TAKE_PROFIT' ||
      orderType === 'TAKE_PROFIT_LIMIT'
    ) {
      body.triggerPrice = parseFloat(triggerPrice);
    }

    if (orderType === 'TRAILING_STOP' || orderType === 'TRAILING_STOP_LIMIT') {
      body.trailingOffsetType = trailingOffsetType;
      body.trailingOffsetValue = parseFloat(trailingOffsetValue);
    }
    if (orderType === 'TRAILING_STOP_LIMIT') {
      body.trailingLimitOffset = parseFloat(trailingLimitOffset);
    }

    if (orderType === 'ICEBERG' && visibleQuantity) {
      body.visibleQuantity = parseFloat(visibleQuantity);
    }

    if (orderType === 'TWAP') {
      if (twapDuration) body.twapDurationSeconds = parseInt(twapDuration, 10);
      if (twapSlices) body.twapSlices = parseInt(twapSlices, 10);
    }

    if (orderType === 'OCO') {
      if (secondTriggerPrice) body.secondTriggerPrice = parseFloat(secondTriggerPrice);
      if (secondLimitPrice) body.secondLimitPrice = parseFloat(secondLimitPrice);
      if (limitPrice) body.limitPrice = parseFloat(limitPrice);
      if (triggerPrice) body.triggerPrice = parseFloat(triggerPrice);
    }

    if ((orderType === 'SETTLE_POSITION' || orderType === 'REDUCE_ONLY') && selectedPositionId) {
      body.positionId = selectedPositionId;
    }

    // Attach conditional stop-loss / take-profit / trailing stop to the main order
    // (only relevant for MARKET or LIMIT orders opening a position)
    //
    // For SIMPLE mode, convert %/P&L triggers to equivalent trigger prices
    // using the current entry price as reference.
    const refPrice = parseFloat(limitPrice) || 50000;
    const qty = parseFloat(quantity) || 0;

    if (tpSlMode === 'SIMPLE') {
      const tpPrice = convertSimpleTriggerToPrice(
        simpleTpType as 'PERCENT' | 'PNL_USD' | 'PRICE',
        parseFloat(simpleTpValue) || 0,
        refPrice,
        qty,
        positionSide,
        true,
      );
      if (tpPrice > 0) {
        body.conditionalTakeProfit = tpPrice;
      }
      const slPrice = convertSimpleTriggerToPrice(
        simpleSlType as 'PERCENT' | 'PNL_USD' | 'PRICE',
        parseFloat(simpleSlValue) || 0,
        refPrice,
        qty,
        positionSide,
        false,
      );
      if (slPrice > 0) {
        body.conditionalStopLoss = slPrice;
      }
    } else if (tpSlMode === 'ADVANCED') {
      const advResult = convertAdvancedToOrderParams(
        advField1,
        advField2Type,
        advField2Value,
        advField3,
        advField3Value,
        advField3Extra,
        refPrice,
        qty,
        positionSide,
      );

      if (advResult.tp) {
        body.conditionalTakeProfit = advResult.tp.triggerPrice;
        if (advResult.tp.limitPrice) {
          body.conditionalTakeProfitLimitPrice = advResult.tp.limitPrice;
        }
      }

      if (advResult.sl) {
        if (advResult.sl.type === 'STOP_LOSS' || advResult.sl.type === 'STOP_LOSS_LIMIT') {
          body.conditionalStopLoss = advResult.sl.triggerPrice;
          if (advResult.sl.limitPrice) {
            body.conditionalStopLossLimitPrice = advResult.sl.limitPrice;
          }
        } else if (advResult.sl.type === 'TRAILING_STOP' || advResult.sl.type === 'TRAILING_STOP_LIMIT') {
          body.conditionalTrailingStopEnabled = true;
          body.conditionalTrailingOffsetType = advResult.sl.trailingOffsetType;
          body.conditionalTrailingOffsetValue = advResult.sl.trailingOffsetValue;
          if (advResult.sl.trailingLimitOffset) {
            body.conditionalTrailingLimitOffset = advResult.sl.trailingLimitOffset;
          }
        }
      }
    } else {
      // PRICE mode — direct price inputs
      if (conditionalStopLoss) {
        body.conditionalStopLoss = parseFloat(conditionalStopLoss);
      }
      if (conditionalTakeProfit) {
        body.conditionalTakeProfit = parseFloat(conditionalTakeProfit);
      }
    }
    if (conditionalTrailingStopEnabled) {
      body.conditionalTrailingStopEnabled = true;
      body.conditionalTrailingOffsetType = conditionalTrailingOffsetType;
      body.conditionalTrailingOffsetValue = parseFloat(conditionalTrailingOffsetValue);
      if (conditionalTrailingLimitOffset) {
        body.conditionalTrailingLimitOffset = parseFloat(conditionalTrailingLimitOffset);
      }
    }

    return body;
  }, [
    selectedAsset, marketType, side, orderType, positionSide, leverage,
    quantity, limitPrice, triggerPrice, trailingOffsetType, trailingOffsetValue,
    trailingLimitOffset, conditionalStopLoss, conditionalTakeProfit,
    conditionalTrailingStopEnabled, conditionalTrailingOffsetType,
    conditionalTrailingOffsetValue, conditionalTrailingLimitOffset,
    tpSlMode, simpleTpType, simpleTpValue, simpleSlType, simpleSlValue,
    advField1, advField2Type, advField2Value, advField3, advField3Value, advField3Extra,
    postOnly, timeInForce, triggerType, visibleQuantity,
    twapDuration, twapSlices, secondTriggerPrice, secondLimitPrice, selectedPositionId,
  ]);

  const submitOrder = useCallback(async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const body = buildRequestBody();

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: 'Order placed successfully!' });
        clearTransientFields();
        refreshBalances();

        const orderId = data.data?.orderId;
        const orderStatus = data.orderStatus;

        if (orderId && (orderStatus === 'OPEN' || orderStatus === 'PARTIALLY_FILLED')) {
          toast('Order Placed', {
            description: `${side} ${quantity} ${selectedAsset}`,
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: async () => {
                try {
                  const cancelRes = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
                  if (cancelRes.ok) {
                    toast.success('Order Cancelled');
                    refreshBalances();
                  } else {
                    toast.error('Could not cancel — order may have been filled');
                  }
                } catch {
                  toast.error('Cancel failed');
                }
              },
            },
          });
        } else {
          notify(
            'order_filled',
            `${orderType.replace(/_/g, ' ')} ${side}`,
            `${quantity} ${selectedAsset} @ ${marketType}`,
          );
        }
      } else {
        setResult({ success: false, message: data.error || 'Order failed' });
        notify('error', 'Order Failed', data.error || 'Unknown error');
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
      notify('error', 'Order Failed', 'Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }, [buildRequestBody, orderType, side, quantity, selectedAsset, marketType, refreshBalances, notify, clearTransientFields]);

  const handleSubmit = useCallback(() => {
    if (orderConfirmation) {
      pendingSubmitRef.current = submitOrder;
      setShowConfirm(true);
    } else {
      submitOrder();
    }
  }, [orderConfirmation, submitOrder]);

  /** Quick market order — used by keyboard shortcuts (Ctrl+B / Ctrl+S). */
  const quickMarketSubmit = useCallback(
    async (targetSide: OrderSide) => {
      setSubmitting(true);
      setResult(null);
      try {
        const body: Record<string, unknown> = {
          assetSymbol: selectedAsset,
          marketType,
          side: targetSide,
          type: 'MARKET',
          quantity: parseFloat(quantity),
        };
        if (marketType === 'MARGIN') {
          body.positionSide = positionSide;
          body.leverage = leverage;
        }
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          setResult({ success: true, message: 'Order placed!' });
          clearTransientFields();
          refreshBalances();
          onSideChange(targetSide);
          onOrderTypeChange('MARKET');
          notify(
            'order_filled',
            `Market ${targetSide}`,
            `${quantity} ${selectedAsset} @ ${marketType}`,
          );
        } else {
          setResult({ success: false, message: data.error || 'Order failed' });
          notify('error', 'Order Failed', data.error || 'Unknown error');
        }
      } catch {
        setResult({ success: false, message: 'Network error' });
        notify('error', 'Order Failed', 'Network error');
      } finally {
        setSubmitting(false);
      }
    },
    [selectedAsset, marketType, positionSide, leverage, quantity, refreshBalances, notify, clearTransientFields, onSideChange, onOrderTypeChange],
  );

  const onConfirmSubmit = useCallback(async () => {
    const fn = pendingSubmitRef.current;
    pendingSubmitRef.current = null;
    setShowConfirm(false);
    await fn?.();
  }, []);

  const onConfirmCancel = useCallback(() => {
    pendingSubmitRef.current = null;
    setShowConfirm(false);
  }, []);

  return {
    submitting,
    result,
    showConfirm,
    orderConfirmation,
    setResult,
    setShowConfirm,
    handleSubmit,
    quickMarketSubmit,
    buildRequestBody,
    onConfirmSubmit,
    onConfirmCancel,
  };
}
