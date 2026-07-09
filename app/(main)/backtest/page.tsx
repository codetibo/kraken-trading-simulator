'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatUsd, formatPercent, formatNumber } from '@/lib/utils';
import { PnLDisplay, PositiveArrow, NegativeArrow } from '@/lib/color-blind';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge,
  DollarSign,
  BarChart3,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import type { PerformanceReport, StrategyType } from '@/lib/engine/backtesting';

type StrategyForm = {
  symbol: string;
  interval: string;
  strategyType: StrategyType;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  rsiPeriod: number;
  oversoldThreshold: number;
  overboughtThreshold: number;
  initialCapital: number;
  positionSize: number;
  feeBps: number;
  slippage: number;
  ocoTakeProfit: number;
  ocoStopLoss: number;
};

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD'];
const INTERVALS = [
  { value: '1m', label: '1 min' },
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hours' },
  { value: '1D', label: '1 day' },
];

const DEFAULT_FORM: StrategyForm = {
  symbol: 'BTC/USD',
  interval: '1h',
  strategyType: 'sma_crossover',
  fastPeriod: 10,
  slowPeriod: 30,
  signalPeriod: 9,
  rsiPeriod: 14,
  oversoldThreshold: 30,
  overboughtThreshold: 70,
  initialCapital: 10000,
  positionSize: 0.5,
  feeBps: 26,
  slippage: 0.001,
  ocoTakeProfit: 0,
  ocoStopLoss: 0,
};

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

export default function BacktestPage() {
  const [form, setForm] = useState<StrategyForm>(DEFAULT_FORM);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PerformanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateForm = useCallback(
    <K extends keyof StrategyForm>(key: K, value: StrategyForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const strategyConfig =
        form.strategyType === 'sma_crossover'
          ? { type: 'sma_crossover' as const, fastPeriod: form.fastPeriod, slowPeriod: form.slowPeriod }
          : form.strategyType === 'rsi'
            ? {
                type: 'rsi' as const,
                period: form.rsiPeriod,
                oversoldThreshold: form.oversoldThreshold,
                overboughtThreshold: form.overboughtThreshold,
              }
            : {
                type: 'macd' as const,
                fastPeriod: form.fastPeriod,
                slowPeriod: form.slowPeriod,
                signalPeriod: form.signalPeriod,
              };

      const body: Record<string, unknown> = {
        symbol: form.symbol,
        interval: form.interval,
        strategy: strategyConfig,
        initialCapital: form.initialCapital,
        positionSize: form.positionSize,
        feeBps: form.feeBps,
        slippage: form.slippage,
      };

      // Include OCO config if both TP and SL are set
      if (form.ocoTakeProfit > 0 && form.ocoStopLoss > 0) {
        body.oco = {
          takeProfitPercent: form.ocoTakeProfit,
          stopLossPercent: form.ocoStopLoss,
        };
      }

      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.report);
      } else {
        setError(data.error || 'Backtest failed');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setRunning(false);
    }
  }, [form]);

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center gap-2'>
          <BarChart3 className='h-5 w-5 text-accent' />
          <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>
            Backtesting Engine
          </h1>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {/* ── Strategy Configuration ── */}
          <div className='space-y-4 md:col-span-1'>
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  <Gauge className='h-3.5 w-3.5' />
                  Strategy Config
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {/* Symbol */}
                <div>
                  <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                    Asset
                  </label>
                  <select
                    value={form.symbol}
                    onChange={(e) => updateForm('symbol', e.target.value)}
                    className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                  >
                    {SYMBOLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interval */}
                <div>
                  <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                    Candle Interval
                  </label>
                  <select
                    value={form.interval}
                    onChange={(e) => updateForm('interval', e.target.value)}
                    className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                  >
                    {INTERVALS.map((iv) => (
                      <option key={iv.value} value={iv.value}>
                        {iv.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Strategy Type */}
                <div>
                  <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                    Strategy
                  </label>
                  <select
                    value={form.strategyType}
                    onChange={(e) =>
                      updateForm('strategyType', e.target.value as StrategyType)
                    }
                    className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                  >
                    <option value='sma_crossover'>SMA Crossover</option>
                    <option value='rsi'>RSI</option>
                    <option value='macd'>MACD</option>
                  </select>
                </div>

                {/* Strategy-specific params */}
                {form.strategyType === 'sma_crossover' && (
                  <>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Fast SMA Period
                      </label>
                      <input
                        type='number'
                        value={form.fastPeriod}
                        onChange={(e) =>
                          updateForm('fastPeriod', parseInt(e.target.value) || 10)
                        }
                        min={2}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Slow SMA Period
                      </label>
                      <input
                        type='number'
                        value={form.slowPeriod}
                        onChange={(e) =>
                          updateForm('slowPeriod', parseInt(e.target.value) || 30)
                        }
                        min={5}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                  </>
                )}

                {form.strategyType === 'rsi' && (
                  <>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        RSI Period
                      </label>
                      <input
                        type='number'
                        value={form.rsiPeriod}
                        onChange={(e) =>
                          updateForm('rsiPeriod', parseInt(e.target.value) || 14)
                        }
                        min={2}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Oversold Threshold
                      </label>
                      <input
                        type='number'
                        value={form.oversoldThreshold}
                        onChange={(e) =>
                          updateForm(
                            'oversoldThreshold',
                            parseInt(e.target.value) || 30,
                          )
                        }
                        min={5}
                        max={50}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Overbought Threshold
                      </label>
                      <input
                        type='number'
                        value={form.overboughtThreshold}
                        onChange={(e) =>
                          updateForm(
                            'overboughtThreshold',
                            parseInt(e.target.value) || 70,
                          )
                        }
                        min={50}
                        max={95}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                  </>
                )}

                {form.strategyType === 'macd' && (
                  <>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Fast EMA Period
                      </label>
                      <input
                        type='number'
                        value={form.fastPeriod}
                        onChange={(e) =>
                          updateForm('fastPeriod', parseInt(e.target.value) || 12)
                        }
                        min={2}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Slow EMA Period
                      </label>
                      <input
                        type='number'
                        value={form.slowPeriod}
                        onChange={(e) =>
                          updateForm('slowPeriod', parseInt(e.target.value) || 26)
                        }
                        min={5}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Signal Period
                      </label>
                      <input
                        type='number'
                        value={form.signalPeriod}
                        onChange={(e) =>
                          updateForm('signalPeriod', parseInt(e.target.value) || 9)
                        }
                        min={2}
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                  </>
                )}

                {/* Capital & Position Sizing */}
                <div>
                  <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                    Initial Capital ($)
                  </label>
                  <input
                    type='number'
                    value={form.initialCapital}
                    onChange={(e) =>
                      updateForm('initialCapital', parseFloat(e.target.value) || 10000)
                    }
                    min={100}
                    step={1000}
                    className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                    Position Size ({Math.round(form.positionSize * 100)}%)
                  </label>
                  <input
                    type='range'
                    value={form.positionSize}
                    onChange={(e) =>
                      updateForm('positionSize', parseFloat(e.target.value))
                    }
                    min={0.05}
                    max={1}
                    step={0.05}
                    className='w-full accent-accent'
                  />
                  <div className='flex justify-between text-[11px] text-muted-foreground'>
                    <span>5%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Fee & Slippage */}
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                      Fee (bps)
                    </label>
                    <input
                      type='number'
                      value={form.feeBps}
                      onChange={(e) =>
                        updateForm('feeBps', parseInt(e.target.value) || 26)
                      }
                      min={0}
                      className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent'
                    />
                  </div>
                  <div>
                    <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                      Slippage
                    </label>
                    <input
                      type='number'
                      value={form.slippage}
                      onChange={(e) =>
                        updateForm('slippage', parseFloat(e.target.value) || 0.001)
                      }
                      min={0}
                      step={0.0005}
                      className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent'
                    />
                  </div>
                </div>

                {/* OCO Take-Profit / Stop-Loss */}
                <div className='rounded-md border border-border/40 p-2.5'>
                  <p className='mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                    OCO Exit Strategy (optional)
                  </p>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Take Profit (%)
                      </label>
                      <input
                        type='number'
                        value={form.ocoTakeProfit}
                        onChange={(e) =>
                          updateForm('ocoTakeProfit', parseFloat(e.target.value) || 0)
                        }
                        min={0}
                        max={100}
                        step={0.5}
                        placeholder='0 = off'
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
                        Stop Loss (%)
                      </label>
                      <input
                        type='number'
                        value={form.ocoStopLoss}
                        onChange={(e) =>
                          updateForm('ocoStopLoss', parseFloat(e.target.value) || 0)
                        }
                        min={0}
                        max={100}
                        step={0.5}
                        placeholder='0 = off'
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                  </div>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    Set both to 0 to disable OCO exits (signal-based only).
                  </p>
                </div>

                {/* Run Button */}
                <Button
                  onClick={handleRun}
                  disabled={running}
                  className='w-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold uppercase tracking-wider'
                >
                  {running ? (
                    <>
                      <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
                      Running...
                    </>
                  ) : (
                    <>
                      <BarChart3 className='mr-1 h-3.5 w-3.5' />
                      Run Backtest
                    </>
                  )}
                </Button>

                {error && (
                  <div className='flex items-center gap-1.5 rounded-md bg-negative/10 px-2.5 py-1.5 text-xs text-negative'>
                    <AlertTriangle className='h-3 w-3 shrink-0' />
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Results ── */}
          <div className='space-y-4 md:col-span-2'>
            {!result && !running && (
              <Card>
                <CardContent className='flex flex-col items-center justify-center py-16'>
                  <BarChart3 className='mb-3 h-10 w-10 text-muted-foreground/30' />
                  <p className='text-sm text-muted-foreground'>
                    Configure a strategy and click &ldquo;Run Backtest&rdquo; to see results.
                  </p>
                </CardContent>
              </Card>
            )}

            {running && (
              <Card>
                <CardContent className='flex flex-col items-center justify-center py-16'>
                  <Loader2 className='mb-3 h-8 w-8 animate-spin text-accent' />
                  <p className='text-sm text-muted-foreground'>
                    Running backtest on {form.symbol} ({form.interval})...
                  </p>
                </CardContent>
              </Card>
            )}

            {result && (
              <>
                {/* Summary Metrics */}
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>                    <MetricCard
                    label='Total Return'
                    value={`${result.totalReturn >= 0 ? '▲ ' : '▼ '}${formatUsd(result.totalReturn, { signed: true })}`}
                    icon={DollarSign}
                    valueClassName={
                      result.totalReturn >= 0 ? 'text-positive' : 'text-negative'
                    }
                  />                    <MetricCard
                    label='Return %'
                    value={`${result.totalReturnPercent >= 0 ? '▲ ' : '▼ '}${formatPercent(result.totalReturnPercent, { signed: true })}`}
                    icon={TrendingUp}
                    valueClassName={
                      result.totalReturnPercent >= 0
                        ? 'text-positive'
                        : 'text-negative'
                    }
                  />
                  <MetricCard
                    label='Total Trades'
                    value={String(result.totalTrades)}
                    icon={Activity}
                  />
                  <MetricCard
                    label='Win Rate'
                    value={formatPercent(result.winRate)}
                    icon={Check}
                    valueClassName={
                      result.winRate >= 50 ? 'text-positive' : 'text-amber-500'
                    }
                  />
                  <MetricCard
                    label='Max Drawdown'
                    value={formatPercent(result.maxDrawdownPercent)}
                    icon={TrendingDown}
                    valueClassName='text-negative'
                  />
                  <MetricCard
                    label='Profit Factor'
                    value={
                      isFinite(result.profitFactor)
                        ? result.profitFactor.toFixed(2)
                        : '∞'
                    }
                    icon={Gauge}
                    valueClassName={
                      result.profitFactor >= 1.5
                        ? 'text-positive'
                        : result.profitFactor >= 1
                          ? 'text-amber-500'
                          : 'text-negative'
                    }
                  />
                  <MetricCard
                    label='Sharpe Ratio'
                    value={result.sharpeRatio.toFixed(2)}
                    icon={Activity}
                    valueClassName={
                      result.sharpeRatio >= 1
                        ? 'text-positive'
                        : result.sharpeRatio >= 0
                          ? 'text-amber-500'
                          : 'text-negative'
                    }
                  />
                  <MetricCard
                    label='Total Fees'
                    value={formatUsd(result.totalFees)}
                    icon={DollarSign}
                  />
                </div>

                {/* Win/Loss Breakdown */}
                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                      Trade Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                      <div className='rounded-md bg-positive/5 px-3 py-2'>
                        <p className='text-[11px] text-positive/70'>Winning</p>
                        <p className='font-mono text-lg font-semibold tabular-nums text-positive'>
                          {result.winningTrades}
                        </p>
                      </div>
                      <div className='rounded-md bg-negative/5 px-3 py-2'>
                        <p className='text-[11px] text-negative/70'>Losing</p>
                        <p className='font-mono text-lg font-semibold tabular-nums text-negative'>
                          {result.losingTrades}
                        </p>
                      </div>
                      <div className='rounded-md bg-muted/20 px-3 py-2'>
                        <p className='text-[11px] text-muted-foreground'>Avg Win</p>
                        <p className='font-mono text-sm tabular-nums text-positive'>
                          {formatUsd(result.averageWin, { signed: true })}
                        </p>
                      </div>
                      <div className='rounded-md bg-muted/20 px-3 py-2'>
                        <p className='text-[11px] text-muted-foreground'>Avg Loss</p>
                        <p className='font-mono text-sm tabular-nums text-negative'>
                          {formatUsd(Math.abs(result.averageLoss), { signed: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Strategy Info */}
                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                      Strategy Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='flex flex-wrap gap-2'>
                      <Badge variant='outline' className='text-[11px]'>
                        {result.symbol}
                      </Badge>
                      <Badge variant='outline' className='text-[11px]'>
                        {result.strategy.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant='outline' className='text-[11px]'>
                        {result.interval}
                      </Badge>
                      <Badge variant='outline' className='text-[11px] text-muted-foreground'>
                        ${result.initialCapital.toLocaleString()} start
                      </Badge>
                      <Badge
                        variant='outline'
                        className={cn(
                          'text-[11px]',
                          result.totalReturn >= 0
                            ? 'border-positive/30 text-positive'
                            : 'border-negative/30 text-negative',
                        )}
                      >
                        {formatUsd(result.finalCapital)} final
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Trades Table */}
                {result.trades.length > 0 && (
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                        Trade Log ({result.trades.length} trades)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='p-0'>
                      <div className='max-h-64 overflow-y-auto'>
                        <table className='w-full text-left text-xs'>
                          <thead className='sticky top-0 bg-popover'>
                            <tr className='border-b border-border text-muted-foreground'>
                              <th className='px-3 py-1.5 font-medium'>#</th>
                              <th className='px-3 py-1.5 font-medium'>Side</th>
                              <th className='px-3 py-1.5 font-medium'>Entry</th>
                              <th className='px-3 py-1.5 font-medium'>Exit</th>
                              <th className='px-3 py-1.5 font-medium'>Qty</th>
                              <th className='px-3 py-1.5 font-medium'>PnL</th>
                              <th className='px-3 py-1.5 font-medium'>Return</th>
                              <th className='px-3 py-1.5 font-medium'>Bars</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.trades.map((t, i) => (
                              <tr
                                key={i}
                                className='border-b border-border/30 transition-colors hover:bg-muted/20'
                              >
                                <td className='px-3 py-1.5 text-muted-foreground'>
                                  {i + 1}
                                </td>
                                <td className='px-3 py-1.5'>
                                  <span
                                    className={cn(
                                      'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium',
                                      t.side === 'LONG'
                                        ? 'border-positive/30 text-positive'
                                        : 'border-negative/30 text-negative',
                                    )}
                                  >
                                    <span aria-hidden='true' className='mr-0.5'>{t.side === 'LONG' ? '▲' : '▼'}</span>
                                    {t.side}
                                  </span>
                                </td>
                                <td className='font-mono tabular-nums text-foreground'>
                                  {formatUsd(t.entryPrice)}
                                </td>
                                <td className='font-mono tabular-nums text-foreground'>
                                  {formatUsd(t.exitPrice)}
                                </td>
                                <td className='font-mono tabular-nums text-muted-foreground'>
                                  {formatNumber(t.quantity, { decimals: 4 })}
                                </td>
                                <td className='font-mono tabular-nums'>
                                  <PnLDisplay value={t.pnl} formatted={formatUsd(t.pnl, { signed: true })} />
                                </td>
                                <td
                                  className={cn(
                                    'font-mono tabular-nums',
                                    t.pnlPercent >= 0
                                      ? 'text-positive'
                                      : 'text-negative',
                                  )}
                                >
                                  {t.pnlPercent >= 0 ? <PositiveArrow className='mr-0.5 inline h-2.5 w-2.5' /> : <NegativeArrow className='mr-0.5 inline h-2.5 w-2.5' />}
                                  {formatPercent(t.pnlPercent, {
                                    signed: true,
                                    decimals: 2,
                                  })}
                                </td>
                                <td className='font-mono tabular-nums text-muted-foreground'>
                                  {t.holdingPeriod}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
