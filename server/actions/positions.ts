"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getPriceFeed } from "@/lib/engine/priceFeed/PriceFeedFactory";
import {
  calculateUnrealizedPnl,
  calculateRoe,
  isPositionLiquidated,
} from "@/lib/engine/marginEngine";
import { closePositionSchema } from "@/lib/validation/orderSchemas";
import { getCurrentUserId } from "./orders";
import { Prisma } from "@/app/generated/prisma/client";

/** View model for an open position as returned to the frontend. */
export interface PositionView {
  id: string;
  assetSymbol: string;
  side: "LONG" | "SHORT";
  leverage: number;
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  usedMargin: number;
  unrealizedPnl: number;
  roe: number;
  positionSizeUsd: number;
}

/**
 * Query all open positions with live markPrice / unrealizedPnl / ROE values.
 * markPrice and PnL are not persisted on every query — they are computed
 * at read time. The DB-stored values are updated by the background tick
 * (see checkLiquidations).
 */
export async function listOpenPositions(): Promise<PositionView[]> {
  const userId = await getCurrentUserId();
  const positions = await prisma.position.findMany({
    where: { userId, status: "OPEN" },
    include: { asset: true },
  });

  const priceFeed = getPriceFeed();
  const views: PositionView[] = [];

  for (const p of positions) {
    const markPrice = await priceFeed.getCurrentPrice(p.asset.symbol);
    const size = Number(p.size);
    const entryPrice = Number(p.entryPrice);
    const usedMargin = Number(p.usedMargin);
    const side = p.side as "LONG" | "SHORT";

    const unrealizedPnl = calculateUnrealizedPnl(side, size, entryPrice, markPrice);
    const roe = calculateRoe(unrealizedPnl, usedMargin);

    views.push({
      id: p.id,
      assetSymbol: p.asset.symbol,
      side,
      leverage: p.leverage,
      size,
      entryPrice,
      markPrice,
      liquidationPrice: Number(p.liquidationPrice),
      usedMargin,
      unrealizedPnl,
      roe,
      positionSizeUsd: size * markPrice,
    });
  }

  return views;
}

/**
 * Close a position manually at market price.
 *
 * Calculates realized PnL against the current mark price, updates the wallet
 * (cash + margin release), creates Trade and Transaction records.
 *
 * @param input - Object containing the positionId to close.
 * @returns Success or error message.
 *
 * Edge cases:
 *   - Position already closed/liquidated: returns error.
 *   - Position not found: returns error.
 */
export async function closePosition(
  input: { positionId: string }
): Promise<{ success: boolean; error?: string }> {
  const parsed = closePositionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid request' };

  const position = await prisma.position.findUnique({
    where: { id: parsed.data.positionId },
    include: { asset: true },
  });
  if (!position || position.status !== "OPEN") {
    return { success: false, error: 'Position not found or already closed' };
  }

  const priceFeed = getPriceFeed();
  const markPrice = await priceFeed.getCurrentPrice(position.asset.symbol);
  const side = position.side as "LONG" | "SHORT";
  const size = Number(position.size);
  const pnl = calculateUnrealizedPnl(side, size, Number(position.entryPrice), markPrice);

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: position.userId } });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        cashBalance: { increment: pnl },
        reservedMargin: { decrement: Number(position.usedMargin) },
      },
    });

    await tx.position.update({
      where: { id: position.id },
      data: {
        status: "CLOSED",
        size: 0,
        realizedPnl: { increment: pnl },
        markPrice,
        closedAt: new Date(),
      },
    });

    await tx.trade.create({
      data: {
        userId: position.userId,
        orderId: (
          await tx.order.create({
            data: {
              userId: position.userId,
              assetId: position.assetId,
              marketType: "MARGIN",
              side: side === "LONG" ? "SELL" : "BUY",
              type: "MARKET",
              positionSide: side,
              leverage: position.leverage,
              quantity: size,
              filledQuantity: size,
              averageFillPrice: markPrice,
              status: "FILLED",
              filledAt: new Date(),
            },
          })
        ).id,
        assetId: position.assetId,
        positionId: position.id,
        marketType: "MARGIN",
        side: side === "LONG" ? "SELL" : "BUY",
        orderType: "MARKET",
        price: markPrice,
        quantity: size,
        fee: 0,
        pnl,
        executedAt: new Date(),
      },
    });

    await tx.transaction.create({
      data: {
        userId: position.userId,
        type: "REALIZED_PNL",
        amount: pnl,
        note: `${position.asset.symbol} position manually closed`,
      },
    });
  });

  revalidatePath("/trade");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * Periodic liquidation check for all open positions.
 *
 * Called by the worker tick endpoint. For each open position:
 *   1. Fetch current mark price
 *   2. If markPrice crosses liquidationPrice → auto-close (total loss of usedMargin)
 *   3. Otherwise → update stored markPrice for UI consistency
 *
 * @returns Object with count of positions that were liquidated in this tick.
 *
 * Edge cases:
 *   - No open positions: returns { liquidatedCount: 0 }.
 *   - Multiple positions liquidated in same tick: all are closed independently.
 *   - Liquidation results in negative wallet balance (usedMargin is fully lost).
 */
export async function checkLiquidations(): Promise<{ liquidatedCount: number }> {
  const openPositions = await prisma.position.findMany({
    where: { status: "OPEN" },
    include: { asset: true },
  });
  const priceFeed = getPriceFeed();
  let liquidatedCount = 0;

  for (const position of openPositions) {
    const markPrice = await priceFeed.getCurrentPrice(position.asset.symbol);
    const side = position.side as "LONG" | "SHORT";

    if (isPositionLiquidated(side, markPrice, Number(position.liquidationPrice))) {
      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: position.userId } });
        // On liquidation the entire usedMargin is lost; wallet cash is not credited.
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { reservedMargin: { decrement: Number(position.usedMargin) } },
        });
        await tx.position.update({
          where: { id: position.id },
          data: {
            status: "LIQUIDATED",
            size: 0,
            realizedPnl: { decrement: Number(position.usedMargin) },
            markPrice,
            closedAt: new Date(),
          },
        });
        await tx.transaction.create({
          data: {
            userId: position.userId,
            type: "REALIZED_PNL",
            amount: new Prisma.Decimal(Number(position.usedMargin)).neg(),
            note: `${position.asset.symbol} position liquidated`,
          },
        });
      });
      liquidatedCount++;
    } else {
      // Update markPrice so the UI relies less on read-time computation
      await prisma.position.update({ where: { id: position.id }, data: { markPrice } });
    }
  }

  if (liquidatedCount > 0) {
    revalidatePath("/trade");
    revalidatePath("/portfolio");
  }

  return { liquidatedCount };
}
