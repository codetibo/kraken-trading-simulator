/**
 * Core domain types for the trading simulator's business logic.
 */

export type MarketType = 'SPOT' | 'MARGIN';

export type OrderSide = 'BUY' | 'SELL';

export type PositionSide = 'LONG' | 'SHORT';

/** Top-level trading mode selector. */
export type TradingMode = 'MARKET' | 'LIMIT' | 'ADVANCED';

/** Order types available under the Advanced mode. */
export const ADVANCED_ORDER_TYPES: readonly OrderType[] = [
  'STOP_LOSS',
  'STOP_LOSS_LIMIT',
  'TAKE_PROFIT',
  'TAKE_PROFIT_LIMIT',
  'ICEBERG',
  'TRAILING_STOP',
  'TRAILING_STOP_LIMIT',
  'OCO',
] as const;

/** Map a TradingMode to its default OrderType. */
export function defaultOrderTypeForMode(mode: TradingMode): OrderType {
  switch (mode) {
    case 'MARKET': return 'MARKET';
    case 'LIMIT': return 'LIMIT';
    case 'ADVANCED': return 'STOP_LOSS';
  }
}

/** Derive the TradingMode from an OrderType. */
export function tradingModeForOrderType(type: OrderType): TradingMode {
  if (type === 'MARKET') return 'MARKET';
  if (type === 'LIMIT') return 'LIMIT';
  return 'ADVANCED';
}

export type OrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'STOP_LOSS'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_LIMIT'
  | 'TRAILING_STOP'
  | 'TRAILING_STOP_LIMIT'
  | 'ICEBERG'
  | 'TWAP'
  | 'OCO'
  | 'SETTLE_POSITION'
  | 'POST_ONLY_LIMIT'
  | 'REDUCE_ONLY';

export type OrderStatus =
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'TRIGGERED'
  | 'REJECTED';

type TrailingOffsetType = 'PERCENT' | 'FIXED';

type TriggerType = 'LAST_PRICE' | 'INDEX_PRICE' | 'MARK_PRICE';

type TriggerDirection = 'ABOVE' | 'BELOW';

type TimeInForce =
  | 'GTC' // Good Till Cancelled
  | 'IOC' // Immediate Or Cancel
  | 'FOK' // Fill Or Kill
  | 'GTD'; // Good Till Date

type SelfTradePrevention = 'CANCEL_OLDEST' | 'CANCEL_NEWEST' | 'CANCEL_BOTH';

export type ExecutionType =
  | 'Market'
  | 'Limit'
  | 'Conditional'
  | 'Algorithmic'
  | 'Settlement'
  | 'Restriction';

interface OrderTypeConfig {
  id: OrderType;
  label: string;

  requiresLimitPrice?: boolean;
  requiresTriggerPrice?: boolean;

  supportsMargin?: boolean;

  supportsTrailing?: boolean;
  supportsIceberg?: boolean;

  supportsConditionalClose?: boolean;

  supportsPostOnly?: boolean;
  supportsReduceOnly?: boolean;

  requiresVisibleQuantity?: boolean;

  requiresTwapDuration?: boolean;
  requiresTwapSlices?: boolean;

  requiresSecondTrigger?: boolean;
  requiresSecondLimit?: boolean;
}

/** Unified order model */

interface OrderInput {
  userId: string;

  assetSymbol: string;

  marketType: MarketType;

  side: OrderSide;

  type: OrderType;

  quantity: number;

  // Margin

  positionSide?: PositionSide;

  leverage?: number;

  // Prices

  limitPrice?: number;

  triggerPrice?: number;

  secondTriggerPrice?: number;

  secondLimitPrice?: number;

  // Trailing

  trailingOffsetType?: TrailingOffsetType;

  trailingOffsetValue?: number;

  trailingLimitOffset?: number;

  // Iceberg

  visibleQuantity?: number;

  // TWAP

  twapDurationSeconds?: number;

  twapSlices?: number;

  // Advanced

  timeInForce?: TimeInForce;

  expiresAt?: Date;

  triggerType?: TriggerType;

  triggerDirection?: TriggerDirection;

  postOnly?: boolean;

  reduceOnly?: boolean;

  selfTradePrevention?: SelfTradePrevention;

  // Conditional Close

  conditionalTakeProfit?: number;

  conditionalStopLoss?: number;
}

export interface OrderRecord extends OrderInput {
  id: string;

  status: OrderStatus;

  executionType?: ExecutionType;

  filledQuantity: number;

  averageFillPrice?: number;

  feePaid: number;

  trailingHighWater?: number;

  // ICEBERG: visible quantity per chunk
  visibleQuantity?: number;

  // TWAP parameters
  twapDurationSeconds?: number;
  twapSlices?: number;
  twapExecutedSlices?: number;

  // OCO secondary prices
  secondTriggerPrice?: number;
  secondLimitPrice?: number;

  // Modifiers
  postOnly?: boolean;
  reduceOnly?: boolean;
  timeInForce?: TimeInForce;
  triggerType?: TriggerType;

  triggeredOrderId?: string;

  createdAt: Date;

  updatedAt: Date;
}

export interface FillResult {
  filledQuantity: number;

  fillPrice: number;

  fee: number;

  remainingQuantity: number;

  isFullyFilled: boolean;
}

export interface FeeSchedule {
  makerFeeBps: number;

  takerFeeBps: number;
}

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  makerFeeBps: 16,
  takerFeeBps: 26,
};

export const ALLOWED_LEVERAGE = [2, 3, 5, 10] as const;

type Leverage = (typeof ALLOWED_LEVERAGE)[number];

export function isValidLeverage(leverage: number): leverage is Leverage {
  return (ALLOWED_LEVERAGE as readonly number[]).includes(leverage);
}

export const ORDER_TYPES: readonly OrderTypeConfig[] = [
  {
    id: 'MARKET',
    label: 'Market',
    supportsMargin: true,
    supportsConditionalClose: true,
  },

  {
    id: 'LIMIT',
    label: 'Limit',
    requiresLimitPrice: true,
    supportsMargin: true,
    supportsPostOnly: true,
    supportsConditionalClose: true,
  },

  {
    id: 'STOP_LOSS',
    label: 'Stop Loss',
    requiresTriggerPrice: true,
    supportsMargin: true,
    supportsConditionalClose: true,
  },

  {
    id: 'STOP_LOSS_LIMIT',
    label: 'Stop Loss Limit',
    requiresTriggerPrice: true,
    requiresLimitPrice: true,
    supportsMargin: true,
    supportsPostOnly: true,
    supportsConditionalClose: true,
  },

  {
    id: 'TAKE_PROFIT',
    label: 'Take Profit',
    requiresTriggerPrice: true,
    supportsMargin: true,
    supportsConditionalClose: true,
  },

  {
    id: 'TAKE_PROFIT_LIMIT',
    label: 'Take Profit Limit',
    requiresTriggerPrice: true,
    requiresLimitPrice: true,
    supportsMargin: true,
    supportsPostOnly: true,
    supportsConditionalClose: true,
  },

  {
    id: 'TRAILING_STOP',
    label: 'Trailing Stop',
    requiresTriggerPrice: true,
    supportsTrailing: true,
    supportsMargin: true,
    supportsConditionalClose: true,
  },

  {
    id: 'TRAILING_STOP_LIMIT',
    label: 'Trailing Stop Limit',
    requiresTriggerPrice: true,
    requiresLimitPrice: true,
    supportsTrailing: true,
    supportsMargin: true,
    supportsConditionalClose: true,
  },

  {
    id: 'ICEBERG',
    label: 'Iceberg',
    requiresLimitPrice: true,
    requiresVisibleQuantity: true,
    supportsIceberg: true,
    supportsMargin: true,
    supportsPostOnly: true,
  },

  {
    id: 'TWAP',
    label: 'TWAP',
    requiresTwapDuration: true,
    requiresTwapSlices: true,
    supportsMargin: true,
    supportsConditionalClose: true,
  },

  {
    id: 'OCO',
    label: 'One Cancels the Other',
    requiresTriggerPrice: true,
    requiresLimitPrice: true,
    requiresSecondTrigger: true,
    requiresSecondLimit: true,
    supportsMargin: true,
    supportsConditionalClose: true,
  },

  {
    id: 'SETTLE_POSITION',
    label: 'Settle Position',
    supportsMargin: true,
    supportsReduceOnly: true,
  },

  {
    id: 'POST_ONLY_LIMIT',
    label: 'Post Only Limit',
    requiresLimitPrice: true,
    supportsMargin: true,
    supportsPostOnly: true,
  },

  {
    id: 'REDUCE_ONLY',
    label: 'Reduce Only',
    supportsMargin: true,
    supportsReduceOnly: true,
    supportsConditionalClose: true,
  },
] as const;

export function getOrderTypeConfig(type: OrderType): OrderTypeConfig {
  const config = ORDER_TYPES.find(o => o.id === type);

  if (!config) {
    throw new Error(`Unknown order type: ${type}`);
  }

  return config;
}
