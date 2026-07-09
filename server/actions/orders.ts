'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getPriceFeed } from '@/lib/engine/priceFeed/PriceFeedFactory';
import { evaluateOrder } from '@/lib/engine/matchingEngine';
import {
  calculateRequiredMargin,
  calculateLiquidationPrice,
  calculateUnrealizedPnl,
} from '@/lib/engine/marginEngine';
import {
  orderInputSchema,
  cancelOrderSchema,
  type OrderInputForm,
} from '@/lib/validation/orderSchemas';
import { toOrderRecord } from '@/lib/engine/orderUtils';
import type { OrderStatus } from '@/lib/engine/types';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Prisma } from '@/app/generated/prisma/client';

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get the current authenticated user's ID from the Better Auth session.
 * Throws if no session exists.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}

/**
 * Create an order in any of the 14 supported order types.
 *
 * This is the main entry point from the Order Entry panel. It handles:
 *   1. Zod schema validation of the raw input
 *   2. Asset and wallet lookup
 *   3. SPOT: cash/balance checks for BUY/SELL
 *   4. MARGIN: free margin check against required margin
 *   5. SETTLE_POSITION: lookup position, derive closing params
 *   6. OCO: creates two linked orders (TAKE_PROFIT + STOP_LOSS)
 *   7. Margin reservation for MARGIN orders
 *   8. Immediate settlement for MARKET/LIMIT/SETTLE_POSITION/REDUCE_ONLY
 *
 * @param rawInput - Unvalidated order input (validated via orderInputSchema).
 * @returns ActionResult with orderId on success, or error message on failure.
 *
 * Edge cases:
 *   - Insufficient balance for SPOT BUY: returns error "Insufficient free balance..."
 *   - Insufficient holdings for SPOT SELL: returns error "Insufficient [asset] in wallet..."
 *   - Insufficient free margin for MARGIN: returns error "Insufficient free margin..."
 *   - SETTLE_POSITION with invalid/missing positionId: returns error.
 *   - OCO creates two sibling orders: parent becomes TAKE_PROFIT, sibling is STOP_LOSS.
 */
export async function createOrder(
  rawInput: OrderInputForm,
): Promise<ActionResult<{ orderId: string }>> {
  const parsed = orderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid order data',
    };
  }
  const input = parsed.data;

  const userId = await getCurrentUserId();

  const asset = await prisma.asset.findUnique({
    where: { symbol: input.assetSymbol },
  });
  if (!asset) return { success: false, error: 'Unknown asset' };

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return { success: false, error: 'Wallet not found' };

  const priceFeed = getPriceFeed();
  const currentPrice = await priceFeed.getCurrentPrice(input.assetSymbol);    // --- Collateral / balance check ---
  if (input.marketType === 'SPOT') {
    if (input.side === 'BUY') {
      const refPrice =
        'limitPrice' in input && input.limitPrice
          ? (input as { limitPrice: number }).limitPrice
          : currentPrice;
      const estimatedCost = input.quantity * refPrice;
      if (Number(wallet.cashBalance) < estimatedCost) {
        return {
          success: false,
          error: 'Insufficient free balance for this order',
        };
      }
    } else {
      const holding = await prisma.assetHolding.findUnique({
        where: {
          walletId_assetSymbol: {
            walletId: wallet.id,
            assetSymbol: asset.base,
          },
        },
      });
      if (!holding || Number(holding.quantity) < input.quantity) {
        return {
          success: false,
          error: `Insufficient ${asset.base} in wallet`,
        };
      }
    }
  } else {
    // MARGIN
    const marginLeverage = 'leverage' in input && input.leverage ? input.leverage : 2;
    const refPrice =
      'limitPrice' in input && input.limitPrice
        ? (input as { limitPrice: number }).limitPrice
        : currentPrice;
    const requiredMargin = calculateRequiredMargin(
      input.quantity,
      refPrice,
      marginLeverage,
    );
    const freeMargin =
      Number(wallet.cashBalance) - Number(wallet.reservedMargin);
    if (freeMargin < requiredMargin) {
      return {
        success: false,
        error: 'Insufficient free margin for this position',
      };
    }
  }

  // --- SETTLE_POSITION: look up and validate the position, derive closing params ---
  if (input.type === 'SETTLE_POSITION') {
    const positionId = (input as { positionId?: string }).positionId;
    if (!positionId) {
      return { success: false, error: 'Missing position ID' };
    }
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });
    if (!position || position.userId !== userId) {
      return { success: false, error: 'Position not found' };
    }
    if (position.status !== 'OPEN') {
      return { success: false, error: 'Position is already closed' };
    }
    if (position.assetId !== asset.id) {
      return { success: false, error: 'Position does not belong to this asset' };
    }

    // Position side determines closing direction
    const positionSide = position.side as 'LONG' | 'SHORT';
    const closingSide = positionSide === 'LONG' ? 'SELL' : 'BUY';

    // Override order params from the position
    const orderData: Prisma.OrderCreateInput = {
      user: { connect: { id: userId } },
      asset: { connect: { id: asset.id } },
      marketType: 'MARGIN',
      side: closingSide,
      type: 'SETTLE_POSITION',
      quantity: Number(position.size),
      positionSide,
      leverage: position.leverage,
      status: 'OPEN',
    };

    const order = await prisma.order.create({ data: orderData });

    // No margin reservation needed - the position's usedMargin is already reserved.
    // For SETTLE_POSITION, the settlement logic goes through settleMarginFill
    // which handles the closing branch and releases margin.
    await tryImmediateSettlement(order.id);

    revalidatePath('/trade');
    revalidatePath('/dashboard');
    revalidatePath('/portfolio');

    return { success: true, data: { orderId: order.id } };
  }

  // --- Standard order creation for all other types ---
  const orderData: Prisma.OrderCreateInput = {
    user: { connect: { id: userId } },
    asset: { connect: { id: asset.id } },
    marketType: input.marketType,
    side: input.side,
    type: input.type,
    quantity: input.quantity,
    positionSide: 'positionSide' in input ? input.positionSide : undefined,
    leverage: 'leverage' in input ? input.leverage : undefined,
    status: 'OPEN',
  };

  // LIMIT / ICEBERG / POST_ONLY_LIMIT
  if ('limitPrice' in input && input.limitPrice) {
    orderData.limitPrice = input.limitPrice;
  }
  // Trigger prices
  if ('triggerPrice' in input && input.triggerPrice) {
    orderData.triggerPrice = input.triggerPrice;
  }
  // ICEBERG: visible quantity stored in trailingOffsetValue (reused field)
  if (input.type === 'ICEBERG' && 'visibleQuantity' in input && input.visibleQuantity) {
    orderData.trailingOffsetValue = input.visibleQuantity;
  }
  // TWAP: params stored for engine evaluation
  if (input.type === 'TWAP') {
    orderData.trailingOffsetValue = ('twapDurationSeconds' in input ? input.twapDurationSeconds : 300) as unknown as Prisma.Decimal;
    orderData.trailingLimitOffset = ('twapSlices' in input ? input.twapSlices : 10) as unknown as Prisma.Decimal;
    orderData.trailingHighWater = 0; // twapExecutedSlices count
  }
  // OCO: second prices stored in trailingLimitOffset (secondLimitPrice) and trailingOffsetValue (secondTriggerPrice)
  if (input.type === 'OCO') {
    if ('secondTriggerPrice' in input && input.secondTriggerPrice) {
      orderData.trailingOffsetValue = input.secondTriggerPrice;
    }
    if ('secondLimitPrice' in input && input.secondLimitPrice) {
      orderData.trailingLimitOffset = input.secondLimitPrice;
    }
  }
  // Trailing stop fields
  if ('trailingOffsetType' in input && input.trailingOffsetType) {
    orderData.trailingOffsetType = input.trailingOffsetType;
  }
  if ('trailingOffsetValue' in input && input.trailingOffsetValue) {
    orderData.trailingOffsetValue = input.trailingOffsetValue;
  }
  if ('trailingLimitOffset' in input && input.trailingLimitOffset) {
    orderData.trailingLimitOffset = input.trailingLimitOffset;
  }

  // Set trailingHighWater for trailing stops and ICEBERG visible qty
  if (input.type === 'TRAILING_STOP' || input.type === 'TRAILING_STOP_LIMIT') {
    orderData.trailingHighWater = currentPrice;
  }

  const order = await prisma.order.create({ data: orderData });

  // Margin: reserve funds
  if (input.marketType === 'MARGIN') {
    const refPrice =
      'limitPrice' in input && input.limitPrice
        ? (input as { limitPrice: number }).limitPrice
        : currentPrice;
    const marginLev = 'leverage' in input && input.leverage ? input.leverage : 2;
    const requiredMargin = calculateRequiredMargin(
      input.quantity,
      refPrice,
      marginLev,
    );
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { reservedMargin: { increment: requiredMargin } },
    });
  }

  // OCO: create two linked orders (TAKE_PROFIT + STOP_LOSS) as a pair
  if (input.type === 'OCO' && 'secondTriggerPrice' in input && input.secondTriggerPrice) {
    // Create STOP_LOSS sibling
    const siblingData: Prisma.OrderCreateInput = {
      user: { connect: { id: userId } },
      asset: { connect: { id: asset.id } },
      marketType: input.marketType,
      side: input.side,
      type: 'STOP_LOSS' as const,
      quantity: input.quantity,
      positionSide: 'positionSide' in input ? input.positionSide : undefined,
      leverage: 'leverage' in input ? input.leverage : undefined,
      status: 'OPEN',
      triggerPrice: input.secondTriggerPrice,
      limitPrice: 'secondLimitPrice' in input ? input.secondLimitPrice : undefined,
    };
    await prisma.order.create({ data: siblingData });

    // Update the parent order to TAKE_PROFIT type with proper trigger
    await prisma.order.update({
      where: { id: order.id },
      data: {
        type: 'TAKE_PROFIT',
        triggerPrice: input.triggerPrice,
        limitPrice: 'limitPrice' in input ? input.limitPrice : undefined,
      },
    });
  }

  // ── Conditional Stop Loss / Take Profit / Trailing Stop ──────
  // When opening a MARKET or LIMIT position, create separate
  // STOP_LOSS, TAKE_PROFIT, and/or TRAILING_STOP orders with the
  // opposite side for position-closing direction.
  //
  // For MARGIN: closing side = opposite of positionSide.
  // For SPOT: closing side is always SELL (you buy the asset, sell to close).
  //   SPOT SELL orders are skipped (they are already closing).
  const isOpeningOrder =
    input.type === 'MARKET' || input.type === 'LIMIT';
  if (isOpeningOrder && (input.marketType === 'MARGIN' || input.side === 'BUY')) {
    let closingSide: 'BUY' | 'SELL';
    if (input.marketType === 'MARGIN' && 'positionSide' in input && input.positionSide) {
      closingSide = input.positionSide === 'LONG' ? 'SELL' : 'BUY';
    } else if (input.marketType === 'SPOT' && input.side === 'BUY') {
      // SPOT BUY → closing side is SELL
      closingSide = 'SELL';
    } else {
      closingSide = 'SELL'; // fallback, won't be reached due to condition above
    }

    // Conditional Stop Loss (with optional limit-price variant)
    if ('conditionalStopLoss' in input && input.conditionalStopLoss) {
      const hasLimit = 'conditionalStopLossLimitPrice' in input && input.conditionalStopLossLimitPrice;
      const slOrderData: Prisma.OrderCreateInput = {
        user: { connect: { id: userId } },
        asset: { connect: { id: asset.id } },
        marketType: input.marketType,
        side: closingSide,
        type: hasLimit ? 'STOP_LOSS_LIMIT' : 'STOP_LOSS',
        quantity: input.quantity,
        status: 'OPEN',
        triggerPrice: input.conditionalStopLoss,
      };
      // Include margin-specific fields only for MARGIN orders
      if (input.marketType === 'MARGIN') {
        slOrderData.positionSide = input.positionSide;
        slOrderData.leverage = input.leverage;
      }
      if (hasLimit) {
        slOrderData.limitPrice = input.conditionalStopLossLimitPrice;
      }
      await prisma.order.create({ data: slOrderData });
    }

    // Conditional Take Profit (with optional limit-price variant)
    if ('conditionalTakeProfit' in input && input.conditionalTakeProfit) {
      const hasLimit = 'conditionalTakeProfitLimitPrice' in input && input.conditionalTakeProfitLimitPrice;
      const tpOrderData: Prisma.OrderCreateInput = {
        user: { connect: { id: userId } },
        asset: { connect: { id: asset.id } },
        marketType: input.marketType,
        side: closingSide,
        type: hasLimit ? 'TAKE_PROFIT_LIMIT' : 'TAKE_PROFIT',
        quantity: input.quantity,
        status: 'OPEN',
        triggerPrice: input.conditionalTakeProfit,
      };
      if (input.marketType === 'MARGIN') {
        tpOrderData.positionSide = input.positionSide;
        tpOrderData.leverage = input.leverage;
      }
      if (hasLimit) {
        tpOrderData.limitPrice = input.conditionalTakeProfitLimitPrice;
      }
      await prisma.order.create({ data: tpOrderData });
    }

    // Conditional Trailing Stop
    if (
      'conditionalTrailingStopEnabled' in input &&
      input.conditionalTrailingStopEnabled
    ) {
      const isLimit = 'conditionalTrailingLimitOffset' in input && input.conditionalTrailingLimitOffset;
      const tsOrderData: Prisma.OrderCreateInput = {
        user: { connect: { id: userId } },
        asset: { connect: { id: asset.id } },
        marketType: input.marketType,
        side: closingSide,
        type: isLimit ? 'TRAILING_STOP_LIMIT' : 'TRAILING_STOP',
        quantity: input.quantity,
        status: 'OPEN',
        trailingOffsetType: input.conditionalTrailingOffsetType,
        trailingOffsetValue: input.conditionalTrailingOffsetValue,
        trailingHighWater: currentPrice,
      };
      if (input.marketType === 'MARGIN') {
        tsOrderData.positionSide = input.positionSide;
        tsOrderData.leverage = input.leverage;
      }
      if (isLimit) {
        tsOrderData.trailingLimitOffset = input.conditionalTrailingLimitOffset;
      }
      await prisma.order.create({ data: tsOrderData });
    }
  }

  // Immediate settlement for MARKET, LIMIT (if fillable), SETTLE_POSITION, REDUCE_ONLY
  await tryImmediateSettlement(order.id);

  revalidatePath('/trade');
  revalidatePath('/dashboard');
  revalidatePath('/portfolio');

  return { success: true, data: { orderId: order.id } };
}

/**
 * Evaluate a single order against the current market price immediately.
 *
 * Called right after order creation (for MARKET/LIMIT fills) and recursively
 * when triggered orders create child orders. Handles:
 *   - Full fills (settleFill call)
 *   - Partial fills for ICEBERG orders
 *   - TWAP slice execution tracking
 *   - Trailing stop high-water mark updates
 *   - Triggered order creation (handleTrigger)
 *
 * @param orderId - The ID of the order to evaluate.
 *
 * Edge cases:
 *   - Order not found: silent return (no-op).
 *   - Order not OPEN/PARTIALLY_FILLED: silent return.
 *   - ICEBERG partial fill: creates Trade record and returns (waits for next tick).
 *   - Trigger order (STOP/TAKE_PROFIT): creates child MARKET or LIMIT order.
 */
export async function tryImmediateSettlement(orderId: string): Promise<void> {
  const dbOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { asset: true },
  });
  if (!dbOrder) return;
  if (dbOrder.status !== 'OPEN' && dbOrder.status !== 'PARTIALLY_FILLED')
    return;

  const priceFeed = getPriceFeed();
  const currentPrice = await priceFeed.getCurrentPrice(dbOrder.asset.symbol);

  const orderRecord = toOrderRecord(dbOrder, dbOrder.asset.symbol);
  const outcome = evaluateOrder({ order: orderRecord, currentPrice });

  // TWAP: update executed slices counter
  if (outcome.twapSliceExecuted && dbOrder.type === 'TWAP') {
    const executedSlices = (Number(dbOrder.trailingHighWater) || 0) + 1;
    await prisma.order.update({
      where: { id: orderId },
      data: { trailingHighWater: executedSlices },
    });
  }

  // ICEBERG: track fill for partial fills
  if (outcome.icebergFillAmount && outcome.fill) {
    const newFilled = Number(dbOrder.filledQuantity) + outcome.fill.filledQuantity;
    if (newFilled < Number(dbOrder.quantity)) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          filledQuantity: newFilled,
          averageFillPrice: outcome.fill.fillPrice,
          feePaid: { increment: outcome.fill.fee },
          status: 'PARTIALLY_FILLED',
        },
      });
      // Create trade record for partial fill
      await prisma.trade.create({
        data: {
          userId: dbOrder.userId,
          orderId: dbOrder.id,
          assetId: dbOrder.assetId,
          marketType: dbOrder.marketType,
          side: dbOrder.side,
          orderType: dbOrder.type,
          price: outcome.fill.fillPrice,
          quantity: outcome.fill.filledQuantity,
          fee: outcome.fill.fee,
          executedAt: new Date(),
        },
      });
      return; // Don't continue to full settlement - wait for next tick
    }
  }

  if (outcome.updatedTrailingHighWater !== undefined) {
    await prisma.order.update({
      where: { id: orderId },
      data: { trailingHighWater: outcome.updatedTrailingHighWater },
    });
  }

  if (outcome.shouldTrigger) {
    await handleTrigger(dbOrder, currentPrice);
    return;
  }

  if (outcome.shouldExecute && outcome.fill) {
    await settleFill(
      dbOrder,
      outcome.fill.fillPrice,
      outcome.fill.filledQuantity,
      outcome.fill.fee,
      outcome.newStatus,
    );
  }
}

async function handleTrigger(
  dbOrder: Prisma.OrderGetPayload<{ include: { asset: true } }>,
  currentPrice: number,
) {
  const isLimitFamily =
    dbOrder.type === 'STOP_LOSS_LIMIT' ||
    dbOrder.type === 'TAKE_PROFIT_LIMIT' ||
    dbOrder.type === 'TRAILING_STOP_LIMIT';

  const childType: 'MARKET' | 'LIMIT' = isLimitFamily ? 'LIMIT' : 'MARKET';
  let childLimitPrice: number | undefined;

  if (dbOrder.type === 'STOP_LOSS_LIMIT' || dbOrder.type === 'TAKE_PROFIT_LIMIT') {
    childLimitPrice = Number(dbOrder.limitPrice);
  }

  if (dbOrder.type === 'TRAILING_STOP_LIMIT') {
    const offset = Number(dbOrder.trailingLimitOffset ?? 0);
    childLimitPrice = dbOrder.side === 'SELL'
      ? currentPrice - offset
      : currentPrice + offset;
  }

  const childOrder = await prisma.order.create({
    data: {
      userId: dbOrder.userId,
      assetId: dbOrder.assetId,
      marketType: dbOrder.marketType,
      side: dbOrder.side,
      type: childType,
      quantity: new Prisma.Decimal(dbOrder.quantity).minus(dbOrder.filledQuantity),
      positionSide: dbOrder.positionSide,
      leverage: dbOrder.leverage,
      limitPrice: childLimitPrice,
      status: 'OPEN',
    },
  });

  await prisma.order.update({
    where: { id: dbOrder.id },
    data: { status: 'TRIGGERED', triggeredOrderId: childOrder.id },
  });

  await tryImmediateSettlement(childOrder.id);
}

/**
 * Finalize a filled order: update DB, settle wallet, create trade + transaction records.
 *
 * Dispatches to settleSpotFill or settleMarginFill based on marketType.
 * Handles REDUCE_ONLY logic: caps fill to existing position size.
 *
 * @param dbOrder - The Prisma order record with asset included.
 * @param fillPrice - The price at which the order was filled.
 * @param filledQuantity - The quantity that was filled.
 * @param fee - The fee charged for this fill.
 * @param newStatus - The status to set on the order (default FILLED).
 *
 * Edge cases:
 *   - REDUCE_ONLY with no matching open position: order is CANCELLED, 0 fill.
 *   - REDUCE_ONLY with fill exceeding position size: capped to position size.
 *   - SPOT: calls settleSpotFill (cash/holding update).
 *   - MARGIN: calls settleMarginFill (position create/update/close).
 */
export async function settleFill(
  dbOrder: Prisma.OrderGetPayload<{ include: { asset: true } }>,
  fillPrice: number,
  filledQuantity: number,
  fee: number,
  newStatus: OrderStatus = 'FILLED',
) {
  await prisma.$transaction(async tx => {
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { userId: dbOrder.userId },
    });

    let actualFillQty = filledQuantity;
    if (dbOrder.type === 'REDUCE_ONLY') {
      const position = await tx.position.findFirst({
        where: {
          userId: dbOrder.userId,
          assetId: dbOrder.assetId,
          side: dbOrder.side === 'BUY' ? 'SHORT' : 'LONG',
          status: 'OPEN',
        },
      });
      if (position) {
        actualFillQty = Math.min(filledQuantity, Number(position.size));
      } else {
        actualFillQty = 0;
      }
    }

    if (actualFillQty <= 0) {
      await tx.order.update({
        where: { id: dbOrder.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      return;
    }

    await tx.order.update({
      where: { id: dbOrder.id },
      data: {
        status: newStatus,
        filledQuantity: actualFillQty,
        averageFillPrice: fillPrice,
        feePaid: fee,
        filledAt: newStatus === 'FILLED' ? new Date() : undefined,
      },
    });

    if (dbOrder.marketType === 'SPOT') {
      await settleSpotFill(tx, dbOrder, fillPrice, actualFillQty, fee, wallet.id);
    } else {
      await settleMarginFill(tx, dbOrder, fillPrice, actualFillQty, fee, wallet.id);
    }

    await tx.trade.create({
      data: {
        userId: dbOrder.userId,
        orderId: dbOrder.id,
        assetId: dbOrder.assetId,
        marketType: dbOrder.marketType,
        side: dbOrder.side,
        orderType: dbOrder.type,
        price: fillPrice,
        quantity: actualFillQty,
        fee,
        executedAt: new Date(),
      },
    });

    await tx.transaction.create({
      data: {
        userId: dbOrder.userId,
        type: 'TRADE_FEE',
        amount: new Prisma.Decimal(fee).neg(),
        note: `${dbOrder.type} ${dbOrder.side} ${dbOrder.asset.symbol}`,
      },
    });
  });
}

async function settleSpotFill(
  tx: Prisma.TransactionClient,
  dbOrder: Prisma.OrderGetPayload<{ include: { asset: true } }>,
  fillPrice: number,
  filledQuantity: number,
  fee: number,
  walletId: string,
) {
  const notional = fillPrice * filledQuantity;

  if (dbOrder.side === 'BUY') {
    await tx.wallet.update({
      where: { id: walletId },
      data: { cashBalance: { decrement: notional + fee } },
    });
    await tx.assetHolding.upsert({
      where: {
        walletId_assetSymbol: { walletId, assetSymbol: dbOrder.asset.base },
      },
      create: {
        walletId,
        assetSymbol: dbOrder.asset.base,
        quantity: filledQuantity,
      },
      update: { quantity: { increment: filledQuantity } },
    });
  } else {
    await tx.wallet.update({
      where: { id: walletId },
      data: { cashBalance: { increment: notional - fee } },
    });
    await tx.assetHolding.update({
      where: {
        walletId_assetSymbol: { walletId, assetSymbol: dbOrder.asset.base },
      },
      data: { quantity: { decrement: filledQuantity } },
    });
  }
}

async function settleMarginFill(
  tx: Prisma.TransactionClient,
  dbOrder: Prisma.OrderGetPayload<{ include: { asset: true } }>,
  fillPrice: number,
  filledQuantity: number,
  fee: number,
  walletId: string,
) {
  const positionSide = dbOrder.positionSide!;
  const leverage = dbOrder.leverage!;

  const isOpeningDirection =
    (dbOrder.side === 'BUY' && positionSide === 'LONG') ||
    (dbOrder.side === 'SELL' && positionSide === 'SHORT');

  const existingPosition = await tx.position.findFirst({
    where: {
      userId: dbOrder.userId,
      assetId: dbOrder.assetId,
      side: positionSide,
      status: 'OPEN',
    },
  });

  const requiredMargin = calculateRequiredMargin(filledQuantity, fillPrice, leverage);

  if (isOpeningDirection) {
    if (existingPosition) {
      const oldSize = Number(existingPosition.size);
      const oldEntry = Number(existingPosition.entryPrice);
      const newSize = oldSize + filledQuantity;
      const newEntryPrice = (oldSize * oldEntry + filledQuantity * fillPrice) / newSize;
      const newUsedMargin = Number(existingPosition.usedMargin) + requiredMargin;
      const liquidationPrice = calculateLiquidationPrice({
        side: positionSide,
        size: newSize,
        entryPrice: newEntryPrice,
        leverage,
      });

      await tx.position.update({
        where: { id: existingPosition.id },
        data: {
          size: newSize,
          entryPrice: newEntryPrice,
          usedMargin: newUsedMargin,
          liquidationPrice,
          markPrice: fillPrice,
        },
      });
    } else {
      const liquidationPrice = calculateLiquidationPrice({
        side: positionSide,
        size: filledQuantity,
        entryPrice: fillPrice,
        leverage,
      });
      await tx.position.create({
        data: {
          userId: dbOrder.userId,
          assetId: dbOrder.assetId,
          side: positionSide,
          leverage,
          size: filledQuantity,
          entryPrice: fillPrice,
          markPrice: fillPrice,
          liquidationPrice,
          usedMargin: requiredMargin,
        },
      });
    }
  } else {
    if (!existingPosition) return;

    const closingQty = Math.min(filledQuantity, Number(existingPosition.size));
    const pnl = calculateUnrealizedPnl(
      positionSide,
      closingQty,
      Number(existingPosition.entryPrice),
      fillPrice,
    );
    const remainingSize = Number(existingPosition.size) - closingQty;
    const releasedMargin =
      (closingQty / Number(existingPosition.size)) *
      Number(existingPosition.usedMargin);

    await tx.wallet.update({
      where: { id: walletId },
      data: {
        cashBalance: { increment: pnl - fee },
        reservedMargin: { decrement: releasedMargin },
      },
    });

    if (remainingSize <= 0) {
      await tx.position.update({
        where: { id: existingPosition.id },
        data: {
          status: 'CLOSED',
          size: 0,
          realizedPnl: { increment: pnl },
          closedAt: new Date(),
        },
      });
    } else {
      await tx.position.update({
        where: { id: existingPosition.id },
        data: {
          size: remainingSize,
          usedMargin: Number(existingPosition.usedMargin) - releasedMargin,
          realizedPnl: { increment: pnl },
          markPrice: fillPrice,
        },
      });
    }

    await tx.transaction.create({
      data: {
        userId: dbOrder.userId,
        type: 'REALIZED_PNL',
        amount: pnl,
        note: `${dbOrder.asset.symbol} position closing/reduction`,
      },
    });
  }
}

/**
 * Cancel an open order. Only OPEN or PARTIALLY_FILLED orders can be cancelled.
 * Releases any reserved margin for MARGIN orders.
 *
 * @param input - Object containing the orderId to cancel.
 * @returns ActionResult indicating success or failure.
 *
 * Edge cases:
 *   - Order not found: returns error.
 *   - Order belongs to another user: returns error (same message for security).
 *   - Order already FILLED or CANCELLED: returns error "Only open orders can be cancelled..."
 *   - MARGIN cancellation: recalculates and releases reserved margin via Prisma transaction.
 */
export async function cancelOrder(input: {
  orderId: string;
}): Promise<ActionResult<null>> {
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid request' };

  const userId = await getCurrentUserId();

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
  });
  if (!order) return { success: false, error: 'Order not found' };
  if (order.userId !== userId) {
    return { success: false, error: 'Order not found' };
  }
  if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED') {
    return { success: false, error: 'Only open orders can be cancelled' };
  }

  await prisma.$transaction(async tx => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    if (order.marketType === 'MARGIN' && order.leverage) {
      const refPrice = order.limitPrice ?? order.triggerPrice ?? 0;
      const remainingQty = new Prisma.Decimal(order.quantity).minus(order.filledQuantity);
      const reservedToRelease = calculateRequiredMargin(
        Number(remainingQty),
        Number(refPrice),
        order.leverage,
      );
      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { userId: order.userId },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          reservedMargin: {
            decrement: Math.min(reservedToRelease, Number(wallet.reservedMargin)),
          },
        },
      });
    }
  });

  revalidatePath('/trade');
  return { success: true, data: null };
}

/** View model for an order as returned to the frontend. */
export interface OrderView {
  id: string;
  assetSymbol: string;
  marketType: 'SPOT' | 'MARGIN';
  side: 'BUY' | 'SELL';
  type: string;
  status: string;
  positionSide?: 'LONG' | 'SHORT';
  leverage?: number;
  quantity: number;
  filledQuantity: number;
  limitPrice?: number;
  triggerPrice?: number;
  trailingOffsetType?: 'PERCENT' | 'FIXED';
  trailingOffsetValue?: number;
  averageFillPrice?: number;
  feePaid: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List all currently open orders (OPEN or PARTIALLY_FILLED status).
 * Returns newest orders first.
 *
 * @returns Array of OrderView objects with asset symbols and typed fields.
 */
export async function listOpenOrders(): Promise<OrderView[]> {
  const userId = await getCurrentUserId();
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
    },
    include: { asset: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(o => ({
    id: o.id,
    assetSymbol: o.asset.symbol,
    marketType: o.marketType as 'SPOT' | 'MARGIN',
    side: o.side as 'BUY' | 'SELL',
    type: o.type,
    status: o.status,
    positionSide: o.positionSide as 'LONG' | 'SHORT' | undefined,
    leverage: o.leverage ?? undefined,
    quantity: Number(o.quantity),
    filledQuantity: Number(o.filledQuantity),
    limitPrice: o.limitPrice ? Number(o.limitPrice) : undefined,
    triggerPrice: o.triggerPrice ? Number(o.triggerPrice) : undefined,
    trailingOffsetType: o.trailingOffsetType as 'PERCENT' | 'FIXED' | undefined,
    trailingOffsetValue: o.trailingOffsetValue ? Number(o.trailingOffsetValue) : undefined,
    averageFillPrice: o.averageFillPrice ? Number(o.averageFillPrice) : undefined,
    feePaid: Number(o.feePaid),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));
}

/**
 * List recent order history (FILLED, CANCELLED, EXPIRED, TRIGGERED, REJECTED).
 * Returns newest last-updated first, capped at 50 records.
 *
 * @returns Array of OrderView objects.
 */
export async function listOrderHistory(): Promise<OrderView[]> {
  const userId = await getCurrentUserId();
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { in: ['FILLED', 'CANCELLED', 'EXPIRED', 'TRIGGERED', 'REJECTED'] },
    },
    include: { asset: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  return orders.map(o => ({
    id: o.id,
    assetSymbol: o.asset.symbol,
    marketType: o.marketType as 'SPOT' | 'MARGIN',
    side: o.side as 'BUY' | 'SELL',
    type: o.type,
    status: o.status,
    positionSide: o.positionSide as 'LONG' | 'SHORT' | undefined,
    leverage: o.leverage ?? undefined,
    quantity: Number(o.quantity),
    filledQuantity: Number(o.filledQuantity),
    limitPrice: o.limitPrice ? Number(o.limitPrice) : undefined,
    triggerPrice: o.triggerPrice ? Number(o.triggerPrice) : undefined,
    trailingOffsetType: o.trailingOffsetType as 'PERCENT' | 'FIXED' | undefined,
    trailingOffsetValue: o.trailingOffsetValue ? Number(o.trailingOffsetValue) : undefined,
    averageFillPrice: o.averageFillPrice ? Number(o.averageFillPrice) : undefined,
    feePaid: Number(o.feePaid),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));
}
