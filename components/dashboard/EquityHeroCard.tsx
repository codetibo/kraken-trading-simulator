import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatPercent, formatUsd } from '@/lib/utils';
import { PositiveArrow, NegativeArrow } from '@/lib/color-blind';

export function EquityHeroCard({
  totalEquity,
  overallPnl,
  startingBalance,
}: {
  totalEquity: number;
  overallPnl: number;
  startingBalance: number;
}) {
  const overallPnlPercent =
    startingBalance === 0 ? 0 : (overallPnl / startingBalance) * 100;
  const isPositive = overallPnl >= 0;

  return (
    <Card className='relative overflow-hidden'>
      <div className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl' />
      <CardContent className='relative py-6'>
        <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          Total Equity
        </p>
        <div className='mt-2 flex items-baseline gap-3'>
          <span className='font-display text-4xl font-semibold tracking-tight text-foreground tabular-nums'>
            {formatUsd(totalEquity)}
          </span>
          <Badge
            variant='outline'
            className={cn(
              'text-xs',
              isPositive
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
            isPositive ? 'text-positive' : 'text-negative',
          )}
        >
          {isPositive ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : <NegativeArrow className='mr-0.5 inline h-3 w-3' />}
          {formatUsd(overallPnl, { signed: true })} overall from {formatUsd(startingBalance)} starting capital
        </p>
      </CardContent>
    </Card>
  );
}

