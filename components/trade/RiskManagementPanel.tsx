/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { memo, useState, useMemo, useEffect, useRef } from 'react';
import { cn, formatUsd, formatNumber, formatPercent } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Target,
  Percent,
  GanttChart,
  Zap,
} from 'lucide-react';
import {
  convertSimpleTriggerToPrice,
  simpleTriggerTypeLabel,
  type SimpleTriggerType,
} from '@/lib/engine/triggerConversion';

// ─── Tab definitions ─────────────────────────────────────

type TpSlMode = 'PRICE' | 'SIMPLE' | 'ADVANCED';

const MODE_TABS: { id: TpSlMode; label: string; icon: React.ReactNode }[] = [
  { id: 'PRICE', label: 'Price', icon: <DollarSign className='h-3 w-3' /> },
  { id: 'SIMPLE', label: 'Simple', icon: <Zap className='h-3 w-3' /> },
  {
    id: 'ADVANCED',
    label: 'Advanced',
    icon: <GanttChart className='h-3 w-3' />,
  },
];

interface RiskManagementPanelProps {
  /** Current quantity in base asset (e.g. BTC). */
  quantity: string;
  /** Current entry price (limit price for limit orders, or estimated market price). */
  entryPrice: string;
  /** Selected asset symbol (e.g. BTC/USD). */
  assetSymbol: string;
  /** Market type — only shown for MARGIN. */
  marketType: 'SPOT' | 'MARGIN';
  /** Leverage for margin trades. */
  leverage: number;
  /** Account equity for position size calculation (optional). */
  accountEquity?: number;
  /** Whether the panel starts expanded. Defaults to false. */
  expanded?: boolean;
  /** Position side for calculating trigger direction. */
  positionSide?: 'LONG' | 'SHORT';

  // ── Price mode props ──
  stopLossPrice?: string;
  takeProfitPrice?: string;
  onStopLossPriceChange?: (v: string) => void;
  onTakeProfitPriceChange?: (v: string) => void;

  // ── Trailing stop props ──
  trailingStopEnabled?: boolean;
  onTrailingStopEnabledChange?: (v: boolean) => void;
  trailingOffsetType?: 'PERCENT' | 'FIXED';
  onTrailingOffsetTypeChange?: (v: 'PERCENT' | 'FIXED') => void;
  trailingOffsetValue?: string;
  onTrailingOffsetValueChange?: (v: string) => void;
  trailingLimitOffset?: string;
  onTrailingLimitOffsetChange?: (v: string) => void;

  // ── TP/SL mode state ──
  tpSlMode?: TpSlMode;
  onTpSlModeChange?: (v: TpSlMode) => void;
  simpleTpType?: SimpleTriggerType;
  onSimpleTpTypeChange?: (v: SimpleTriggerType) => void;
  simpleTpValue?: string;
  onSimpleTpValueChange?: (v: string) => void;
  simpleSlType?: SimpleTriggerType;
  onSimpleSlTypeChange?: (v: SimpleTriggerType) => void;
  simpleSlValue?: string;
  onSimpleSlValueChange?: (v: string) => void;

  // ── Advanced mode state ──
  advField1?: 'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT';
  onAdvField1Change?: (
    v: 'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT',
  ) => void;
  advField2Type?: 'DISTANCE' | 'PNL';
  onAdvField2TypeChange?: (v: 'DISTANCE' | 'PNL') => void;
  advField2Value?: string;
  onAdvField2ValueChange?: (v: string) => void;
  advField3?:
    | 'STOP_LOSS_DISTANCE'
    | 'STOP_LOSS_PNL'
    | 'STOP_LOSS_LIMIT_DISTANCE'
    | 'STOP_LOSS_LIMIT_PNL'
    | 'TRAILING_STOP'
    | 'TRAILING_STOP_LIMIT';
  onAdvField3Change?: (
    v:
      | 'STOP_LOSS_DISTANCE'
      | 'STOP_LOSS_PNL'
      | 'STOP_LOSS_LIMIT_DISTANCE'
      | 'STOP_LOSS_LIMIT_PNL'
      | 'TRAILING_STOP'
      | 'TRAILING_STOP_LIMIT',
  ) => void;
  advField3Value?: string;
  onAdvField3ValueChange?: (v: string) => void;
  advField3Extra?: string;
  onAdvField3ExtraChange?: (v: string) => void;
}

// ─── Shared sub-components ───────────────────────────────

function NumericInput({
  value,
  onChange,
  placeholder,
  focusBorder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  focusBorder: string;
}) {
  return (
    <input
      type='number'
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      step='any'
      className={`w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 focus:${focusBorder}`}
    />
  );
}

function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'mb-1 block text-[11px] font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </label>
  );
}

// ─── Trigger type selector (segmented button) ────────────

const TRIGGER_TYPES: { id: SimpleTriggerType; label: string }[] = [
  { id: 'PERCENT', label: '%' },
  { id: 'PNL_USD', label: '$' },
  { id: 'PRICE', label: 'Price' },
];

function TriggerTypeSelector({
  value,
  onChange,
}: {
  value: SimpleTriggerType;
  onChange: (v: SimpleTriggerType) => void;
}) {
  return (
    <div className='flex gap-1'>
      {TRIGGER_TYPES.map(t => (
        <button
          key={t.id}
          type='button'
          onClick={() => onChange(t.id)}
          className={cn(
            'flex-1 rounded py-1 text-center text-[11px] font-medium transition-colors',
            'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
            value === t.id
              ? 'bg-accent text-accent-foreground'
              : 'bg-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Price mode content ──────────────────────────────────

function PriceModeContent({
  stopLossPrice,
  onStopLossPriceChange,
  takeProfitPrice,
  onTakeProfitPriceChange,
  trailingStopEnabled,
  onTrailingStopEnabledChange,
  trailingOffsetType,
  onTrailingOffsetTypeChange,
  trailingOffsetValue,
  onTrailingOffsetValueChange,
  trailingLimitOffset,
  onTrailingLimitOffsetChange,
}: {
  stopLossPrice: string;
  onStopLossPriceChange?: (v: string) => void;
  takeProfitPrice: string;
  onTakeProfitPriceChange?: (v: string) => void;
  trailingStopEnabled: boolean;
  onTrailingStopEnabledChange?: (v: boolean) => void;
  trailingOffsetType: 'PERCENT' | 'FIXED';
  onTrailingOffsetTypeChange?: (v: 'PERCENT' | 'FIXED') => void;
  trailingOffsetValue: string;
  onTrailingOffsetValueChange?: (v: string) => void;
  trailingLimitOffset: string;
  onTrailingLimitOffsetChange?: (v: string) => void;
}) {
  return (
    <>
      {/* Stop Loss / Take Profit inputs */}
      <div className='grid grid-cols-2 gap-2'>
        <div>
          <FieldLabel>Stop Loss Price</FieldLabel>
          <NumericInput
            value={stopLossPrice}
            onChange={v => onStopLossPriceChange?.(v)}
            placeholder='0.00'
            focusBorder='border-negative/50'
          />
        </div>
        <div>
          <FieldLabel>Take Profit Price</FieldLabel>
          <NumericInput
            value={takeProfitPrice}
            onChange={v => onTakeProfitPriceChange?.(v)}
            placeholder='0.00'
            focusBorder='border-positive/50'
          />
        </div>
      </div>

      {/* Trailing Stop Section */}
      <div className='border-t border-border' />
      <div>
        <div className='mb-1.5 flex items-center justify-between'>
          <label className='text-[11px] font-medium text-muted-foreground'>
            Trailing Stop
          </label>
          <button
            type='button'
            onClick={() => onTrailingStopEnabledChange?.(!trailingStopEnabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
              'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
              trailingStopEnabled ? 'bg-purple-500' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                trailingStopEnabled
                  ? 'translate-x-[18px]'
                  : 'translate-x-[2px]',
              )}
            />
          </button>
        </div>

        {trailingStopEnabled && (
          <div className='space-y-2 rounded-md border border-border/50 bg-background p-2'>
            <div>
              <FieldLabel>Offset Type</FieldLabel>
              <div className='flex gap-2'>
                {(['PERCENT', 'FIXED'] as const).map(type => (
                  <button
                    key={type}
                    type='button'
                    onClick={() => onTrailingOffsetTypeChange?.(type)}
                    className={cn(
                      'flex-1 rounded py-1 text-center text-[11px] font-medium transition-colors',
                      'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                      trailingOffsetType === type
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {type === 'PERCENT' ? '%' : 'Fixed'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>
                Offset {trailingOffsetType === 'PERCENT' ? '(%)' : '(USD)'}
              </FieldLabel>
              <NumericInput
                value={trailingOffsetValue}
                onChange={v => onTrailingOffsetValueChange?.(v)}
                placeholder={
                  trailingOffsetType === 'PERCENT' ? '2.0' : '500.00'
                }
                focusBorder='border-purple-500/50'
              />
            </div>
            <div>
              <div className='mb-1 flex items-center justify-between'>
                <FieldLabel>Limit Offset (optional)</FieldLabel>
                <span className='text-[10px] text-muted-foreground'>
                  → Trailing Stop Limit
                </span>
              </div>
              <NumericInput
                value={trailingLimitOffset}
                onChange={v => onTrailingLimitOffsetChange?.(v)}
                placeholder='0.00'
                focusBorder='border-purple-500/50'
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Simple mode content ─────────────────────────────────

function SimpleModeContent({
  entryPrice,
  quantity,
  positionSide,
  simpleTpType,
  onSimpleTpTypeChange,
  simpleTpValue,
  onSimpleTpValueChange,
  simpleSlType,
  onSimpleSlTypeChange,
  simpleSlValue,
  onSimpleSlValueChange,
  /* ── Trailing stop ── */
  trailingStopEnabled,
  onTrailingStopEnabledChange,
  trailingOffsetType,
  onTrailingOffsetTypeChange,
  trailingOffsetValue,
  onTrailingOffsetValueChange,
  trailingLimitOffset,
  onTrailingLimitOffsetChange,
}: {
  entryPrice: number;
  quantity: number;
  positionSide?: 'LONG' | 'SHORT';
  simpleTpType: SimpleTriggerType;
  onSimpleTpTypeChange?: (v: SimpleTriggerType) => void;
  simpleTpValue: string;
  onSimpleTpValueChange?: (v: string) => void;
  simpleSlType: SimpleTriggerType;
  onSimpleSlTypeChange?: (v: SimpleTriggerType) => void;
  simpleSlValue: string;
  onSimpleSlValueChange?: (v: string) => void;
  /* ── Trailing stop ── */
  trailingStopEnabled: boolean;
  onTrailingStopEnabledChange?: (v: boolean) => void;
  trailingOffsetType: 'PERCENT' | 'FIXED';
  onTrailingOffsetTypeChange?: (v: 'PERCENT' | 'FIXED') => void;
  trailingOffsetValue: string;
  onTrailingOffsetValueChange?: (v: string) => void;
  trailingLimitOffset: string;
  onTrailingLimitOffsetChange?: (v: string) => void;
}) {
  const posSide = positionSide || 'LONG';
  const tpVal = parseFloat(simpleTpValue) || 0;
  const slVal = parseFloat(simpleSlValue) || 0;

  // Compute equivalent trigger prices for display
  const tpPrice = useMemo(
    () =>
      convertSimpleTriggerToPrice(
        simpleTpType,
        tpVal,
        entryPrice,
        quantity,
        posSide,
        true,
      ),
    [simpleTpType, tpVal, entryPrice, quantity, posSide],
  );
  const slPrice = useMemo(
    () =>
      convertSimpleTriggerToPrice(
        simpleSlType,
        slVal,
        entryPrice,
        quantity,
        posSide,
        false,
      ),
    [simpleSlType, slVal, entryPrice, quantity, posSide],
  );

  return (
    <>
      {/* Take Profit */}
      <div className='rounded-md border border-border/50 p-2'>
        <div className='mb-1.5 flex items-center gap-1.5'>
          <TrendingUp className='h-3.5 w-3.5 text-positive' />
          <span className='text-[11px] font-semibold uppercase tracking-wider text-positive'>
            Take Profit
          </span>
        </div>
        <div className='mb-1.5'>
          <FieldLabel>Trigger Type</FieldLabel>
          <TriggerTypeSelector
            value={simpleTpType}
            onChange={v => onSimpleTpTypeChange?.(v)}
          />
        </div>
        <div>
          <FieldLabel>
            Value{' '}
            {simpleTpType === 'PERCENT'
              ? '(%)'
              : simpleTpType === 'PNL_USD'
              ? '(USD)'
              : '(USD)'}
          </FieldLabel>
          <NumericInput
            value={simpleTpValue}
            onChange={v => onSimpleTpValueChange?.(v)}
            placeholder={simpleTpType === 'PERCENT' ? '5.0' : '5000.00'}
            focusBorder='border-positive/50'
          />
        </div>
        {tpPrice > 0 && (
          <p className='mt-1 text-[10px] text-muted-foreground'>
            → Trigger at{' '}
            <span className='font-mono tabular-nums text-positive'>
              {formatUsd(tpPrice)}
            </span>
          </p>
        )}
      </div>

      {/* Stop Loss */}
      <div className='rounded-md border border-border/50 p-2'>
        <div className='mb-1.5 flex items-center gap-1.5'>
          <AlertTriangle className='h-3.5 w-3.5 text-negative' />
          <span className='text-[11px] font-semibold uppercase tracking-wider text-negative'>
            Stop Loss
          </span>
        </div>
        <div className='mb-1.5'>
          <FieldLabel>Trigger Type</FieldLabel>
          <TriggerTypeSelector
            value={simpleSlType}
            onChange={v => onSimpleSlTypeChange?.(v)}
          />
        </div>
        <div>
          <FieldLabel>
            Value{' '}
            {simpleSlType === 'PERCENT'
              ? '(%)'
              : simpleSlType === 'PNL_USD'
              ? '(USD)'
              : '(USD)'}
          </FieldLabel>
          <NumericInput
            value={simpleSlValue}
            onChange={v => onSimpleSlValueChange?.(v)}
            placeholder={simpleSlType === 'PERCENT' ? '2.0' : '2000.00'}
            focusBorder='border-negative/50'
          />
        </div>
        {slPrice > 0 && (
          <p className='mt-1 text-[10px] text-muted-foreground'>
            → Trigger at{' '}
            <span className='font-mono tabular-nums text-negative'>
              {formatUsd(slPrice)}
            </span>
          </p>
        )}
      </div>

      {/* Trailing Stop */}
      <div className='border-t border-border' />
      <div>
        <div className='mb-1.5 flex items-center justify-between'>
          <label className='text-[11px] font-medium text-muted-foreground'>
            Trailing Stop
          </label>
          <button
            type='button'
            onClick={() => onTrailingStopEnabledChange?.(!trailingStopEnabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
              'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
              trailingStopEnabled ? 'bg-purple-500' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                trailingStopEnabled
                  ? 'translate-x-[18px]'
                  : 'translate-x-[2px]',
              )}
            />
          </button>
        </div>

        {trailingStopEnabled && (
          <div className='space-y-2 rounded-md border border-border/50 bg-background p-2'>
            <div>
              <FieldLabel>Offset Type</FieldLabel>
              <div className='flex gap-2'>
                {(['PERCENT', 'FIXED'] as const).map(type => (
                  <button
                    key={type}
                    type='button'
                    onClick={() => onTrailingOffsetTypeChange?.(type)}
                    className={cn(
                      'flex-1 rounded py-1 text-center text-[11px] font-medium transition-colors',
                      'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                      trailingOffsetType === type
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {type === 'PERCENT' ? '%' : 'Fixed'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>
                Offset {trailingOffsetType === 'PERCENT' ? '(%)' : '(USD)'}
              </FieldLabel>
              <NumericInput
                value={trailingOffsetValue}
                onChange={v => onTrailingOffsetValueChange?.(v)}
                placeholder={
                  trailingOffsetType === 'PERCENT' ? '2.0' : '500.00'
                }
                focusBorder='border-purple-500/50'
              />
            </div>
            <div>
              <div className='mb-1 flex items-center justify-between'>
                <FieldLabel>Limit Offset (optional)</FieldLabel>
                <span className='text-[10px] text-muted-foreground'>
                  → Trailing Stop Limit
                </span>
              </div>
              <NumericInput
                value={trailingLimitOffset}
                onChange={v => onTrailingLimitOffsetChange?.(v)}
                placeholder='0.00'
                focusBorder='border-purple-500/50'
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Advanced mode content ───────────────────────────────

function SegmentedSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className='flex gap-1'>
      {options.map(o => (
        <button
          key={o.value}
          type='button'
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded py-1 text-center text-[11px] font-medium transition-colors',
            'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
            value === o.value
              ? 'bg-accent text-accent-foreground'
              : 'bg-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AdvancedModeContent({
  entryPrice,
  quantity,
  positionSide,
  advField1,
  onAdvField1Change,
  advField2Type,
  onAdvField2TypeChange,
  advField2Value,
  onAdvField2ValueChange,
  advField3,
  onAdvField3Change,
  advField3Value,
  onAdvField3ValueChange,
  advField3Extra,
  onAdvField3ExtraChange,
}: {
  entryPrice: number;
  quantity: number;
  positionSide?: 'LONG' | 'SHORT';
  advField1: 'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT';
  onAdvField1Change?: (
    v: 'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT',
  ) => void;
  advField2Type: 'DISTANCE' | 'PNL';
  onAdvField2TypeChange?: (v: 'DISTANCE' | 'PNL') => void;
  advField2Value: string;
  onAdvField2ValueChange?: (v: string) => void;
  advField3:
    | 'STOP_LOSS_DISTANCE'
    | 'STOP_LOSS_PNL'
    | 'STOP_LOSS_LIMIT_DISTANCE'
    | 'STOP_LOSS_LIMIT_PNL'
    | 'TRAILING_STOP'
    | 'TRAILING_STOP_LIMIT';
  onAdvField3Change?: (
    v:
      | 'STOP_LOSS_DISTANCE'
      | 'STOP_LOSS_PNL'
      | 'STOP_LOSS_LIMIT_DISTANCE'
      | 'STOP_LOSS_LIMIT_PNL'
      | 'TRAILING_STOP'
      | 'TRAILING_STOP_LIMIT',
  ) => void;
  advField3Value: string;
  onAdvField3ValueChange?: (v: string) => void;
  advField3Extra: string;
  onAdvField3ExtraChange?: (v: string) => void;
}) {
  const posSide = positionSide || 'LONG';
  const isLong = posSide === 'LONG';

  return (
    <div className='space-y-3'>
      {/* ── Field 1: Profit-Taking ── */}
      <div className='rounded-md border border-border/50 p-2'>
        <div className='mb-1.5 flex items-center gap-1.5'>
          <span className='flex h-4 w-4 items-center justify-center rounded-full bg-positive/20 text-[9px] font-bold text-positive'>
            1
          </span>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-positive'>
            Profit-Taking
          </span>
        </div>
        <SegmentedSelect
          value={advField1}
          onChange={v => onAdvField1Change?.(v)}
          options={[
            { value: 'PROFIT_TAKING', label: 'Profit-Taking' },
            { value: 'PROFIT_TAKING_LIMIT', label: 'Price Limits' },
            { value: 'LIMIT', label: 'Limit' },
          ]}
        />

        {advField1 !== 'LIMIT' && (
          <div className='mt-2 space-y-2'>
            {/* Field 2: Trigger Mechanism */}
            <div>
              <FieldLabel className='mt-1'>Trigger</FieldLabel>
              <SegmentedSelect
                value={advField2Type}
                onChange={v => onAdvField2TypeChange?.(v)}
                options={[
                  { value: 'DISTANCE', label: 'Distance' },
                  { value: 'PNL', label: 'P&L' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>
                {advField2Type === 'DISTANCE'
                  ? 'Distance from Entry'
                  : 'Target P&L (USD)'}
              </FieldLabel>
              <div className='relative'>
                <input
                  type='number'
                  value={advField2Value}
                  onChange={e => onAdvField2ValueChange?.(e.target.value)}
                  placeholder={
                    advField2Type === 'DISTANCE'
                      ? '1000 (or 5% for percent)'
                      : '5000'
                  }
                  step='any'
                  className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-positive/50'
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Field 3: Stop-Loss ── */}
      <div className='rounded-md border border-border/50 p-2'>
        <div className='mb-1.5 flex items-center gap-1.5'>
          <span className='flex h-4 w-4 items-center justify-center rounded-full bg-negative/20 text-[9px] font-bold text-negative'>
            3
          </span>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-negative'>
            Stop-Loss
          </span>
        </div>
        <SegmentedSelect
          value={advField3}
          onChange={v => onAdvField3Change?.(v)}
          options={[
            { value: 'STOP_LOSS_DISTANCE', label: 'SL (Dist)' },
            { value: 'STOP_LOSS_PNL', label: 'SL (P&L)' },
            { value: 'STOP_LOSS_LIMIT_DISTANCE', label: 'SL Lim (Dist)' },
            { value: 'STOP_LOSS_LIMIT_PNL', label: 'SL Lim (P&L)' },
            { value: 'TRAILING_STOP', label: 'Trail' },
            { value: 'TRAILING_STOP_LIMIT', label: 'Trail Lim' },
          ]}
        />

        <div className='mt-2 space-y-2'>
          <div>
            <FieldLabel>
              {advField3 === 'TRAILING_STOP' ||
              advField3 === 'TRAILING_STOP_LIMIT'
                ? 'Offset (5 for %, 1000 for fixed)'
                : advField3.includes('PNL')
                ? 'Max Loss (USD)'
                : 'Distance from Entry (or %)'}
            </FieldLabel>
            <input
              type='number'
              value={advField3Value}
              onChange={e => onAdvField3ValueChange?.(e.target.value)}
              placeholder={
                advField3 === 'TRAILING_STOP' ||
                advField3 === 'TRAILING_STOP_LIMIT'
                  ? '2.0'
                  : advField3.includes('PNL')
                  ? '2000'
                  : '1000'
              }
              step='any'
              className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-negative/50'
            />
          </div>

          {/* Extra param for limit variants */}
          {(advField3 === 'STOP_LOSS_LIMIT_DISTANCE' ||
            advField3 === 'STOP_LOSS_LIMIT_PNL' ||
            advField3 === 'TRAILING_STOP_LIMIT') && (
            <div>
              <FieldLabel>
                {advField3 === 'TRAILING_STOP_LIMIT'
                  ? 'Limit Offset'
                  : 'Limit Buffer'}
              </FieldLabel>
              <input
                type='number'
                value={advField3Extra}
                onChange={e => onAdvField3ExtraChange?.(e.target.value)}
                placeholder='Optional: limits the price'
                step='any'
                className='w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-negative/50'
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Account Risk & Suggested Size (shared across modes) ──

function AccountRiskSection({
  riskPercent,
  setRiskPercent,
  qty,
  entry,
  stopLoss,
  marketType,
  leverage,
  assetSymbol,
}: {
  riskPercent: number;
  setRiskPercent: (v: number) => void;
  qty: number;
  entry: number;
  stopLoss: number;
  marketType: 'SPOT' | 'MARGIN';
  leverage: number;
  assetSymbol: string;
}) {
  const suggestedSize = useMemo(() => {
    if (!entry || !stopLoss || riskPercent <= 0) return 0;
    const riskAmountBudget = 10000 * (riskPercent / 100);
    const priceDistance = Math.abs(entry - stopLoss);
    if (priceDistance === 0) return 0;
    return riskAmountBudget / priceDistance;
  }, [riskPercent, entry, stopLoss]);

  if (!suggestedSize) return null;

  const suggestedNotional = suggestedSize * entry;
  const suggestedMargin =
    marketType === 'MARGIN' ? suggestedNotional / leverage : 0;

  return (
    <>
      <div className='border-t border-border' />
      <div className='rounded-md bg-accent/20 p-2'>
        <p className='mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground'>
          <DollarSign className='h-3 w-3' />
          Suggested Size ({riskPercent}% risk)
        </p>
        <div className='space-y-0.5'>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] text-muted-foreground'>Position</span>
            <span className='font-mono text-[11px] tabular-nums text-foreground'>
              {formatNumber(suggestedSize)} {assetSymbol.split('/')[0]}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] text-muted-foreground'>Notional</span>
            <span className='font-mono text-[11px] tabular-nums text-foreground'>
              {formatUsd(suggestedNotional)}
            </span>
          </div>
          {marketType === 'MARGIN' && (
            <div className='flex items-center justify-between'>
              <span className='text-[11px] text-muted-foreground'>Margin</span>
              <span className='font-mono text-[11px] tabular-nums text-foreground'>
                {formatUsd(suggestedMargin)}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main component ──────────────────────────────────────

export const RiskManagementPanel = memo(function RiskManagementPanel({
  quantity,
  entryPrice,
  assetSymbol,
  marketType,
  leverage,
  accountEquity = 10000,
  expanded: expandedProp = false,
  // Price mode
  stopLossPrice: stopLossPriceProp = '',
  takeProfitPrice: takeProfitPriceProp = '',
  onStopLossPriceChange,
  onTakeProfitPriceChange,
  // Trailing stop
  trailingStopEnabled = false,
  onTrailingStopEnabledChange,
  trailingOffsetType = 'PERCENT',
  onTrailingOffsetTypeChange,
  trailingOffsetValue: trailingOffsetValueProp = '',
  onTrailingOffsetValueChange,
  trailingLimitOffset: trailingLimitOffsetProp = '',
  onTrailingLimitOffsetChange,
  positionSide,
  // TP/SL mode
  tpSlMode = 'PRICE',
  onTpSlModeChange,
  simpleTpType = 'PRICE',
  onSimpleTpTypeChange,
  simpleTpValue = '',
  onSimpleTpValueChange,
  simpleSlType = 'PRICE',
  onSimpleSlTypeChange,
  simpleSlValue = '',
  onSimpleSlValueChange,
  // Advanced mode
  advField1 = 'PROFIT_TAKING',
  onAdvField1Change,
  advField2Type = 'DISTANCE',
  onAdvField2TypeChange,
  advField2Value = '',
  onAdvField2ValueChange,
  advField3 = 'STOP_LOSS_DISTANCE',
  onAdvField3Change,
  advField3Value = '',
  onAdvField3ValueChange,
  advField3Extra = '',
  onAdvField3ExtraChange,
}: RiskManagementPanelProps) {
  const [isExpanded, setIsExpanded] = useState(expandedProp);
  const prevExpandedProp = useRef(expandedProp);

  useEffect(() => {
    if (expandedProp && !prevExpandedProp.current) {
      setIsExpanded(true);
    }
    prevExpandedProp.current = expandedProp;
  }, [expandedProp]);

  const [riskPercent, setRiskPercent] = useState(1);

  const qty = parseFloat(quantity) || 0;
  const entry = parseFloat(entryPrice) || 0;

  // Compute effective stop loss / take profit prices from Simple mode for risk calc
  const simpleTpVal = parseFloat(simpleTpValue) || 0;
  const simpleSlVal = parseFloat(simpleSlValue) || 0;
  const effectiveTpPrice = useMemo(
    () =>
      tpSlMode === 'SIMPLE'
        ? convertSimpleTriggerToPrice(
            simpleTpType,
            simpleTpVal,
            entry,
            qty,
            positionSide || 'LONG',
            true,
          )
        : parseFloat(takeProfitPriceProp) || 0,
    [
      tpSlMode,
      simpleTpType,
      simpleTpVal,
      entry,
      qty,
      positionSide,
      takeProfitPriceProp,
    ],
  );
  const effectiveSlPrice = useMemo(
    () =>
      tpSlMode === 'SIMPLE'
        ? convertSimpleTriggerToPrice(
            simpleSlType,
            simpleSlVal,
            entry,
            qty,
            positionSide || 'LONG',
            false,
          )
        : parseFloat(stopLossPriceProp) || 0,
    [
      tpSlMode,
      simpleSlType,
      simpleSlVal,
      entry,
      qty,
      positionSide,
      stopLossPriceProp,
    ],
  );

  const stopLoss = effectiveSlPrice;
  const takeProfit = effectiveTpPrice;

  const riskAmount = useMemo(() => {
    if (!qty || !entry || !stopLoss) return 0;
    return Math.abs(entry - stopLoss) * qty;
  }, [qty, entry, stopLoss]);

  const rewardAmount = useMemo(() => {
    if (!qty || !entry || !takeProfit) return 0;
    return Math.abs(takeProfit - entry) * qty;
  }, [qty, entry, takeProfit]);

  const riskRewardRatio = useMemo(() => {
    if (riskAmount === 0) return 0;
    return rewardAmount / riskAmount;
  }, [riskAmount, rewardAmount]);

  const notional = qty * entry;
  const riskPercentOfNotional =
    notional === 0 ? 0 : (riskAmount / notional) * 100;

  const hasValidLoss = riskAmount > 0;
  const hasValidReward = rewardAmount > 0;
  const isGoodRatio = riskRewardRatio >= 2;

  return (
    <Card className='mb-3 overflow-hidden border-border/60'>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className='flex w-full items-center justify-between px-2.5 py-2 text-left transition-colors hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
      >
        <div className='flex items-center gap-1.5'>
          <Target className='h-3.5 w-3.5 text-muted-foreground' />
          <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            Risk Management
          </span>
          {(hasValidLoss || hasValidReward) && (
            <span
              className={cn(
                'inline-flex h-4 items-center rounded-full px-1.5 text-[11px] font-medium',
                isGoodRatio
                  ? 'bg-positive/10 text-positive'
                  : 'bg-amber-500/10 text-amber-500',
              )}
            >
              {riskRewardRatio > 0 ? `1:${riskRewardRatio.toFixed(1)}` : '—'}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className='h-3.5 w-3.5 text-muted-foreground' />
        ) : (
          <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
        )}
      </button>

      {isExpanded && (
        <CardContent className='space-y-3 p-2.5 pt-1'>
          {/* Mode tabs */}
          <div className='flex gap-1 rounded-md bg-accent/20 p-0.5'>
            {MODE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTpSlModeChange?.(tab.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                  'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                  tpSlMode === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tpSlMode === 'PRICE' && (
            <PriceModeContent
              stopLossPrice={stopLossPriceProp}
              onStopLossPriceChange={onStopLossPriceChange}
              takeProfitPrice={takeProfitPriceProp}
              onTakeProfitPriceChange={onTakeProfitPriceChange}
              trailingStopEnabled={trailingStopEnabled}
              onTrailingStopEnabledChange={onTrailingStopEnabledChange}
              trailingOffsetType={trailingOffsetType}
              onTrailingOffsetTypeChange={onTrailingOffsetTypeChange}
              trailingOffsetValue={trailingOffsetValueProp}
              onTrailingOffsetValueChange={onTrailingOffsetValueChange}
              trailingLimitOffset={trailingLimitOffsetProp}
              onTrailingLimitOffsetChange={onTrailingLimitOffsetChange}
            />
          )}

          {tpSlMode === 'SIMPLE' && (
            <SimpleModeContent
              entryPrice={entry}
              quantity={qty}
              positionSide={positionSide}
              simpleTpType={simpleTpType}
              onSimpleTpTypeChange={onSimpleTpTypeChange}
              simpleTpValue={simpleTpValue}
              onSimpleTpValueChange={onSimpleTpValueChange}
              simpleSlType={simpleSlType}
              onSimpleSlTypeChange={onSimpleSlTypeChange}
              simpleSlValue={simpleSlValue}
              onSimpleSlValueChange={onSimpleSlValueChange}
              trailingStopEnabled={trailingStopEnabled}
              onTrailingStopEnabledChange={onTrailingStopEnabledChange}
              trailingOffsetType={trailingOffsetType}
              onTrailingOffsetTypeChange={onTrailingOffsetTypeChange}
              trailingOffsetValue={trailingOffsetValueProp}
              onTrailingOffsetValueChange={onTrailingOffsetValueChange}
              trailingLimitOffset={trailingLimitOffsetProp}
              onTrailingLimitOffsetChange={onTrailingLimitOffsetChange}
            />
          )}

          {tpSlMode === 'ADVANCED' && (
            <AdvancedModeContent
              entryPrice={entry}
              quantity={qty}
              positionSide={positionSide}
              advField1={advField1}
              onAdvField1Change={onAdvField1Change}
              advField2Type={advField2Type}
              onAdvField2TypeChange={onAdvField2TypeChange}
              advField2Value={advField2Value}
              onAdvField2ValueChange={onAdvField2ValueChange}
              advField3={advField3}
              onAdvField3Change={onAdvField3Change}
              advField3Value={advField3Value}
              onAdvField3ValueChange={onAdvField3ValueChange}
              advField3Extra={advField3Extra}
              onAdvField3ExtraChange={onAdvField3ExtraChange}
            />
          )}

          {/* Account Risk % presets */}
          <div>
            <FieldLabel>Account Risk %</FieldLabel>
            <div className='flex gap-1.5'>
              {[0.5, 1, 2, 5].map(pct => (
                <button
                  key={pct}
                  onClick={() => setRiskPercent(pct)}
                  className={cn(
                    'flex-1 rounded py-1 text-center text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                    riskPercent === pct
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className='border-t border-border' />

          {/* Risk/Reward grid */}
          <div className='grid grid-cols-2 gap-x-3 gap-y-1.5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1'>
                <AlertTriangle className='h-3 w-3 text-negative' />
                <span className='text-[11px] text-muted-foreground'>Risk</span>
              </div>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  hasValidLoss ? 'text-negative' : 'text-muted-foreground',
                )}
              >
                {hasValidLoss ? formatUsd(riskAmount) : '—'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1'>
                <TrendingUp className='h-3 w-3 text-positive' />
                <span className='text-[11px] text-muted-foreground'>
                  Reward
                </span>
              </div>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  hasValidReward ? 'text-positive' : 'text-muted-foreground',
                )}
              >
                {hasValidReward ? formatUsd(rewardAmount) : '—'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1'>
                <Target className='h-3 w-3 text-muted-foreground' />
                <span className='text-[11px] text-muted-foreground'>R:R</span>
              </div>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  riskRewardRatio > 0
                    ? isGoodRatio
                      ? 'text-positive'
                      : 'text-amber-500'
                    : 'text-muted-foreground',
                )}
              >
                {riskRewardRatio > 0 ? `1:${riskRewardRatio.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1'>
                <Percent className='h-3 w-3 text-muted-foreground' />
                <span className='text-[11px] text-muted-foreground'>
                  Risk %
                </span>
              </div>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  hasValidLoss ? 'text-negative' : 'text-muted-foreground',
                )}
              >
                {hasValidLoss
                  ? formatPercent(riskPercentOfNotional, { signed: false })
                  : '—'}
              </span>
            </div>
          </div>

          {/* Suggested position size */}
          {tpSlMode === 'PRICE' && (
            <AccountRiskSection
              riskPercent={riskPercent}
              setRiskPercent={setRiskPercent}
              qty={qty}
              entry={entry}
              stopLoss={stopLoss}
              marketType={marketType}
              leverage={leverage}
              assetSymbol={assetSymbol}
            />
          )}

          {tpSlMode === 'SIMPLE' && effectiveSlPrice > 0 && (
            <AccountRiskSection
              riskPercent={riskPercent}
              setRiskPercent={setRiskPercent}
              qty={qty}
              entry={entry}
              stopLoss={effectiveSlPrice}
              marketType={marketType}
              leverage={leverage}
              assetSymbol={assetSymbol}
            />
          )}

          {/* Warning for unfavorable ratio */}
          {hasValidLoss &&
            hasValidReward &&
            !isGoodRatio &&
            riskRewardRatio > 0 && (
              <p className='flex items-center gap-1 text-[11px] text-amber-500'>
                <AlertTriangle className='h-3 w-3' />
                Low risk/reward ratio. Consider a wider take profit or tighter
                stop loss.
              </p>
            )}
        </CardContent>
      )}
    </Card>
  );
});
