'use client';

import { memo, useCallback, useMemo } from 'react';
import { useSelectedAsset } from './AssetProvider';
import { OrderType } from '@/lib/engine/types';
import { useTradeFormState } from '@/hooks/useTradeFormState';
import { useOrderSubmission } from '@/hooks/useOrderSubmission';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { CommandPalette } from './CommandPalette';

import { OrderEntryHeader } from './order-entry/OrderEntryHeader';
import { SideSelector } from './order-entry/SideSelector';
import { MarketTypeSelector } from './order-entry/MarketTypeSelector';
import { OrderFormInputs } from './order-entry/OrderFormInputs';
import { OrderSettings } from './order-entry/OrderSettings';
import { MarginPreview } from './order-entry/MarginPreview';
import { OrderActions } from './order-entry/OrderActions';

export const OrderEntry = memo(function OrderEntry() {
  const { selectedAsset } = useSelectedAsset();

  // --- Form state ---
  const form = useTradeFormState();

  // --- Wallet balances ---
  const { cashBalance, assetHolding, refreshBalances } = useWalletBalances();

  // --- Order submission ---
  const submission = useOrderSubmission({
    selectedAsset,
    marketType: form.marketType,
    orderType: form.orderType,
    side: form.side,
    positionSide: form.positionSide,
    leverage: form.leverage,
    quantity: form.quantity,
    limitPrice: form.limitPrice,
    triggerPrice: form.triggerPrice,
    trailingOffsetType: form.trailingOffsetType,
    trailingOffsetValue: form.trailingOffsetValue,
    trailingLimitOffset: form.trailingLimitOffset,
    visibleQuantity: form.visibleQuantity,
    twapDuration: form.twapDuration,
    twapSlices: form.twapSlices,
    secondTriggerPrice: form.secondTriggerPrice,
    secondLimitPrice: form.secondLimitPrice,
    conditionalStopLoss: form.conditionalStopLoss,
    conditionalTakeProfit: form.conditionalTakeProfit,
    conditionalTrailingStopEnabled: form.conditionalTrailingStopEnabled,
    conditionalTrailingOffsetType: form.conditionalTrailingOffsetType,
    conditionalTrailingOffsetValue: form.conditionalTrailingOffsetValue,
    conditionalTrailingLimitOffset: form.conditionalTrailingLimitOffset,
    tpSlMode: form.tpSlMode,
    simpleTpType: form.simpleTpType,
    simpleTpValue: form.simpleTpValue,
    simpleSlType: form.simpleSlType,
    simpleSlValue: form.simpleSlValue,
    advField1: form.advField1,
    advField2Type: form.advField2Type,
    advField2Value: form.advField2Value,
    advField3: form.advField3,
    advField3Value: form.advField3Value,
    advField3Extra: form.advField3Extra,
    postOnly: form.postOnly,
    timeInForce: form.timeInForce,
    triggerType: form.triggerType,
    selectedPositionId: form.selectedPositionId,
    refreshBalances,
    clearTransientFields: form.clearTransientFields,
    onSideChange: form.setSide,
    onOrderTypeChange: form.setOrderType,
  });

  // --- Keyboard shortcuts ---
  const shortcutHandlers = useMemo(
    () => ({
      onBuyMarket: () => submission.quickMarketSubmit('BUY'),
      onSellMarket: () => submission.quickMarketSubmit('SELL'),
      onSetLeverage: (lev: number) => form.setLeverage(lev),
      onSubmit: submission.handleSubmit,
      onDismiss: () => {
        submission.setShowConfirm(false);
        submission.setResult(null);
        form.setShowCommandPalette(false);
      },
      onToggleHelp: () => form.setShowShortcutsHelp(v => !v),
      onToggleCommandPalette: () => form.setShowCommandPalette(v => !v),
    }),
    [submission.quickMarketSubmit, submission.handleSubmit, submission.setShowConfirm, submission.setResult,
     form.setLeverage, form.setShowShortcutsHelp, form.setShowCommandPalette],
  );

  useKeyboardShortcuts(shortcutHandlers, true);

  // --- Refresh positions for SETTLE_POSITION / REDUCE_ONLY ---
  const refreshPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/positions', { cache: 'no-store' });
      const data = await res.json();
      if (data.positions) form.setOpenPositions(data.positions);
    } catch (err) {
      console.warn('Failed to refresh positions:', err);
    }
  }, [form.setOpenPositions]);

  // Determine if submit should be disabled
  const cannotSubmit =
    !form.quantity ||
    (form.marketType === 'SPOT' &&
      form.side === 'SELL' &&
      assetHolding !== null &&
      parseFloat(form.quantity || '0') > assetHolding);

  return (
    <div className='flex h-full flex-col'>
      <OrderEntryHeader
        selectedAsset={selectedAsset}
        onShowShortcuts={() => form.setShowShortcutsHelp(true)}
      />

      <div className='flex-1 overflow-y-auto p-3'>
        {/* Spot/Margin Toggle, Order Type, Leverage */}
        <MarketTypeSelector
          marketType={form.marketType}
          orderType={form.orderType}
          tradingMode={form.tradingMode}
          positionSide={form.positionSide}
          leverage={form.leverage}
          onMarketTypeChange={(v) => { form.setMarketType(v); form.setPostOnly(false); }}
          onTradingModeChange={(v) => { form.setTradingMode(v); form.setPostOnly(false); }}
          onOrderTypeChange={(v) => { form.setOrderType(v as OrderType); form.setPostOnly(false); }}
          onPositionSideChange={form.setPositionSide}
          onLeverageChange={form.setLeverage}
        />

        {/* Buy/Sell Buttons */}
        <SideSelector
          side={form.side}
          onSideChange={form.setSide}
        />

        {/* Order Form Inputs */}
        <OrderFormInputs
          marketType={form.marketType}
          orderType={form.orderType}
          side={form.side}
          selectedAsset={selectedAsset}
          quantity={form.quantity}
          limitPrice={form.limitPrice}
          triggerPrice={form.triggerPrice}
          trailingOffsetType={form.trailingOffsetType}
          trailingOffsetValue={form.trailingOffsetValue}
          trailingLimitOffset={form.trailingLimitOffset}
          visibleQuantity={form.visibleQuantity}
          twapDuration={form.twapDuration}
          twapSlices={form.twapSlices}
          secondTriggerPrice={form.secondTriggerPrice}
          secondLimitPrice={form.secondLimitPrice}
          cashBalance={cashBalance}
          assetHolding={assetHolding}
          onQuantityChange={form.setQuantity}
          onLimitPriceChange={form.setLimitPrice}
          onTriggerPriceChange={form.setTriggerPrice}
          onTrailingOffsetTypeChange={form.setTrailingOffsetType}
          onTrailingOffsetValueChange={form.setTrailingOffsetValue}
          onTrailingLimitOffsetChange={form.setTrailingLimitOffset}
          onVisibleQuantityChange={form.setVisibleQuantity}
          onTwapDurationChange={form.setTwapDuration}
          onTwapSlicesChange={form.setTwapSlices}
          onSecondTriggerPriceChange={form.setSecondTriggerPrice}
          onSecondLimitPriceChange={form.setSecondLimitPrice}
        />

        {/* Advanced Settings */}
        <OrderSettings
          orderType={form.orderType}
          postOnly={form.postOnly}
          timeInForce={form.timeInForce}
          triggerType={form.triggerType}
          selectedPositionId={form.selectedPositionId}
          openPositions={form.openPositions}
          onPostOnlyChange={form.setPostOnly}
          onTimeInForceChange={form.setTimeInForce}
          onTriggerTypeChange={form.setTriggerType}
          onSelectedPositionIdChange={form.setSelectedPositionId}
          onRefreshPositions={refreshPositions}
        />

        {/* Margin Preview & Risk Management */}
        <MarginPreview
          marketType={form.marketType}
          orderType={form.orderType}
          positionSide={form.positionSide}
          selectedAsset={selectedAsset}
          quantity={form.quantity}
          limitPrice={form.limitPrice}
          triggerPrice={form.triggerPrice}
          leverage={form.leverage}
          cashBalance={cashBalance}
          timeInForce={form.timeInForce}
          stopLossPrice={form.conditionalStopLoss}
          takeProfitPrice={form.conditionalTakeProfit}
          onStopLossPriceChange={form.setConditionalStopLoss}
          onTakeProfitPriceChange={form.setConditionalTakeProfit}
          trailingStopEnabled={form.conditionalTrailingStopEnabled}
          onTrailingStopEnabledChange={form.setConditionalTrailingStopEnabled}
          trailingOffsetType={form.conditionalTrailingOffsetType}
          onTrailingOffsetTypeChange={form.setConditionalTrailingOffsetType}
          trailingOffsetValue={form.conditionalTrailingOffsetValue}
          onTrailingOffsetValueChange={form.setConditionalTrailingOffsetValue}
          trailingLimitOffset={form.conditionalTrailingLimitOffset}
          onTrailingLimitOffsetChange={form.setConditionalTrailingLimitOffset}
          tpSlMode={form.tpSlMode}
          onTpSlModeChange={form.setTpSlMode}
          simpleTpType={form.simpleTpType}
          onSimpleTpTypeChange={form.setSimpleTpType}
          simpleTpValue={form.simpleTpValue}
          onSimpleTpValueChange={form.setSimpleTpValue}
          simpleSlType={form.simpleSlType}
          onSimpleSlTypeChange={form.setSimpleSlType}
          simpleSlValue={form.simpleSlValue}
          onSimpleSlValueChange={form.setSimpleSlValue}
          advField1={form.advField1}
          onAdvField1Change={form.setAdvField1}
          advField2Type={form.advField2Type}
          onAdvField2TypeChange={form.setAdvField2Type}
          advField2Value={form.advField2Value}
          onAdvField2ValueChange={form.setAdvField2Value}
          advField3={form.advField3}
          onAdvField3Change={form.setAdvField3}
          advField3Value={form.advField3Value}
          onAdvField3ValueChange={form.setAdvField3Value}
          advField3Extra={form.advField3Extra}
          onAdvField3ExtraChange={form.setAdvField3Extra}
        />

        {/* Submit, Warnings, Result, Confirm Dialog */}
        <OrderActions
          submitting={submission.submitting}
          result={submission.result}
          showConfirm={submission.showConfirm}
          orderType={form.orderType}
          side={form.side}
          marketType={form.marketType}
          positionSide={form.positionSide}
          selectedAsset={selectedAsset}
          quantity={form.quantity}
          limitPrice={form.limitPrice}
          triggerPrice={form.triggerPrice}
          leverage={form.leverage}
          cashBalance={cashBalance}
          assetHolding={assetHolding}
          canSubmit={!cannotSubmit}
          onConfirm={submission.handleSubmit}
          onConfirmDialogClose={submission.onConfirmCancel}
          onConfirmPlace={submission.onConfirmSubmit}
        />
      </div>

      {/* Keyboard Shortcuts Help Overlay */}
      <KeyboardShortcutsHelp
        open={form.showShortcutsHelp}
        onClose={() => form.setShowShortcutsHelp(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        open={form.showCommandPalette}
        onClose={() => form.setShowCommandPalette(false)}
      />
    </div>
  );
});
