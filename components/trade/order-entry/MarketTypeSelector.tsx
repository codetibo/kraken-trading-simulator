'use client';

import { cn } from '@/lib/utils';
import {
  ALLOWED_LEVERAGE,
  ADVANCED_ORDER_TYPES,
  MarketType,
  ORDER_TYPES,
  PositionSide,
  TradingMode,
} from '@/lib/engine/types';
import { EducationTooltip } from '@/components/trade/EducationTooltip';
import { AlertTriangle } from 'lucide-react';

interface MarketTypeSelectorProps {
  marketType: MarketType;
  orderType: string;
  tradingMode: TradingMode;
  positionSide: PositionSide;
  leverage: number;
  onMarketTypeChange: (v: MarketType) => void;
  onTradingModeChange: (v: TradingMode) => void;
  onOrderTypeChange: (v: string) => void;
  onPositionSideChange: (v: PositionSide) => void;
  onLeverageChange: (v: number) => void;
}

const MODE_BUTTONS: { mode: TradingMode; label: string }[] = [
  { mode: 'MARKET', label: 'Market' },
  { mode: 'LIMIT', label: 'Limit' },
  { mode: 'ADVANCED', label: 'Advanced' },
];

export function MarketTypeSelector({
  marketType,
  orderType,
  tradingMode,
  positionSide,
  leverage,
  onMarketTypeChange,
  onTradingModeChange,
  onOrderTypeChange,
  onPositionSideChange,
  onLeverageChange,
}: MarketTypeSelectorProps) {
  return (
    <>
      {/* Spot/Margin Toggle */}
      <div className='mb-3 flex overflow-hidden rounded-md border border-border'>
        {(['SPOT', 'MARGIN'] as MarketType[]).map(m => (
          <button
            key={m}
            onClick={() => onMarketTypeChange(m)}
            className={cn(
              'flex-1 py-1.5 text-center text-xs font-medium transition-colors',
              'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
              marketType === m
                ? 'bg-accent text-accent-foreground'
                : 'bg-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'SPOT' ? 'Spot' : 'Margin'}
          </button>
        ))}
      </div>

      {/* Trading Mode: Market | Limit | Advanced */}
      <div className='mb-3'>
        <div className='mb-1 flex items-center gap-1'>
          <span className='text-[11px] font-medium text-muted-foreground'>Order Type</span>
          <EducationTooltip type={orderType} tradingMode={tradingMode} />
        </div>
        <div className='flex gap-1 rounded-md bg-accent/20 p-0.5'>
          {MODE_BUTTONS.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => onTradingModeChange(mode)}
              className={cn(
                'flex-1 rounded px-2 py-1 text-center text-xs font-medium transition-colors',
                'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                tradingMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced order type sub-selector */}
      {tradingMode === 'ADVANCED' && (
        <div className='mb-3'>
          <select
            value={orderType}
            onChange={e => {
              onOrderTypeChange(e.target.value);
            }}
            className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          >
            {ADVANCED_ORDER_TYPES.map(ot => {
              const config = ORDER_TYPES.find(o => o.id === ot);
              return (
                <option key={ot} value={ot}>
                  {config?.label ?? ot}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Margin: Long/Short + Leverage */}
      {marketType === 'MARGIN' && (
        <div className='mb-3 space-y-2'>
          <div className='flex gap-2'>
            {(['LONG', 'SHORT'] as PositionSide[]).map(ps => (
              <button
                key={ps}
                onClick={() => onPositionSideChange(ps)}
                className={cn(
                  'flex-1 rounded-md border py-1.5 text-center text-xs font-medium transition-colors',
                  'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                  positionSide === ps
                    ? ps === 'LONG'
                      ? 'border-positive/30 bg-positive/20 text-positive'
                      : 'border-negative/30 bg-negative/20 text-negative'
                    : 'border-border/50 bg-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {ps}
              </button>
            ))}
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='text-[11px] text-muted-foreground'>Leverage:</span>
            {ALLOWED_LEVERAGE.map(lev => (
              <button
                key={lev}
                onClick={() => onLeverageChange(lev)}
                className={cn(
                  'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                  'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                  leverage === lev
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={`Leverage ${lev}x (${ALLOWED_LEVERAGE.indexOf(lev) + 1})`}
              >
                {lev}x
              </button>
            ))}
          </div>
          {/* Liquidation distance warning */}
          {(() => {
            const liqDistPct = (1 / leverage - 0.006) * 100;
            const severity = liqDistPct <= 10 ? 'critical' : liqDistPct <= 20 ? 'warning' : 'info';
            return (
              <div
                className={cn(
                  'flex items-start gap-1.5 rounded-md px-2 py-1.5',
                  severity === 'critical'
                    ? 'bg-negative/10 text-negative'
                    : severity === 'warning'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-muted/30 text-muted-foreground',
                )}
              >
                <AlertTriangle
                  className={cn(
                    'mt-0.5 h-3 w-3 shrink-0',
                    severity === 'critical' ? 'text-negative' : severity === 'warning' ? 'text-amber-500' : 'text-muted-foreground',
                  )}
                />
                <div className='text-[11px] leading-snug'>
                  {severity === 'critical' ? (
                    <>
                      <strong>High risk:</strong> Liquidation only <strong>{liqDistPct.toFixed(1)}%</strong> away from entry for {positionSide} positions.
                    </>
                  ) : (
                    <>Liquidation is <strong>{liqDistPct.toFixed(1)}%</strong> away from entry.</>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}
