/**
 * Convert a TP/SL trigger criterion to an equivalent trigger price.
 *
 * For Take Profit:
 *   LONG  PERCENT → entry * (1 + percent / 100)
 *   LONG  PNL_USD → entry + (pnlUsd / quantity)
 *   LONG  PRICE   → value (direct)
 *   SHORT PERCENT → entry * (1 - percent / 100)
 *   SHORT PNL_USD → entry - (pnlUsd / quantity)
 *   SHORT PRICE   → value (direct)
 *
 * For Stop Loss:
 *   LONG  PERCENT → entry * (1 - percent / 100)
 *   LONG  PNL_USD → entry - (pnlUsd / quantity)
 *   LONG  PRICE   → value (direct)
 *   SHORT PERCENT → entry * (1 + percent / 100)
 *   SHORT PNL_USD → entry + (pnlUsd / quantity)
 *   SHORT PRICE   → value (direct)
 *
 * @returns The computed trigger price, or 0 if calculation is not possible.
 */

export type SimpleTriggerType = 'PERCENT' | 'PNL_USD' | 'PRICE';
export type PositionSide = 'LONG' | 'SHORT';

export function convertSimpleTriggerToPrice(
  triggerType: SimpleTriggerType,
  triggerValue: number,
  entryPrice: number,
  quantity: number,
  positionSide: PositionSide,
  isTakeProfit: boolean,
): number {
  if (!triggerValue || !entryPrice) return 0;

  if (triggerType === 'PRICE') {
    return triggerValue;
  }

  const isLong = positionSide === 'LONG';

  if (triggerType === 'PERCENT') {
    const multiplier = triggerValue / 100;
    if (isTakeProfit) {
      return isLong
        ? entryPrice * (1 + multiplier)
        : entryPrice * (1 - multiplier);
    } else {
      // Stop Loss
      return isLong
        ? entryPrice * (1 - multiplier)
        : entryPrice * (1 + multiplier);
    }
  }

  // PNL_USD
  if (!quantity) return 0;
  const priceOffset = triggerValue / quantity;
  if (isTakeProfit) {
    return isLong ? entryPrice + priceOffset : entryPrice - priceOffset;
  } else {
    // Stop Loss
    return isLong ? entryPrice - priceOffset : entryPrice + priceOffset;
  }
}

/**
 * Human-readable label for a Simple trigger type.
 */
export function simpleTriggerTypeLabel(type: SimpleTriggerType): string {
  switch (type) {
    case 'PERCENT':
      return '% Change';
    case 'PNL_USD':
      return 'P&L USD';
    case 'PRICE':
      return 'Exchange Rate';
  }
}

// ─── Advanced mode types ─────────────────────────────────

export type AdvField1 =
  | 'PROFIT_TAKING'       // Simple TAKE_PROFIT
  | 'PROFIT_TAKING_LIMIT' // TAKE_PROFIT_LIMIT
  | 'LIMIT';              // Plain LIMIT order

export type AdvField2Type = 'DISTANCE' | 'PNL';

export type AdvField3 =
  | 'STOP_LOSS_DISTANCE'       // STOP_LOSS with distance trigger
  | 'STOP_LOSS_PNL'            // STOP_LOSS with P&L trigger
  | 'STOP_LOSS_LIMIT_DISTANCE' // STOP_LOSS_LIMIT with distance
  | 'STOP_LOSS_LIMIT_PNL'      // STOP_LOSS_LIMIT with P&L
  | 'TRAILING_STOP'            // TRAILING_STOP
  | 'TRAILING_STOP_LIMIT';     // TRAILING_STOP_LIMIT

/** Result of converting Advanced mode selections to order parameters. */
export interface AdvConversionResult {
  /** Take-profit conditional order params (or null if LIMIT only). */
  tp?: { type: 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT'; triggerPrice: number; limitPrice?: number } | null;
  /** Stop-loss conditional order params. */
  sl?: {
    type: 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TRAILING_STOP' | 'TRAILING_STOP_LIMIT';
    triggerPrice?: number;
    limitPrice?: number;
    trailingOffsetType?: 'PERCENT' | 'FIXED';
    trailingOffsetValue?: number;
    trailingLimitOffset?: number;
  } | null;
}

/**
 * Convert Advanced mode field selections to concrete order parameters.
 *
 * @param field1 - Profit-taking type
 * @param field2Type - Trigger mechanism for profit-taking
 * @param field2Value - Distance or P&L value
 * @param field3 - Stop-loss type
 * @param field3Value - Distance, P&L, or offset value
 * @param field3Extra - Extra value (limit buffer or limit offset)
 * @param entryPrice - Reference entry price
 * @param quantity - Position quantity
 * @param positionSide - LONG or SHORT
 * @returns Object with tp and sl parameters to use in order submission
 */
export function convertAdvancedToOrderParams(
  field1: AdvField1,
  field2Type: AdvField2Type,
  field2Value: string,
  field3: AdvField3,
  field3Value: string,
  field3Extra: string,
  entryPrice: number,
  quantity: number,
  positionSide: PositionSide,
): AdvConversionResult {
  const fv = parseFloat(field2Value) || 0;
  const f3v = parseFloat(field3Value) || 0;
  const f3e = parseFloat(field3Extra) || 0;

  const result: AdvConversionResult = {};

  // ── Field 1: Take-Profit ───────────────────────────────
  if (field1 === 'LIMIT') {
    // LIMIT is handled as the main order itself, no conditional TP needed
    result.tp = null;
  } else if (fv > 0 && entryPrice > 0) {
    const isLong = positionSide === 'LONG';

    if (field2Type === 'DISTANCE') {
      // Distance-based trigger
      const isPct = field2Value.includes('%');
      const distance = isPct
        ? entryPrice * (fv / 100)
        : fv;
      const triggerPrice = field1 === 'PROFIT_TAKING'
        ? (isLong ? entryPrice + distance : entryPrice - distance)
        : (isLong ? entryPrice + distance : entryPrice - distance);

      if (field1 === 'PROFIT_TAKING') {
        result.tp = { type: 'TAKE_PROFIT', triggerPrice };
      } else {
        // PROFIT_TAKING_LIMIT: limit price is a % or fixed buffer inside the trigger
        const limitBuffer = f3e > 0 ? f3e : distance * 0.1; // default 10% of distance
        const limitPrice = isLong
          ? triggerPrice - limitBuffer
          : triggerPrice + limitBuffer;
        result.tp = { type: 'TAKE_PROFIT_LIMIT', triggerPrice, limitPrice: Math.abs(limitPrice) };
      }
    } else {
      // P&L-based trigger
      if (!quantity) return result;
      const priceOffset = fv / quantity;
      const triggerPrice = isLong
        ? entryPrice + priceOffset
        : entryPrice - priceOffset;

      if (field1 === 'PROFIT_TAKING') {
        result.tp = { type: 'TAKE_PROFIT', triggerPrice };
      } else {
        const limitBuffer = f3e > 0 ? f3e : priceOffset * 0.1;
        const limitPrice = isLong
          ? triggerPrice - limitBuffer
          : triggerPrice + limitBuffer;
        result.tp = { type: 'TAKE_PROFIT_LIMIT', triggerPrice, limitPrice: Math.abs(limitPrice) };
      }
    }
  }

  // ── Field 3: Stop-Loss ────────────────────────────────
  if (f3v > 0 && entryPrice > 0) {
    const isLong = positionSide === 'LONG';

    switch (field3) {
      case 'STOP_LOSS_DISTANCE': {
        const isPct = field3Value.includes('%');
        const distance = isPct ? entryPrice * (f3v / 100) : f3v;
        const triggerPrice = isLong ? entryPrice - distance : entryPrice + distance;
        result.sl = { type: 'STOP_LOSS', triggerPrice };
        break;
      }
      case 'STOP_LOSS_PNL': {
        if (!quantity) break;
        const priceOffset = f3v / quantity;
        const triggerPrice = isLong ? entryPrice - priceOffset : entryPrice + priceOffset;
        result.sl = { type: 'STOP_LOSS', triggerPrice };
        break;
      }
      case 'STOP_LOSS_LIMIT_DISTANCE': {
        const isPct = field3Value.includes('%');
        const distance = isPct ? entryPrice * (f3v / 100) : f3v;
        const triggerPrice = isLong ? entryPrice - distance : entryPrice + distance;
        // Limit buffer: extra param or default 10% of distance
        const limitBuffer = f3e > 0 ? f3e : distance * 0.1;
        const limitPrice = isLong
          ? triggerPrice + limitBuffer
          : triggerPrice - limitBuffer;
        result.sl = { type: 'STOP_LOSS_LIMIT', triggerPrice, limitPrice: Math.abs(limitPrice) };
        break;
      }
      case 'STOP_LOSS_LIMIT_PNL': {
        if (!quantity) break;
        const priceOffset = f3v / quantity;
        const triggerPrice = isLong ? entryPrice - priceOffset : entryPrice + priceOffset;
        const limitBuffer = f3e > 0 ? f3e : priceOffset * 0.1;
        const limitPrice = isLong
          ? triggerPrice + limitBuffer
          : triggerPrice - limitBuffer;
        result.sl = { type: 'STOP_LOSS_LIMIT', triggerPrice, limitPrice: Math.abs(limitPrice) };
        break;
      }
      case 'TRAILING_STOP': {
        const isPct = field3Value.includes('%');
        result.sl = {
          type: 'TRAILING_STOP',
          trailingOffsetType: isPct ? 'PERCENT' : 'FIXED',
          trailingOffsetValue: f3v,
        };
        break;
      }
      case 'TRAILING_STOP_LIMIT': {
        const isPct = field3Value.includes('%');
        result.sl = {
          type: 'TRAILING_STOP_LIMIT',
          trailingOffsetType: isPct ? 'PERCENT' : 'FIXED',
          trailingOffsetValue: f3v,
          trailingLimitOffset: f3e > 0 ? f3e : f3v * 0.1,
        };
        break;
      }
    }
  }

  return result;
}

/** Human-readable labels for Advanced mode fields. */
export const ADV_FIELD1_OPTIONS = [
  { value: 'PROFIT_TAKING' as const, label: 'Profit-Taking' },
  { value: 'PROFIT_TAKING_LIMIT' as const, label: 'Profit-Taking (Price Limits)' },
  { value: 'LIMIT' as const, label: 'Limit' },
];

export const ADV_FIELD2_OPTIONS = [
  { value: 'DISTANCE' as const, label: 'Triggering Based on Distance' },
  { value: 'PNL' as const, label: 'Redemption Based on P&L' },
];

export const ADV_FIELD3_OPTIONS = [
  { value: 'STOP_LOSS_DISTANCE' as const, label: 'Stop-Loss (Distance)' },
  { value: 'STOP_LOSS_PNL' as const, label: 'Stop-Loss (P&L)' },
  { value: 'STOP_LOSS_LIMIT_DISTANCE' as const, label: 'Limit-price stop-loss (Distance)' },
  { value: 'STOP_LOSS_LIMIT_PNL' as const, label: 'Limit-price stop-loss (P&L)' },
  { value: 'TRAILING_STOP' as const, label: 'Trailing stop' },
  { value: 'TRAILING_STOP_LIMIT' as const, label: 'Trailing Stop Limit' },
];
