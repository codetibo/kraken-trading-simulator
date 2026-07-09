'use client';

import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Activity, Settings2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChartType, INDICATOR_COLORS, ALL_SYMBOLS } from '@/lib/chart-theme';
import { IndicatorId, INDICATOR_DEFAULTS } from '@/lib/indicators';
import { CANDLE_LIMITS } from '@/lib/trade-settings';

interface ChartToolbarProps {
  intervals: readonly string[];
  interval: string;
  chartType: ChartType;
  compareAsset: string;
  selectedAsset: string;
  activeIndicators: IndicatorId[];
  loading: boolean;
  isDesktop: boolean;
  candleLimit: number;
  onIntervalChange: (iv: string) => void;
  onChartTypeChange: (ct: ChartType) => void;
  onCompareAssetChange: (asset: string) => void;
  onIndicatorToggle: (id: IndicatorId) => void;
  onRemoveCompare: () => void;
  onCandleLimitChange: (limit: number) => void;
}

const CHART_TYPE_OPTIONS: { id: ChartType; label: string; icon: React.ElementType }[] = [
  { id: 'candlestick', label: 'Candles', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: TrendingUp },
  { id: 'area', label: 'Area', icon: Activity },
];

export function ChartToolbar({
  intervals,
  interval,
  chartType,
  compareAsset,
  selectedAsset,
  activeIndicators,
  loading,
  isDesktop,
  candleLimit,
  onIntervalChange,
  onChartTypeChange,
  onCompareAssetChange,
  onIndicatorToggle,
  onRemoveCompare,
  onCandleLimitChange,
}: ChartToolbarProps) {
  return (
    <div className='flex items-center gap-0.5 border-b border-border px-3 py-1.5'>
      {/* Time intervals */}
      {intervals.map(iv => (
        <button
          key={iv}
          onClick={() => onIntervalChange(iv)}
          className={cn(
            'rounded px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
            interval === iv
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {iv}
        </button>
      ))}

      {/* Candle count selector */}
      <span className='ml-1.5 text-[11px] text-muted-foreground'>Cdl</span>
      <select
        value={candleLimit}
        onChange={e => onCandleLimitChange(Number(e.target.value))}
        className='rounded border border-border bg-background px-1 py-0.5 text-[11px] text-muted-foreground outline-none focus:border-accent'
        aria-label='Visible candles'
        title='Visible candles'
      >
        {CANDLE_LIMITS.map(limit => (
          <option key={limit} value={limit}>
            {limit}
          </option>
        ))}
      </select>

      {/* Separator */}
      <div className='mx-1.5 h-4 w-px bg-border' />

      {/* Chart type toggle */}
      {CHART_TYPE_OPTIONS.map(ct => (
        <button
          key={ct.id}
          onClick={() => onChartTypeChange(ct.id)}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
            chartType === ct.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title={ct.label}
        >
          <ct.icon className='h-3 w-3' />
          {isDesktop && ct.label}
        </button>
      ))}

      <div className='ml-auto flex items-center gap-1.5'>
        {loading && (
          <span className='mr-1 text-[11px] text-muted-foreground'>
            {selectedAsset}
          </span>
        )}

        {/* Compare with dropdown (desktop only) */}
        {isDesktop && (
          <select
            value={compareAsset}
            onChange={e => onCompareAssetChange(e.target.value)}
            className='rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground outline-none focus:border-accent'
            aria-label='Compare with asset'
          >
            <option value=''>Compare</option>
            {ALL_SYMBOLS
              .filter(s => s !== selectedAsset)
              .map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
          </select>
        )}

        {/* Compare badge */}
        {compareAsset && (
          <button
            onClick={onRemoveCompare}
            className='flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20'
            title='Remove comparison'
          >
            {compareAsset}
            <span className='ml-0.5 text-indigo-400/60'>&times;</span>
          </button>
        )}

        {/* Indicator toggles — inline on desktop, popover on mobile/tablet */}
        <div className='ml-1 flex items-center gap-0.5'>
          {isDesktop ? (
            INDICATOR_DEFAULTS.map(ind => (
              <button
                key={ind.id}
                onClick={() => onIndicatorToggle(ind.id)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                  activeIndicators.includes(ind.id)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={`${ind.label} (${Object.values(ind.params).join(', ')})`}
              >
                {ind.label}
              </button>
            ))
          ) : (
            <Popover>
              <PopoverTrigger className='flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground'>
                <Settings2 className='h-3.5 w-3.5' />
              </PopoverTrigger>
              <PopoverContent align='end' className='w-40 p-2'>
                <div className='flex flex-col gap-1'>
                  <p className='px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                    Indicators
                  </p>
                  {INDICATOR_DEFAULTS.map(ind => (
                    <button
                      key={ind.id}
                      onClick={() => onIndicatorToggle(ind.id)}
                      className={cn(
                        'flex items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors',
                        activeIndicators.includes(ind.id)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span
                        className='h-2 w-2 shrink-0 rounded-full'
                        style={{ backgroundColor: INDICATOR_COLORS[ind.id] }}
                      />
                      {ind.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
