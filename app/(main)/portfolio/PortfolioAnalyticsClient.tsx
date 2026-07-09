'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn, formatUsd, formatPercent } from '@/lib/utils';
import { PositiveArrow, NegativeArrow } from '@/lib/color-blind';
import {
  TrendingUp,
  TrendingDown,
  Gauge,
  Activity,
  DollarSign,
  BarChart3,
  PieChart,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { PortfolioAnalytics } from '@/lib/engine/portfolioAnalytics';

function MetricCard({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  valueClassName?: string;
}) {
  return (
    <div className='rounded-lg border border-border/50 bg-muted/20 p-3'>
      <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
        <Icon className='h-3 w-3' />
        <span>{label}</span>
      </div>
      <p className={cn('mt-1 font-mono text-sm tabular-nums', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className='rounded-md border border-border bg-popover px-3 py-2 shadow-md text-xs'>
      <p className='mb-1 font-medium text-foreground'>{label}</p>
      <p
        className={cn(
          'font-mono tabular-nums',
          payload[0].value >= 0 ? 'text-positive' : 'text-negative',
        )}
      >
        {payload[0].value >= 0 ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : <NegativeArrow className='mr-0.5 inline h-3 w-3' />}
        {formatUsd(payload[0].value, { signed: true })}
      </p>
    </div>
  );
}

export function PortfolioAnalyticsClient() {
  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/portfolio/analytics', {
          cache: 'no-store',
        });
        const result = await res.json();
        if (result.success) {
          setData(result.analytics);
        } else {
          setError(result.error || 'Failed to load analytics');
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-12'>
          <Loader2 className='h-6 w-6 animate-spin text-accent' />
          <span className='ml-2 text-sm text-muted-foreground'>
            Computing analytics...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center gap-2 py-12'>
          <AlertTriangle className='h-5 w-5 text-amber-500' />
          <p className='text-sm text-muted-foreground'>
            {error || 'Analytics unavailable'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const m = data.metrics;
  const hasTrades = m.totalTrades > 0;

  return (
    <div className='space-y-4' aria-busy='false'>
      {/* Section Header */}
      <div className='flex items-center gap-2'>
        <BarChart3 className='h-5 w-5 text-accent' />
        <h2 className='font-display text-base font-semibold tracking-tight text-foreground'>
          Performance Analytics
        </h2>
      </div>

      {/* Performance Metrics Grid */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'>
        <MetricCard
          label='Sharpe Ratio'
          value={m.sharpeRatio.toFixed(2)}
          icon={Activity}
          valueClassName={
            m.sharpeRatio >= 1
              ? 'text-positive'
              : m.sharpeRatio >= 0
                ? 'text-amber-500'
                : 'text-negative'
          }
        />
        <MetricCard
          label='Sortino Ratio'
          value={m.sortinoRatio.toFixed(2)}
          icon={Activity}
          valueClassName={
            m.sortinoRatio >= 1
              ? 'text-positive'
              : m.sortinoRatio >= 0
                ? 'text-amber-500'
                : 'text-negative'
          }
        />
        <MetricCard
          label='Max Drawdown'
          value={formatPercent(m.maxDrawdownPercent)}
          icon={TrendingDown}
          valueClassName={
            m.maxDrawdownPercent < 10
              ? 'text-positive'
              : m.maxDrawdownPercent < 25
                ? 'text-amber-500'
                : 'text-negative'
          }
        />
        <MetricCard
          label='Win Rate'
          value={formatPercent(m.winRate)}
          icon={TrendingUp}
          valueClassName={
            m.winRate >= 60 ? 'text-positive' : m.winRate >= 40 ? 'text-amber-500' : 'text-negative'
          }
        />
        <MetricCard
          label='Avg R:R'
          value={m.averageRR.toFixed(2)}
          icon={Gauge}
          valueClassName={
            m.averageRR >= 2
              ? 'text-positive'
              : m.averageRR >= 1
                ? 'text-amber-500'
                : 'text-negative'
          }
        />
        <MetricCard
          label='Profit Factor'
          value={m.profitFactor != null && isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : '∞'}
          icon={DollarSign}
          valueClassName={
            m.profitFactor != null && m.profitFactor >= 1.5
              ? 'text-positive'
              : m.profitFactor != null && m.profitFactor >= 1
                ? 'text-amber-500'
                : m.profitFactor != null
                  ? 'text-negative'
                  : 'text-positive'
          }
        />
      </div>

      {/* Win/Loss + Total PnL */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              Trade Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-1.5'>
                <span className='inline-block h-2 w-2 rounded-full bg-positive' />
                <span className='text-xs text-muted-foreground'>
                  {m.winningTrades} W
                </span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='inline-block h-2 w-2 rounded-full bg-negative' />
                <span className='text-xs text-muted-foreground'>
                  {m.losingTrades} L
                </span>
              </div>
              <span className='text-xs text-muted-foreground'>
                {m.totalTrades} total
              </span>
            </div>
            {/* Win bar */}
            {m.totalTrades > 0 && (
              <div className='mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted-foreground/20'>
                <div
                  className='h-full rounded-l-full bg-positive transition-all'
                  style={{ width: `${m.winRate}%` }}
                />
                <div
                  className='h-full rounded-r-full bg-negative transition-all'
                  style={{ width: `${100 - m.winRate}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              Avg Win / Loss
            </CardTitle>
          </CardHeader>
          <CardContent className='flex items-center gap-3'>
            <div className='rounded-md bg-positive/5 px-3 py-1.5'>
              <p className='text-[11px] text-positive/70'>Win</p>
              <p className='font-mono text-sm tabular-nums text-positive'>
                {formatUsd(m.averageWin, { signed: true })}
              </p>
            </div>
            <div className='rounded-md bg-negative/5 px-3 py-1.5'>
              <p className='text-[11px] text-negative/70'>Loss</p>
              <p className='font-mono text-sm tabular-nums text-negative'>
                {formatUsd(m.averageLoss, { signed: true })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline gap-2'>
              <span
                className={cn(
                  'font-display text-xl font-semibold tabular-nums',
                  m.totalPnl >= 0 ? 'text-positive' : 'text-negative',
                )}
              >
                {m.totalPnl >= 0 ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : <NegativeArrow className='mr-0.5 inline h-3 w-3' />}
                {formatUsd(m.totalPnl, { signed: true })}
              </span>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  m.totalPnl >= 0 ? 'text-positive' : 'text-negative',
                )}
              >
                across {m.totalTrades} trades
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly PnL Chart */}
      {data.monthlyPnL.length > 0 && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              Monthly P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-48 w-full md:h-56'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={data.monthlyPnL} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray='2 2'
                    stroke='hsl(var(--border))'
                    strokeOpacity={0.3}
                    vertical={false}
                  />
                  <XAxis
                    dataKey='month'
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      const parts = v.split('-');
                      return `${parts[0].slice(2)}/${parts[1]}`;
                    }}
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)
                    }
                    width={40}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'hsl(var(--muted-foreground))', fillOpacity: 0.1 }}
                  />
                  <Bar
                    dataKey='pnl'
                    fill='hsl(var(--positive))'
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                    // Color each bar based on its value
                    shape={(props: { x: number; y: number; width: number; height: number; payload?: { pnl: number } }) => {
                      const isPos = (props.payload?.pnl ?? 0) >= 0;
                      return (
                        <rect
                          x={props.x}
                          y={isPos ? props.y : props.y - props.height}
                          width={props.width}
                          height={Math.abs(props.height)}
                          fill={isPos ? '#22c55e' : '#ef4444'}
                          fillOpacity={0.8}
                          rx={2}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly PnL + Distribution side by side */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {/* Weekly PnL */}
        {data.weeklyPnL.length > 0 && (
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                Weekly P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='h-40 w-full md:h-48'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={data.weeklyPnL} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid
                      strokeDasharray='2 2'
                      stroke='hsl(var(--border))'
                      strokeOpacity={0.3}
                      vertical={false}
                    />
                    <XAxis
                      dataKey='week'
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => v.replace('W', '')}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'hsl(var(--muted-foreground))', fillOpacity: 0.1 }}
                    />
                    <Bar
                      dataKey='pnl'
                      isAnimationActive={false}
                      shape={(props: { x: number; y: number; width: number; height: number; payload?: { pnl: number } }) => {
                        const isPos = (props.payload?.pnl ?? 0) >= 0;
                        return (
                          <rect
                            x={props.x}
                            y={isPos ? props.y : props.y - props.height}
                            width={props.width}
                            height={Math.abs(props.height)}
                            fill={isPos ? '#22c55e' : '#ef4444'}
                            fillOpacity={0.8}
                            rx={2}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PnL Distribution Histogram */}
        {data.pnlDistribution.length > 0 && (
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                P&L Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='h-40 w-full md:h-48'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={data.pnlDistribution}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray='2 2'
                      stroke='hsl(var(--border))'
                      strokeOpacity={0.3}
                      vertical={false}
                    />
                    <XAxis
                      dataKey='bucket'
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => {
                        const m = v.match(/[+-]\$?(\d+)/);
                        return m ? m[1] : '';
                      }}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={20}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className='rounded-md border border-border bg-popover px-3 py-2 shadow-md text-xs'>
                            <p className='mb-1 font-medium text-foreground'>{label}</p>
                            <p className='font-mono tabular-nums text-foreground'>
                              {payload[0].value} trades
                            </p>
                          </div>
                        );
                      }}
                      cursor={{ fill: 'hsl(var(--muted-foreground))', fillOpacity: 0.1 }}
                    />
                    <Bar
                      dataKey='count'
                      isAnimationActive={false}
                      shape={(props: { x: number; y: number; width: number; height: number; payload?: { min: number; max: number } }) => {
                        const p = props.payload ?? { min: 0, max: 0 };
                        const mid = (p.min + p.max) / 2;
                        return (
                          <rect
                            x={props.x}
                            y={props.y}
                            width={props.width}
                            height={props.height}
                            fill={mid >= 0 ? '#22c55e' : '#ef4444'}
                            fillOpacity={0.8}
                            rx={2}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty state */}
      {!hasTrades && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <PieChart className='mb-3 h-10 w-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground'>
              No trade history yet. Start trading on the Trade page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
