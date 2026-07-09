import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPriceFeed } from '@/lib/engine/priceFeed/PriceFeedFactory';
import { evaluateOrder } from '@/lib/engine/matchingEngine';
import { checkLiquidations } from '@/server/actions/positions';
import { toOrderRecord } from '@/lib/engine/orderUtils';
import {
  getCurrentUserId,
  tryImmediateSettlement,
} from '@/server/actions/orders';

/**
 * GET /api/worker/tick
 *
 * Single "tick" of the recurring worker:
 * 1. Fetches all OPEN/PARTIALLY_FILLED orders
 * 2. Evaluates each order with the current price
 * 3. Handles triggers (Stop/Take Profit/Trailing → child order) and fills
 * 4. Runs checkLiquidations() for margin positions
 *
 * This is meant to be called periodically (~every 1-2 seconds) by a client-side
 * WorkerTick component or any background mechanism.
 */
export async function GET() {
  try {
    const startTime = Date.now();
    const stats = {
      ordersEvaluated: 0,
      triggers: 0,
      fills: 0,
      liquidations: 0,
      errors: 0,
    };

    // 1. Fetch all OPEN/PARTIALLY_FILLED orders
    const userId = await getCurrentUserId();
    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
      include: { asset: true },
    });

    // 2. Evaluate each order using tryImmediateSettlement which handles
    //    trigger logic, fill logic, and trailing high-water updates internally.
    for (const dbOrder of orders) {
      stats.ordersEvaluated++;
      try {
        // tryImmediateSettlement handles everything: trailingHighWater updates,
        // triggers (stop/tp/trailing → child orders), and fills (market/limit executions)
        //
        // We can't know from the return whether it was a trigger or fill,
        // so for stats we need to evaluate separately.
        const priceFeed = getPriceFeed();
        const currentPrice = await priceFeed.getCurrentPrice(dbOrder.asset.symbol);

        // Quick evaluation for stats only (no side effects)
        const orderRecord = toOrderRecord(dbOrder, dbOrder.asset.symbol);
        const outcome = evaluateOrder({ order: orderRecord, currentPrice });

        if (outcome.shouldTrigger) {
          stats.triggers++;
        } else if (outcome.shouldExecute) {
          stats.fills++;
        }

        // Delegate all actual work to tryImmediateSettlement
        await tryImmediateSettlement(dbOrder.id);
      } catch (err) {
        stats.errors++;
        console.error(`[WorkerTick] Error evaluating order ${dbOrder.id}:`, err);
      }
    }

    // 3. Run liquidation check
    const liqResult = await checkLiquidations();
    stats.liquidations = liqResult.liquidatedCount;

    return NextResponse.json({
      tickTimeMs: Date.now() - startTime,
      ...stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        tickTimeMs: 0,
        ordersEvaluated: 0,
        triggers: 0,
        fills: 0,
        liquidations: 0,
        errors: 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
