import type {
  FeeSchedule,
  FillResult,
  OrderRecord,
  OrderSide,
  OrderStatus,
} from './types';
import { DEFAULT_FEE_SCHEDULE } from './types';
import type { PriceFeedProvider } from './priceFeed/PriceFeedProvider';

/**
 * Simple matching engine for the simulator.
 *
 * Principles (based on the spec's order lifecycle diagram):
 *   MARKET            -> executes immediately at current price (taker fee)
 *   LIMIT             -> executes only when price reaches/exceeds the limit
 *                        price according to order direction (maker fee)
 *   STOP_LOSS         -> activates when price hits the trigger price,
 *                        then executes as MARKET
 *   STOP_LOSS_LIMIT   -> activates at trigger price, then behaves as LIMIT
 *                        at the specified limit price
 *   TAKE_PROFIT       -> like STOP_LOSS but with opposite logic
 *   TAKE_PROFIT_LIMIT -> like STOP_LOSS_LIMIT with TP logic
 *   TRAILING_STOP     -> trigger price trails the best price by the offset
 *   TRAILING_STOP_LIMIT -> trailing activation + limit execution
 *   ICEBERG           -> large order in visible chunks at limit price
 *   TWAP              -> time-distributed execution
 *   OCO               -> two limit/trigger pairs — one activates, the other cancels
 *   SETTLE_POSITION   -> close position at market price
 *   POST_ONLY_LIMIT   -> LIMIT that only executes as maker (rejected as taker)
 *   REDUCE_ONLY       -> position-reducing order only
 */

/** Input context for evaluating a single order against the current price. */
export interface MatchContext {
  /** The order to evaluate. Must have status OPEN or PARTIALLY_FILLED. */
  order: OrderRecord;
  /** Current market price of the order's asset. */
  currentPrice: number;
  /** Optional fee schedule override. Defaults to DEFAULT_FEE_SCHEDULE. */
  feeSchedule?: FeeSchedule;
}

/**
 * Result of a single order evaluation tick.
 *
 * Every outcome has exactly one of three paths:
 *   1. shouldExecute=true + fill present — order was filled (partially or fully)
 *   2. shouldTrigger=true — order triggered and needs a child order (stop/trailing)
 *   3. both false — no action taken (price not at limit, not triggered, etc.)
 */
export interface MatchOutcome {
  /** Whether the order should execute a fill at this tick. */
  shouldExecute: boolean;
  /** Whether a stop/trailing/oco order was triggered and needs a child order created. */
  shouldTrigger: boolean;
  /** OCO: the other leg of the pair should be cancelled. */
  shouldCancel?: boolean;
  /** The fill result, present when shouldExecute is true. */
  fill?: FillResult;
  /** The new status for the order after this tick. */
  newStatus: OrderStatus;
  /** Updated high-water mark for trailing stop orders. */
  updatedTrailingHighWater?: number;
  /** ICEBERG: quantity filled in this specific tick (may differ from total filled). */
  icebergFillAmount?: number;
  /** TWAP: whether a slice was executed in this tick. */
  twapSliceExecuted?: boolean;
  /** OCO: which leg triggered ('first' or 'second'). */
  ocoLeg?: 'first' | 'second';
  /** If the order was rejected, the reason why. */
  rejectReason?: string;
}

/**
 * Evaluate a single order against the current market price.
 *
 * Dispatches to the appropriate handler based on order type:
 *   - MARKET, SETTLE_POSITION, REDUCE_ONLY → immediate fill (taker fee)
 *   - LIMIT, POST_ONLY_LIMIT → conditional fill (maker fee)
 *   - STOP_LOSS, TAKE_PROFIT, STOP_LOSS_LIMIT, TAKE_PROFIT_LIMIT → trigger evaluation
 *   - TRAILING_STOP, TRAILING_STOP_LIMIT → dynamic trailing trigger
 *   - ICEBERG → partial visible-quantity fill
 *   - TWAP → time-sliced execution
 *   - OCO → handled at server level as two linked TAKE_PROFIT + STOP_LOSS orders
 *
 * @param ctx - Match context containing order, currentPrice, and optional feeSchedule.
 * @returns MatchOutcome indicating what action (if any) should be taken.
 *
 * Edge cases:
 *   - Zero quantity: executes at 0 fill with 0 fee.
 *   - Negative price: fills at that price (matches engine behavior).
 *   - LIMIT at exactly current price: fills at min/max of limit and current.
 *   - POST_ONLY_LIMIT that would execute as taker: REJECTED.
 *   - Already-filled orders: noAction (status unchanged).
 */
export function evaluateOrder(ctx: MatchContext): MatchOutcome {
  const { order, currentPrice } = ctx;
  const feeSchedule = ctx.feeSchedule ?? DEFAULT_FEE_SCHEDULE;

  switch (order.type) {
    case 'MARKET':
      return executeFill(order, currentPrice, feeSchedule, 'taker');

    case 'LIMIT':
    case 'POST_ONLY_LIMIT': {
      const canFill = isLimitTriggered(
        order.side,
        order.limitPrice!,
        currentPrice,
      );
      if (!canFill) {
        return noAction(order);
      }
      // POST_ONLY_LIMIT: if the market price is at or better than the limit,
      // it would execute immediately → would be a taker → reject
      if (order.type === 'POST_ONLY_LIMIT') {
        const wouldBeTaker =
          order.side === 'BUY'
            ? currentPrice <= order.limitPrice!
            : currentPrice >= order.limitPrice!;
        if (wouldBeTaker) {
          return {
            shouldExecute: false,
            shouldTrigger: false,
            newStatus: 'REJECTED',
            rejectReason: 'Post-only order would execute immediately as taker',
          };
        }
        // If not a taker, behaves as a limit order
        return executeFill(order, currentPrice, feeSchedule, 'maker');
      }

      const execPrice =
        order.side === 'BUY'
          ? Math.min(order.limitPrice!, currentPrice)
          : Math.max(order.limitPrice!, currentPrice);
      return executeFill(order, execPrice, feeSchedule, 'maker');
    }

    case 'STOP_LOSS': {
      const triggered = isStopTriggered(
        order.side,
        order.triggerPrice!,
        currentPrice,
      );
      if (!triggered) return noAction(order);
      return { shouldExecute: false, shouldTrigger: true, newStatus: 'TRIGGERED' };
    }

    case 'TAKE_PROFIT': {
      const triggered = isTakeProfitTriggered(
        order.side,
        order.triggerPrice!,
        currentPrice,
      );
      if (!triggered) return noAction(order);
      return { shouldExecute: false, shouldTrigger: true, newStatus: 'TRIGGERED' };
    }

    case 'STOP_LOSS_LIMIT': {
      const triggered = isStopTriggered(
        order.side,
        order.triggerPrice!,
        currentPrice,
      );
      if (!triggered) return noAction(order);
      return { shouldExecute: false, shouldTrigger: true, newStatus: 'TRIGGERED' };
    }

    case 'TAKE_PROFIT_LIMIT': {
      const triggered = isTakeProfitTriggered(
        order.side,
        order.triggerPrice!,
        currentPrice,
      );
      if (!triggered) return noAction(order);
      return { shouldExecute: false, shouldTrigger: true, newStatus: 'TRIGGERED' };
    }

    case 'TRAILING_STOP':
    case 'TRAILING_STOP_LIMIT': {
      return evaluateTrailing(order, currentPrice, feeSchedule);
    }

    case 'ICEBERG': {
      return evaluateIceberg(order, currentPrice, feeSchedule);
    }

    case 'TWAP': {
      return evaluateTwap(order, currentPrice);
    }

    // OCO is handled by creating two separate linked orders (TAKE_PROFIT + STOP_LOSS)
    // in the server action. Both legs evaluate independently.
    // SETTLE_POSITION and REDUCE_ONLY behave as MARKET orders here.
    // The server action handles the position-specific logic.
    case 'SETTLE_POSITION':
    case 'REDUCE_ONLY':
      return executeFill(order, currentPrice, feeSchedule, 'taker');

    default:
      return noAction(order);
  }
}

// ─── Helper functions ─────────────────────────────────────────

function noAction(order: OrderRecord): MatchOutcome {
  return {
    shouldExecute: false,
    shouldTrigger: false,
    newStatus: order.status,
  };
}

function executeFill(
  order: OrderRecord,
  price: number,
  feeSchedule: FeeSchedule,
  liquidity: 'maker' | 'taker',
): MatchOutcome {
  const remainingQty = order.quantity - order.filledQuantity;
  const feeBps =
    liquidity === 'maker' ? feeSchedule.makerFeeBps : feeSchedule.takerFeeBps;
  const notional = remainingQty * price;
  const fee = notional * (feeBps / 10_000);

  const fill: FillResult = {
    filledQuantity: remainingQty,
    fillPrice: price,
    fee,
    remainingQuantity: 0,
    isFullyFilled: true,
  };

  return {
    shouldExecute: true,
    shouldTrigger: false,
    fill,
    newStatus: 'FILLED',
  };
}

function isLimitTriggered(
  side: OrderSide,
  limitPrice: number,
  currentPrice: number,
): boolean {
  return side === 'BUY'
    ? currentPrice <= limitPrice
    : currentPrice >= limitPrice;
}

function isStopTriggered(
  side: OrderSide,
  triggerPrice: number,
  currentPrice: number,
): boolean {
  return side === 'SELL'
    ? currentPrice <= triggerPrice
    : currentPrice >= triggerPrice;
}

function isTakeProfitTriggered(
  side: OrderSide,
  triggerPrice: number,
  currentPrice: number,
): boolean {
  return side === 'SELL'
    ? currentPrice >= triggerPrice
    : currentPrice <= triggerPrice;
}

function evaluateTrailing(
  order: OrderRecord,
  currentPrice: number,
  feeSchedule: FeeSchedule,
): MatchOutcome {
  const offsetType = order.trailingOffsetType ?? 'PERCENT';
  const offsetValue = order.trailingOffsetValue ?? 0;

  const prevHighWater = order.trailingHighWater ?? currentPrice;
  const newHighWater =
    order.side === 'SELL'
      ? Math.max(prevHighWater, currentPrice)
      : Math.min(prevHighWater, currentPrice);

  const offset =
    offsetType === 'PERCENT' ? newHighWater * (offsetValue / 100) : offsetValue;

  const dynamicTriggerPrice =
    order.side === 'SELL' ? newHighWater - offset : newHighWater + offset;

  const triggered =
    order.side === 'SELL'
      ? currentPrice <= dynamicTriggerPrice
      : currentPrice >= dynamicTriggerPrice;

  if (!triggered) {
    return {
      shouldExecute: false,
      shouldTrigger: false,
      newStatus: order.status,
      updatedTrailingHighWater: newHighWater,
    };
  }

  if (order.type === 'TRAILING_STOP') {
    return executeFill(order, currentPrice, feeSchedule, 'taker');
  }

  return {
    shouldExecute: false,
    shouldTrigger: true,
    newStatus: 'TRIGGERED',
    updatedTrailingHighWater: newHighWater,
  };
}

/**
 * ICEBERG: Limit order that only fills visibleQuantity at a time.
 * The remainder stays hidden until the next tick.
 */
function evaluateIceberg(
  order: OrderRecord,
  currentPrice: number,
  feeSchedule: FeeSchedule,
): MatchOutcome {
  const remaining = order.quantity - order.filledQuantity;
  if (remaining <= 0) {
    return { ...noAction(order), newStatus: 'FILLED' };
  }

  const canFill = isLimitTriggered(order.side, order.limitPrice!, currentPrice);
  if (!canFill) {
    return noAction(order);
  }

  const visibleQty = order.visibleQuantity ?? remaining;
  const fillQty = Math.min(visibleQty, remaining);
  const notional = fillQty * currentPrice;
  const fee = notional * (feeSchedule.takerFeeBps / 10_000);

  const fill: FillResult = {
    filledQuantity: fillQty,
    fillPrice: currentPrice,
    fee,
    remainingQuantity: remaining - fillQty,
    isFullyFilled: remaining - fillQty <= 0,
  };

  return {
    shouldExecute: true,
    shouldTrigger: false,
    fill,
    newStatus: fill.isFullyFilled ? 'FILLED' : 'PARTIALLY_FILLED',
    icebergFillAmount: fillQty,
  };
}

/**
 * TWAP: Time-distributed execution.
 * Slices are evenly distributed across the configured duration.
 *
 * Timing logic:
 *   - The first slice executes immediately (instant user feedback)
 *   - Subsequent slices only execute when sufficient time has passed
 *     since order creation: elapsed >= executedSlices * sliceInterval
 *
 * This ensures TWAP truly distributes execution across the full
 * duration, rather than executing all at once on every tick.
 */
function evaluateTwap(
  order: OrderRecord,
  currentPrice: number,
): MatchOutcome {
  const twapSlices = Math.max(order.twapSlices ?? 10, 1);
  const executedSlices = order.twapExecutedSlices ?? 0;
  const twapDuration = Math.max(order.twapDurationSeconds ?? 300, 1);

  if (executedSlices >= twapSlices) {
    return {
      shouldExecute: false,
      shouldTrigger: false,
      newStatus: 'FILLED',
    };
  }

  const remaining = order.quantity - order.filledQuantity;
  if (remaining <= 0) {
    return { ...noAction(order), newStatus: 'FILLED' };
  }

  // Timing: first slice starts immediately, remainder is scheduled
  if (executedSlices > 0) {
    const sliceIntervalMs = (twapDuration * 1000) / twapSlices;
    const elapsedMs = Date.now() - new Date(order.createdAt).getTime();
    // Next slice executes when enough time has elapsed
    // executedSlices already includes the first (immediate) slice
    if (elapsedMs < executedSlices * sliceIntervalMs) {
      return noAction(order);
    }
  }

  // Slice quantity: total quantity / number of slices
  const sliceQty = order.quantity / twapSlices;
  const fillQty = Math.min(sliceQty, remaining);
  const fee = fillQty * currentPrice * (0.0026); // taker fee

  const newFilledQty = order.filledQuantity + fillQty;
  const isFullyFilled = newFilledQty >= order.quantity;

  return {
    shouldExecute: true,
    shouldTrigger: false,
    fill: {
      filledQuantity: fillQty,
      fillPrice: currentPrice,
      fee,
      remainingQuantity: order.quantity - newFilledQty,
      isFullyFilled,
    },
    newStatus: isFullyFilled ? 'FILLED' : 'PARTIALLY_FILLED',
    twapSliceExecuted: true,
  };
}

/**
 * Evaluate all open/partially-filled orders against a single price tick.
 *
 * Skips orders that are not OPEN or PARTIALLY_FILLED.
 *
 * @param orders - Array of orders to evaluate (all statuses, but only OPEN/PARTIALLY_FILLED processed).
 * @param currentPrice - Current market price for all orders (assumes same asset).
 * @param feeSchedule - Optional fee schedule. Defaults to DEFAULT_FEE_SCHEDULE.
 * @returns Map of orderId -> MatchOutcome. Only includes orders that were actually evaluated.
 *
 * Edge cases:
 *   - Empty array returns empty Map.
 *   - Duplicate order IDs: the last one wins (Map behavior).
 *   - Orders at different price levels: all evaluated against the same currentPrice.
 */
export function evaluateOrderBook(
  orders: OrderRecord[],
  currentPrice: number,
  feeSchedule: FeeSchedule = DEFAULT_FEE_SCHEDULE,
): Map<string, MatchOutcome> {
  const results = new Map<string, MatchOutcome>();
  for (const order of orders) {
    if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED')
      continue;
    results.set(order.id, evaluateOrder({ order, currentPrice, feeSchedule }));
  }
  return results;
}

/**
 * Convenience wrapper around evaluateOrder that fetches the current price
 * from a PriceFeedProvider first. Useful for one-off evaluations where
 * the price isn't already known (e.g., in the worker tick endpoint).
 *
 * @param order - The order to evaluate.
 * @param priceFeed - A PriceFeedProvider instance.
 * @param feeSchedule - Optional fee schedule override.
 * @returns Promise resolving to MatchOutcome.
 *
 * Edge case: priceFeed.getCurrentPrice may throw for unknown symbols.
 */
export async function evaluateOrderWithFeed(
  order: OrderRecord,
  priceFeed: PriceFeedProvider,
  feeSchedule?: FeeSchedule,
): Promise<MatchOutcome> {
  const currentPrice = await priceFeed.getCurrentPrice(order.assetSymbol);
  return evaluateOrder({ order, currentPrice, feeSchedule });
}
