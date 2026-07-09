import { NextRequest, NextResponse } from 'next/server';
import { listTradeHistory, listTransactions } from '@/server/actions/history';

/**
 * GET /api/history?type=trades|transactions|all&pair=&side=&dateRange=&search=
 *
 * Unified history endpoint.
 * - type=trades → trade history (default)
 * - type=transactions → transaction log
 * - type=all → both
 *
 * Query params are forwarded to the respective list functions:
 *   Trade filters: pair, type (order type), side, dateRange
 *   Transaction filters: type (tx type), dateRange, search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    const tradeFilters = {
      pair: searchParams.get('pair') || undefined,
      type: searchParams.get('orderType') || undefined,
      side: searchParams.get('side') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
    };

    const txFilters = {
      type: searchParams.get('txType') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const hasTradeFilters = tradeFilters.pair || tradeFilters.type || tradeFilters.side || tradeFilters.dateRange;
    const hasTxFilters = txFilters.type || txFilters.dateRange || txFilters.search;

    if (type === 'trades') {
      const trades = await listTradeHistory(hasTradeFilters ? tradeFilters : undefined);
      return NextResponse.json({ trades, total: trades.length });
    }

    if (type === 'transactions') {
      const transactions = await listTransactions(hasTxFilters ? txFilters : undefined);
      return NextResponse.json({ transactions, total: transactions.length });
    }

    // type=all
    const [trades, transactions] = await Promise.all([
      listTradeHistory(hasTradeFilters ? tradeFilters : undefined),
      listTransactions(hasTxFilters ? txFilters : undefined),
    ]);

    return NextResponse.json({
      trades,
      transactions,
      tradesTotal: trades.length,
      transactionsTotal: transactions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
