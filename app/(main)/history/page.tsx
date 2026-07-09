import { listTradeHistory, listTransactions } from '@/server/actions/history';
import { HistoryPageClient } from './HistoryPageClient';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const [trades, transactions] = await Promise.all([
    listTradeHistory(),
    listTransactions(),
  ]);

  return (
    <HistoryPageClient
      initialTrades={trades}
      initialTransactions={transactions}
    />
  );
}
