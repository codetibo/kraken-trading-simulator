/**
 * Color-blind safe display components and helpers.
 *
 * These ensure that information is never conveyed by color alone
 * (WCAG 2.1 SC 1.4.1). Every positive/negative indicator includes
 * a text label, icon, or symbol in addition to color.
 */
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

// ─── Icons for positive / negative / neutral values ─────

export function PositiveArrow({ className }: { className?: string }) {
  return <ArrowUp className={cn('inline-block shrink-0', className)} aria-hidden='true' />;
}

export function NegativeArrow({ className }: { className?: string }) {
  return <ArrowDown className={cn('inline-block shrink-0', className)} aria-hidden='true' />;
}

// ─── Side badges ────────────────────────────────────────

interface SideBadgeProps {
  side: string;
  positionSide?: string;
  className?: string;
}

export function SideBadge({ side, positionSide, className }: SideBadgeProps) {
  const isBuy = side === 'BUY';
  const isLong = positionSide === 'LONG' || side === 'LONG';
  const icon = isBuy || isLong ? '▲' : '▼';

  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium',
        isBuy || isLong
          ? 'border-positive/30 text-positive'
          : 'border-negative/30 text-negative',
        className,
      )}
      aria-label={`${side}${positionSide ? ` ${positionSide}` : ''}`}
    >
      <span aria-hidden='true' className='mr-0.5 text-[11px]'>{icon}</span>
      {side}{positionSide ? `/${positionSide}` : ''}
    </span>
  );
}

// ─── PnL displays ──────────────────────────────────────

interface PnLDisplayProps {
  value: number;
  formatted: string;
  className?: string;
}

export function PnLDisplay({ value, formatted, className }: PnLDisplayProps) {
  const isPos = value > 0;
  const isNeg = value < 0;
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        isPos ? 'text-positive' : isNeg ? 'text-negative' : 'text-muted-foreground',
        className,
      )}
      aria-label={`${isPos ? 'Positive' : isNeg ? 'Negative' : 'Zero'} ${formatted}`}
    >
      {isPos ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : isNeg ? <NegativeArrow className='mr-0.5 inline h-3 w-3' /> : null}
      {formatted}
    </span>
  );
}

// ─── ROE / Percent displays ────────────────────────────

interface PercentChangeProps {
  value: number;
  formatted: string;
  className?: string;
}

export function PercentChange({ value, formatted, className }: PercentChangeProps) {
  const isPos = value > 0;
  const isNeg = value < 0;
  return (
    <span
      className={cn(
        'tabular-nums',
        isPos ? 'text-positive' : isNeg ? 'text-negative' : 'text-muted-foreground',
        className,
      )}
      aria-label={`${isPos ? 'Up' : isNeg ? 'Down' : 'No change'} ${formatted}`}
    >
      {isPos ? <PositiveArrow className='mr-0.5 inline h-3 w-3' /> : isNeg ? <NegativeArrow className='mr-0.5 inline h-3 w-3' /> : null}
      {formatted}
    </span>
  );
}

// ─── Liquidation risk label ─────────────────────────────

interface RiskLabelProps {
  state: 'safe' | 'warning' | 'danger';
  distance?: number | null;
  className?: string;
}

export function RiskLabel({ state, distance, className }: RiskLabelProps) {
  const config = {
    safe: { icon: '●', label: 'Safe', dotClass: 'bg-positive', textClass: 'text-positive' },
    warning: { icon: '◐', label: 'Warning', dotClass: 'bg-amber-500', textClass: 'text-amber-500' },
    danger: { icon: '○', label: 'Danger', dotClass: 'bg-negative', textClass: 'text-negative' },
  }[state];

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      role='status'
      aria-label={`${config.label}${distance != null ? ` — ${distance.toFixed(1)} percent from liquidation` : ''}`}
    >
      <span className={cn('inline-block h-2 w-2 rounded-full', config.dotClass)} aria-hidden='true' />
      <span className={cn('text-[11px] font-medium', config.textClass)}>{config.label}</span>
      {distance != null && (
        <span className={cn('font-mono text-[11px] tabular-nums', config.textClass)}>
          {distance.toFixed(1)}%
        </span>
      )}
    </span>
  );
}
