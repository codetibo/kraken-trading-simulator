'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelectedAsset } from '@/components/trade/AssetProvider';
import {
  MarketType,
  OrderSide,
  OrderType,
  PositionSide,
  TradingMode,
  defaultOrderTypeForMode,
  tradingModeForOrderType,
} from '@/lib/engine/types';
import { loadTradeSettings, saveTradeSettings } from '@/lib/trade-settings';

export function useTradeFormState() {
  const { selectedAsset } = useSelectedAsset();

  // Load persisted settings for the current asset
  const saved = loadTradeSettings(selectedAsset);

  // --- Persisted form state (saved to localStorage) ---
  const [marketType, setMarketType] = useState<MarketType>(
    saved.marketType as MarketType,
  );
  const [orderType, setOrderType] = useState<OrderType>(
    saved.orderType as OrderType,
  );
  const [side, setSide] = useState<OrderSide>(saved.side as OrderSide);
  const [positionSide, setPositionSide] = useState<PositionSide>(
    saved.positionSide as PositionSide,
  );
  const [leverage, setLeverage] = useState(saved.leverage);

  // --- Trading mode (Market / Limit / Advanced) ---
  const [tradingMode, setTradingModeState] = useState<TradingMode>(
    () => tradingModeForOrderType(saved.orderType as OrderType),
  );

  // Persist the user's last advanced order type so it isn't lost when
  // switching from Advanced → Market/Limit → Advanced.
  const [lastAdvancedType, setLastAdvancedType] = useState<OrderType>(() => {
    const savedType = saved.orderType as OrderType;
    if (savedType !== 'MARKET' && savedType !== 'LIMIT') {
      return savedType;
    }
    return 'STOP_LOSS';
  });

  // Track the last selected advanced order type for mode-switch restoration.
  useEffect(() => {
    if (orderType !== 'MARKET' && orderType !== 'LIMIT') {
      setLastAdvancedType(orderType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  // Wrapper: when user switches mode, also update the order type.
  // For Advanced mode, restore the last-selected advanced type instead
  // of always defaulting to STOP_LOSS.
  const setTradingMode = useCallback((mode: TradingMode) => {
    setTradingModeState(mode);
    if (mode === 'ADVANCED') {
      setOrderType(lastAdvancedType);
    } else {
      setOrderType(defaultOrderTypeForMode(mode));
    }
  }, [lastAdvancedType]);

  // --- Transient form state (reset per order) ---
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [trailingOffsetType, setTrailingOffsetType] = useState<
    'PERCENT' | 'FIXED'
  >('PERCENT');
  const [trailingOffsetValue, setTrailingOffsetValue] = useState('');
  const [trailingLimitOffset, setTrailingLimitOffset] = useState('');
  const [visibleQuantity, setVisibleQuantity] = useState('');
  const [twapDuration, setTwapDuration] = useState('');
  const [twapSlices, setTwapSlices] = useState('');
  const [secondTriggerPrice, setSecondTriggerPrice] = useState('');
  const [secondLimitPrice, setSecondLimitPrice] = useState('');

  // --- Conditional order fields (stop loss / take profit / trailing stop attached to a main order) ---
  const [conditionalStopLoss, setConditionalStopLoss] = useState('');
  const [conditionalTakeProfit, setConditionalTakeProfit] = useState('');
  const [conditionalTrailingStopEnabled, setConditionalTrailingStopEnabled] = useState(false);
  const [conditionalTrailingOffsetType, setConditionalTrailingOffsetType] = useState<
    'PERCENT' | 'FIXED'
  >('PERCENT');
  const [conditionalTrailingOffsetValue, setConditionalTrailingOffsetValue] = useState('');
  const [conditionalTrailingLimitOffset, setConditionalTrailingLimitOffset] = useState('');

  // --- TP/SL mode: 'PRICE' | 'SIMPLE' | 'ADVANCED' ---
  const [tpSlMode, setTpSlMode] = useState<'PRICE' | 'SIMPLE' | 'ADVANCED'>('PRICE');

  // --- Simple TP/SL mode trigger types and values ---
  const [simpleTpType, setSimpleTpType] = useState<'PERCENT' | 'PNL_USD' | 'PRICE'>('PRICE');
  const [simpleTpValue, setSimpleTpValue] = useState('');
  const [simpleSlType, setSimpleSlType] = useState<'PERCENT' | 'PNL_USD' | 'PRICE'>('PRICE');
  const [simpleSlValue, setSimpleSlValue] = useState('');

  // --- Advanced TP/SL mode state ---
  const [advField1, setAdvField1] = useState<'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT'>('PROFIT_TAKING');
  const [advField2Type, setAdvField2Type] = useState<'DISTANCE' | 'PNL'>('DISTANCE');
  const [advField2Value, setAdvField2Value] = useState('');
  const [advField3, setAdvField3] = useState<'STOP_LOSS_DISTANCE' | 'STOP_LOSS_PNL' | 'STOP_LOSS_LIMIT_DISTANCE' | 'STOP_LOSS_LIMIT_PNL' | 'TRAILING_STOP' | 'TRAILING_STOP_LIMIT'>('STOP_LOSS_DISTANCE');
  const [advField3Value, setAdvField3Value] = useState('');
  const [advField3Extra, setAdvField3Extra] = useState('');

  // --- UI state ---
  const [postOnly, setPostOnly] = useState(false);
  const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC' | 'FOK' | 'GTD'>(
    'GTC',
  );
  const [triggerType, setTriggerType] = useState<
    'LAST_PRICE' | 'INDEX_PRICE' | 'MARK_PRICE'
  >('LAST_PRICE');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  /** Open positions list for SETTLE_POSITION / REDUCE_ONLY */
  const [openPositions, setOpenPositions] = useState<
    Array<{ id: string; assetSymbol: string; side: string; size: number }>
  >([]);

  // Sync trading mode when orderType changes externally (e.g. asset switch)
  // Exclude setTradingModeState from deps — it's a stable setter from useState.
  useEffect(() => {
    setTradingModeState(tradingModeForOrderType(orderType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  // Reload persisted settings when asset changes
  useEffect(() => {
    const saved = loadTradeSettings(selectedAsset);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMarketType(saved.marketType as MarketType);

    setOrderType(saved.orderType as OrderType);

    setSide(saved.side as OrderSide);

    setPositionSide(saved.positionSide as PositionSide);

    setLeverage(saved.leverage);
  }, [selectedAsset]);

  // Persist settings on form changes (not on asset switch — avoids race condition)
  useEffect(() => {
    saveTradeSettings(selectedAsset, {
      marketType,
      orderType,
      side,
      positionSide,
      leverage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketType, orderType, side, positionSide, leverage]);

  // First-visit keyboard shortcuts trigger
  useEffect(() => {
    const visited = localStorage.getItem('kb-shortcuts-seen');
    if (visited) return;
    const timer = setTimeout(() => {
      setShowShortcutsHelp(true);
      localStorage.setItem('kb-shortcuts-seen', 'true');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const clearTransientFields = useCallback(() => {
    setQuantity('');
    setLimitPrice('');
    setTriggerPrice('');
    setTrailingOffsetValue('');
    setTrailingLimitOffset('');
    setConditionalStopLoss('');
    setConditionalTakeProfit('');
    setConditionalTrailingStopEnabled(false);
    setConditionalTrailingOffsetValue('');
    setConditionalTrailingLimitOffset('');
  }, []);

  return {
    // Selected asset
    selectedAsset,

    // Persisted state + setters
    marketType,
    setMarketType,
    orderType,
    setOrderType,
    side,
    setSide,
    positionSide,
    setPositionSide,
    leverage,
    setLeverage,

    // Trading mode
    tradingMode,
    setTradingMode,

    // Transient state + setters
    quantity,
    setQuantity,
    limitPrice,
    setLimitPrice,
    triggerPrice,
    setTriggerPrice,
    trailingOffsetType,
    setTrailingOffsetType,
    trailingOffsetValue,
    setTrailingOffsetValue,
    trailingLimitOffset,
    setTrailingLimitOffset,
    visibleQuantity,
    setVisibleQuantity,
    twapDuration,
    setTwapDuration,
    twapSlices,
    setTwapSlices,
    secondTriggerPrice,
    setSecondTriggerPrice,
    secondLimitPrice,
    setSecondLimitPrice,
    conditionalStopLoss,
    setConditionalStopLoss,
    conditionalTakeProfit,
    setConditionalTakeProfit,
    conditionalTrailingStopEnabled,
    setConditionalTrailingStopEnabled,
    conditionalTrailingOffsetType,
    setConditionalTrailingOffsetType,
    conditionalTrailingOffsetValue,
    setConditionalTrailingOffsetValue,
    conditionalTrailingLimitOffset,
    setConditionalTrailingLimitOffset,

    // TP/SL mode
    tpSlMode,
    setTpSlMode,
    simpleTpType,
    setSimpleTpType,
    simpleTpValue,
    setSimpleTpValue,
    simpleSlType,
    setSimpleSlType,
    simpleSlValue,
    setSimpleSlValue,

    // Advanced TP/SL mode
    advField1,
    setAdvField1,
    advField2Type,
    setAdvField2Type,
    advField2Value,
    setAdvField2Value,
    advField3,
    setAdvField3,
    advField3Value,
    setAdvField3Value,
    advField3Extra,
    setAdvField3Extra,

    // UI state + setters
    postOnly,
    setPostOnly,
    timeInForce,
    setTimeInForce,
    triggerType,
    setTriggerType,
    selectedPositionId,
    setSelectedPositionId,
    showShortcutsHelp,
    setShowShortcutsHelp,
    showCommandPalette,
    setShowCommandPalette,
    openPositions,
    setOpenPositions,

    // Actions
    clearTransientFields,
  };
}
