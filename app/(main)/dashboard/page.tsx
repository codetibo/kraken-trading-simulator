import { getPortfolioSummary, getRecentTrades } from '@/server/actions/portfolio';
import { listOpenPositions } from '@/server/actions/positions';
import { listJournalEntries } from '@/server/actions/journal';
import { EquityHeroCard } from '@/components/dashboard/EquityHeroCard';
import { StoreProvider } from '@/components/StoreProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatUsd, formatPercent, formatNumber } from '@/lib/utils';
import { SideBadge, PnLDisplay, PercentChange } from '@/lib/color-blind';
import { DashboardFeedHealth } from '@/components/dashboard/DashboardFeedHealth';
import Link from 'next/link';
import { CandlestickChart, Layers, BookOpen, Brain, Heart, Zap, Frown, AlertTriangle, Smile } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [portfolio, positions, trades, journalEntries] = await Promise.all([
    getPortfolioSummary(),
    listOpenPositions(),
    getRecentTrades(8),
    listJournalEntries({}).then(e => e.slice(0, 3)),
  ]);

  const startingBalance = portfolio.totalEquity - portfolio.overallPnl;

  return (
    <StoreProvider showWelcome enablePortfolioPolling>
      <div className='h-full overflow-y-auto p-4 pb-8 md:p-6'>
        <div className='mx-auto max-w-7xl space-y-4 md:space-y-6'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>
              Dashboard
            </h1>
            <div className='flex items-center gap-2'>
              <span className='relative flex h-2 w-2'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-positive' />
              </span>
              <span className='text-xs text-muted-foreground'>Live</span>
            </div>
          </div>

          {/* Top Row — Equity Hero + Portfolio Breakdown */}
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            <div className='lg:col-span-2'>
              <EquityHeroCard
                totalEquity={portfolio.totalEquity}
                overallPnl={portfolio.overallPnl}
                startingBalance={startingBalance}
              />
            </div>

            <PortfolioBreakdownCard
              cashBalance={portfolio.cashBalance}
              cryptoValueUsd={portfolio.cryptoValueUsd}
              usedMargin={portfolio.usedMargin}
              totalEquity={portfolio.totalEquity}
            />
          </div>

          {/* Second Row — Margin Overview + Daily PnL */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <MarginOverviewCard
              usedMargin={portfolio.usedMargin}
              freeMargin={portfolio.freeMargin}
              marginLevel={portfolio.marginLevel}
            />
            <DailyPnlCard
              dailyPnl={portfolio.dailyPnl}
              overallPnl={portfolio.overallPnl}
              totalEquity={portfolio.totalEquity}
              startingBalance={startingBalance}
            />
          </div>

          {/* Third Row — Price Feed Health */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <DashboardFeedHealth />
          </div>

          {/* Bottom Row — Open Positions + Recent Trades */}
          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            <OpenPositionsCard positions={positions} />
            <RecentTradesCard trades={trades} />
          </div>

          {/* Journal Widget Row */}
          <RecentJournalCard entries={journalEntries} />
        </div>
      </div>
    </StoreProvider>
  );
}

// ─── Small helper ───────────────────────────────────────

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <span
        className={cn(
          'font-mono text-sm tabular-nums text-foreground',
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Portfolio Breakdown Card ────────────────────────────

function PortfolioBreakdownCard({
  cashBalance,
  cryptoValueUsd,
  usedMargin,
  totalEquity,
}: {
  cashBalance: number;
  cryptoValueUsd: number;
  usedMargin: number;
  totalEquity: number;
}) {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          Portfolio Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <SummaryRow label='Cash Balance' value={formatUsd(cashBalance)} />
        <SummaryRow label='Crypto Holdings' value={formatUsd(cryptoValueUsd)} />
        <SummaryRow
          label='Margin Used'
          value={formatUsd(usedMargin)}
          valueClassName='text-amber-500'
        />
        <div className='border-t border-border pt-3'>
          <SummaryRow
            label='Total Equity'
            value={formatUsd(totalEquity)}
            valueClassName='font-display text-lg font-semibold'
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Margin Overview Card ───────────────────────────────

function MarginOverviewCard({
  usedMargin,
  freeMargin,
  marginLevel,
}: {
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
}) {
  const isInfinite = !isFinite(marginLevel);
  const levelLabel = isInfinite
    ? '\u221E'
    : `${marginLevel < 100 ? '< ' : ''}${marginLevel.toFixed(0)}%`;

  const levelState: 'safe' | 'warning' | 'danger' =
    isInfinite
      ? 'safe'
      : marginLevel <= 100
        ? 'danger'
        : marginLevel <= 150
          ? 'warning'
          : 'safe';

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          Margin Overview
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <SummaryRow label='Used Margin' value={formatUsd(usedMargin)} />
        <SummaryRow label='Free Margin' value={formatUsd(freeMargin)} />
        <div className='border-t border-border pt-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>Margin Level</span>
            <div className='flex items-center gap-2'>
              <span
                className={cn(
                  'font-mono text-sm font-medium tabular-nums',
                  levelState === 'safe' && 'text-positive',
                  levelState === 'warning' && 'text-amber-500',
                  levelState === 'danger' && 'text-negative',
                )}
              >
                {levelLabel}
              </span>
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  levelState === 'safe' && 'bg-positive',
                  levelState === 'warning' && 'bg-amber-500',
                  levelState === 'danger' && 'bg-negative',
                )}
              />
              <span className={cn('text-[11px] font-medium', levelState === 'safe' ? 'text-positive' : levelState === 'warning' ? 'text-amber-500' : 'text-negative')}>
                {levelState === 'safe' ? 'Safe' : levelState === 'warning' ? 'Warning' : 'Danger'}
              </span>
            </div>
          </div>
        </div>

        {levelState === 'danger' && (
          <p className='text-xs text-negative'>
            Below liquidation level! Act immediately!
          </p>
        )}
        {levelState === 'warning' && (
          <p className='text-xs text-amber-500'>
            Margin call approaching — consider adding collateral or closing positions.
          </p>
        )}
        {levelState === 'safe' && !isInfinite && (            <p className='text-xs text-positive'>Healthy margin level.</p>
        )}
        {isInfinite && (            <p className='text-xs text-muted-foreground'>No open margin positions.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Daily PnL Card ──────────────────────────────────────

function DailyPnlCard({
  dailyPnl,
  overallPnl,
  totalEquity,
  startingBalance,
}: {
  dailyPnl: number;
  overallPnl: number;
  totalEquity: number;
  startingBalance: number;
}) {
  const pnlPercent = totalEquity === 0 ? 0 : (dailyPnl / totalEquity) * 100;
  const overallPnlPercent =
    startingBalance === 0 ? 0 : (overallPnl / startingBalance) * 100;

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          P&amp;L Summary
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Daily PnL */}
        <div>
          <p className='mb-1 text-xs text-muted-foreground'>Today (24h)</p>
          <div className='flex items-baseline gap-2'>
            <span
              className={cn(
                'font-display text-2xl font-semibold tabular-nums',
                dailyPnl >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {formatUsd(dailyPnl, { signed: true })}
            </span>
            <Badge
              variant='outline'
              className={cn(
                'text-xs',
                dailyPnl >= 0
                  ? 'border-positive/30 text-positive'
                  : 'border-negative/30 text-negative',
              )}
            >
              {formatPercent(pnlPercent, { signed: true })}
            </Badge>
          </div>
        </div>

        {/* Overall PnL */}
        <div className='border-t border-border pt-3'>
          <p className='mb-1 text-xs text-muted-foreground'>Overall</p>
          <div className='flex items-baseline gap-2'>
            <span
              className={cn(
                'font-display text-2xl font-semibold tabular-nums',
                overallPnl >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {formatUsd(overallPnl, { signed: true })}
            </span>
            <Badge
              variant='outline'
              className={cn(
                'text-xs',
                overallPnl >= 0
                  ? 'border-positive/30 text-positive'
                  : 'border-negative/30 text-negative',
              )}
            >
              {formatPercent(overallPnlPercent, { signed: true })}
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className='grid grid-cols-2 gap-3 border-t border-border pt-3'>
          <div>
            <p className='text-xs text-muted-foreground'>Starting Balance</p>
            <p className='font-mono text-sm tabular-nums text-foreground'>
              {formatUsd(startingBalance)}
            </p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Current Equity</p>
            <p className='font-mono text-sm tabular-nums text-foreground'>
              {formatUsd(totalEquity)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Open Positions Card ────────────────────────────────

type PositionRow = Awaited<ReturnType<typeof listOpenPositions>>[number];
type TradeRow = Awaited<ReturnType<typeof getRecentTrades>>[number];

function OpenPositionsCard({
  positions,
}: {
  positions: PositionRow[];
}) {
  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            Open Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-10'>
            <Layers className='mb-3 h-10 w-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground mb-3'>No open positions</p>
            <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
              <CandlestickChart className='h-3.5 w-3.5' />
              Open a Trade
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted'>
          Open Positions ({positions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead>
              <tr className='border-b border-border text-xs text-muted-foreground'>
                <th className='px-4 py-2 font-medium'>Pair</th>
                <th className='px-4 py-2 font-medium'>Side</th>
                <th className='px-4 py-2 font-medium'>Size</th>
                <th className='px-4 py-2 font-medium'>Entry</th>
                <th className='px-4 py-2 font-medium'>Mark</th>
                <th className='px-4 py-2 font-medium'>PnL</th>
                <th className='px-4 py-2 font-medium'>ROE</th>
                <th className='px-4 py-2 font-medium'>Liq.</th>
              </tr>
            </thead>
            <tbody>
              {positions.slice(0, 5).map((p) => (
                <tr
                  key={p.id}
                  className='border-b border-border/50 transition-colors hover:bg-panel-raised/50'
                >
                  <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>
                    {p.assetSymbol}
                  </td>
                  <td className='px-4 py-2.5'>
                    <SideBadge side={p.side} />
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>
                    {formatNumber(p.size)}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>
                    {formatUsd(p.entryPrice)}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>
                    {formatUsd(p.markPrice)}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5'>
                    <PnLDisplay value={p.unrealizedPnl} formatted={formatUsd(p.unrealizedPnl, { signed: true })} />
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5'>
                    <PercentChange value={p.roe} formatted={formatPercent(p.roe, { signed: true })} />
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-muted-foreground'>
                    {formatUsd(p.liquidationPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recent Trades Card ─────────────────────────────────

function RecentJournalCard({
  entries,
}: {
  entries: Awaited<ReturnType<typeof listJournalEntries>>;
}) {
  const emotionIcons: Record<string, { icon: React.ElementType; color: string }> = {
    calm: { icon: Brain, color: 'text-blue-400' },
    confident: { icon: Heart, color: 'text-emerald-400' },
    excited: { icon: Zap, color: 'text-yellow-400' },
    cautious: { icon: Brain, color: 'text-purple-400' },
    stressed: { icon: Frown, color: 'text-orange-400' },
    frustrated: { icon: AlertTriangle, color: 'text-red-400' },
    fearful: { icon: Smile, color: 'text-gray-400' },
    greedy: { icon: Smile, color: 'text-pink-400' },
    neutral: { icon: Brain, color: 'text-muted-foreground' },
  };

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          <BookOpen className='h-3.5 w-3.5' />
          Recent Journal Entries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-6'>
            <BookOpen className='mb-2 h-8 w-8 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground mb-3'>No journal entries yet</p>
            <Link href='/journal' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
              <BookOpen className='h-3.5 w-3.5' />
              Start Journaling
            </Link>
          </div>
        ) : (
          <div className='divide-y divide-border/50'>
            {entries.map((entry) => {
              const emotion = entry.emotionalState ? emotionIcons[entry.emotionalState] : null;
              const EmotionIcon = emotion?.icon;
              return (
                <div key={entry.id} className='flex items-start gap-3 py-2.5 first:pt-0 last:pb-0'>
                  {/* Date column */}
                  <div className='shrink-0 text-center'>
                    <p className='text-[11px] font-medium text-foreground'>
                      {format(new Date(entry.createdAt), 'MMM d')}
                    </p>
                    <p className='text-[11px] text-muted-foreground'>
                      {format(new Date(entry.createdAt), 'HH:mm')}
                    </p>
                  </div>

                  {/* Content */}
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5 mb-0.5'>
                      {entry.assetSymbol && (
                        <span className='rounded bg-muted/40 px-1 py-0 font-mono text-[11px] text-muted-foreground'>
                          {entry.assetSymbol}
                        </span>
                      )}
                      {EmotionIcon && emotion && (
                        <EmotionIcon className={cn('h-3 w-3', emotion.color)} />
                      )}
                      {entry.tags.length > 0 && (
                        <span className='text-[11px] text-muted-foreground'>
                          {entry.tags.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                    <p className='text-xs text-foreground/80 leading-relaxed line-clamp-2'>
                      {entry.notes}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link
          href='/journal'
          className='mt-3 flex items-center justify-center gap-1.5 border-t border-border pt-3 text-[11px] text-accent hover:underline transition-colors'
        >
          <BookOpen className='h-3 w-3' />
          View all journal entries
        </Link>
      </CardContent>
    </Card>
  );
}

function RecentTradesCard({
  trades,
}: {
  trades: TradeRow[];
}) {
  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-10'>
            <CandlestickChart className='mb-3 h-10 w-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground mb-3'>No trades yet</p>
            <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
              <CandlestickChart className='h-3.5 w-3.5' />
              Start Trading
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted'>
          Recent Trades ({trades.length})
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead>
              <tr className='border-b border-border text-xs text-muted-foreground'>
                <th className='px-4 py-2 font-medium'>Time</th>
                <th className='px-4 py-2 font-medium'>Pair</th>
                <th className='px-4 py-2 font-medium'>Side</th>
                <th className='px-4 py-2 font-medium'>Type</th>
                <th className='px-4 py-2 font-medium'>Price</th>
                <th className='px-4 py-2 font-medium'>Qty</th>
                <th className='px-4 py-2 font-medium'>Fee</th>
                <th className='px-4 py-2 font-medium'>PnL</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={t.id}
                  className='border-b border-border/50 transition-colors hover:bg-panel-raised/50'
                >
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>
                    {format(new Date(t.executedAt), 'HH:mm:ss')}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>
                    {t.assetSymbol}
                  </td>
                  <td className='px-4 py-2.5'>
                    <SideBadge side={t.side} />
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground'>
                    {t.orderType.replace(/_/g, ' ')}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>
                    {formatUsd(t.price)}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>
                    {formatNumber(t.quantity)}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-muted-foreground'>
                    {formatUsd(t.fee)}
                  </td>
                  <td className='whitespace-nowrap px-4 py-2.5'>
                    <PnLDisplay value={t.pnl} formatted={formatUsd(t.pnl, { signed: true })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
