import { getPortfolioSummary, getHoldings, getEquityHistory } from '@/server/actions/portfolio';
import { listOpenPositions } from '@/server/actions/positions';
import { StoreProvider } from '@/components/StoreProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatUsd, formatPercent } from '@/lib/utils';
import { PositiveArrow, NegativeArrow } from '@/lib/color-blind';
import { EquityChart } from './EquityChart';
import { PortfolioAnalyticsClient } from './PortfolioAnalyticsClient';
import { HoldingsCard, MarginPositionsCard } from './PortfolioCards';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const [portfolio, holdings, positions, equityHistory] = await Promise.all([
    getPortfolioSummary(),
    getHoldings(),
    listOpenPositions(),
    getEquityHistory(),
  ]);

  const startingBalance = portfolio.totalEquity - portfolio.overallPnl;
  const dailyPnlPercent =
    portfolio.totalEquity === 0
      ? 0
      : (portfolio.dailyPnl / portfolio.totalEquity) * 100;
  const overallPnlPercent =
    startingBalance === 0
      ? 0
      : (portfolio.overallPnl / startingBalance) * 100;

  return (
    <StoreProvider enablePortfolioPolling>
      <div className='h-full overflow-y-auto p-4 pb-8 md:p-6'>
        <div className='mx-auto max-w-7xl space-y-4 md:space-y-6'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>
              Portfolio
            </h1>
            <div className='flex items-center gap-2'>
              <span className='relative flex h-2 w-2'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-positive' />
              </span>
              <span className='text-xs text-muted-foreground'>Live</span>
            </div>
          </div>

          {/* Top Row — Total Equity Hero + Quick Stats */}
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
            <Card className='lg:col-span-2'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  Total Equity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-baseline gap-3'>
                  <span className='font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums md:text-4xl'>
                    {formatUsd(portfolio.totalEquity)}
                  </span>
                  <Badge
                    variant='outline'
                    className={cn(
                      'text-xs',
                      portfolio.overallPnl >= 0
                        ? 'border-positive/30 text-positive'
                        : 'border-negative/30 text-negative',
                    )}
                  >
                    {formatPercent(overallPnlPercent, { signed: true })}
                  </Badge>
                </div>
                <p
                  className={cn(
                    'mt-1 font-mono text-sm tabular-nums',
                    portfolio.overallPnl >= 0 ? 'text-positive' : 'text-negative',
                  )}
                >
                  {portfolio.overallPnl >= 0 ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : <NegativeArrow className='mr-0.5 inline h-3 w-3' />}
                  {formatUsd(portfolio.overallPnl, { signed: true })} &mdash;{' '}
                  {formatUsd(startingBalance)} starting capital
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  Cash Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='font-display text-2xl font-semibold tabular-nums text-foreground'>
                  {formatUsd(portfolio.cashBalance)}
                </p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Free:{' '}
                  <span className='font-mono tabular-nums'>
                    {formatUsd(portfolio.freeMargin)}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  P&L Summary
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div>
                  <p className='text-xs text-muted-foreground'>Daily (24h)</p>
                  <div className='flex items-baseline gap-2'>
                    <span
                      className={cn(
                        'font-display text-lg font-semibold tabular-nums',
                        portfolio.dailyPnl >= 0 ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {portfolio.dailyPnl >= 0 ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : <NegativeArrow className='mr-0.5 inline h-3 w-3' />}
                      {formatUsd(portfolio.dailyPnl, { signed: true })}
                    </span>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        portfolio.dailyPnl >= 0 ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {portfolio.dailyPnl >= 0 ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : <NegativeArrow className='mr-0.5 inline h-3 w-3' />}
                      {formatPercent(dailyPnlPercent, { signed: true })}
                    </span>
                  </div>
                </div>
                <div className='border-t border-border pt-2'>
                  <p className='text-xs text-muted-foreground'>Overall</p>                    <span
                      className={cn(
                        'font-display text-lg font-semibold tabular-nums',
                        portfolio.overallPnl >= 0 ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {portfolio.overallPnl >= 0 ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : <NegativeArrow className='mr-0.5 inline h-3 w-3' />}
                      {formatUsd(portfolio.overallPnl, { signed: true })}
                    </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equity Chart */}
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                Equity Curve (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquityChart data={equityHistory} />
            </CardContent>
          </Card>

          {/* Portfolio Analytics */}
          <PortfolioAnalyticsClient />

          {/* Bottom Row — Holdings + Margin Positions */}
          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            <HoldingsCard holdings={holdings} />
            <MarginPositionsCard positions={positions} />
          </div>

          {/* Dashboard-style Portfolio Breakdown */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  Portfolio Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <SummaryRow label='Cash Balance' value={formatUsd(portfolio.cashBalance)} />
                <SummaryRow label='Crypto Holdings' value={formatUsd(portfolio.cryptoValueUsd)} />
                <SummaryRow
                  label='Margin Used'
                  value={formatUsd(portfolio.usedMargin)}
                  valueClassName='text-amber-500'
                />
                <div className='border-t border-border pt-3'>
                  <SummaryRow
                    label='Total Equity'
                    value={formatUsd(portfolio.totalEquity)}
                    valueClassName='font-display text-lg font-semibold'
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  Margin Overview
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <SummaryRow label='Used Margin' value={formatUsd(portfolio.usedMargin)} />
                <SummaryRow label='Free Margin' value={formatUsd(portfolio.freeMargin)} />
                <div className='border-t border-border pt-3'>
                  <MarginLevelRow marginLevel={portfolio.marginLevel} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  P&L Summary
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>                  <SummaryRow
                    label='Daily (24h)'
                    value={formatUsd(portfolio.dailyPnl, { signed: true })}
                    valueClassName={
                      portfolio.dailyPnl >= 0 ? 'text-positive' : 'text-negative'
                    }
                  />                  <SummaryRow
                    label='Daily %'
                    value={formatPercent(dailyPnlPercent, { signed: true })}
                    valueClassName={
                      portfolio.dailyPnl >= 0 ? 'text-positive' : 'text-negative'
                    }
                  />
                <div className='border-t border-border pt-3'>
                  <SummaryRow
                    label='Overall'
                    value={formatUsd(portfolio.overallPnl, { signed: true })}
                    valueClassName={
                      portfolio.overallPnl >= 0 ? 'text-positive' : 'text-negative'
                    }
                  />
                </div>                  <SummaryRow
                    label='Overall %'
                    value={formatPercent(overallPnlPercent, { signed: true })}
                    valueClassName={
                      portfolio.overallPnl >= 0 ? 'text-positive' : 'text-negative'
                    }
                  />
                <SummaryRow label='Starting Capital' value={formatUsd(startingBalance)} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StoreProvider>
  );
}

// ─── Helpers ────────────────────────────────────────────

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

function MarginLevelRow({ marginLevel }: { marginLevel: number }) {
  const isInfinite = !isFinite(marginLevel);
  const levelLabel = isInfinite
    ? '\u221E'
    : `${marginLevel < 100 ? '< ' : ''}${marginLevel.toFixed(0)}%`;

  const levelState: 'safe' | 'warning' | 'danger' = isInfinite
    ? 'safe'
    : marginLevel <= 100
      ? 'danger'
      : marginLevel <= 150
        ? 'warning'
        : 'safe';

  return (
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
  );
}
