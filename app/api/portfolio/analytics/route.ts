import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/server/actions/orders';
import prisma from '@/lib/prisma';
import { computePortfolioAnalytics } from '@/lib/engine/portfolioAnalytics';
import type { TradeRecord, EquityPoint } from '@/lib/engine/portfolioAnalytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    // Fetch all trades for the user
    const dbTrades = await prisma.trade.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { executedAt: 'asc' },
    });

    const trades: TradeRecord[] = dbTrades.map((t) => ({
      pnl: Number(t.pnl),
      executedAt: t.executedAt.toISOString(),
      side: t.side as 'BUY' | 'SELL',
      assetSymbol: t.asset.symbol,
    }));

    // Fetch equity history from the existing server action
    const { getEquityHistory } = await import('@/server/actions/portfolio');
    const equityHistory = await getEquityHistory();

    const equityCurve: EquityPoint[] = equityHistory.map((p) => ({
      timestamp: p.timestamp,
      equity: p.equity,
    }));

    // Compute analytics
    const analytics = computePortfolioAnalytics(trades, equityCurve);

    // JSON doesn't support Infinity — replace with null so the UI can handle it
    const sanitized = JSON.parse(
      JSON.stringify({ success: true, analytics }, (_key, value) =>
        typeof value === 'number' && !Number.isFinite(value) ? null : value,
      ),
    );

    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
